import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { organizations, orgMembers, users } from "@/server/db/schema";
import { logger } from "@/server/lib/logger";
import { sendPaymentFailedEmail } from "@/server/services/email/client";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

const PRICE_TO_PLAN: Record<string, { tier: "creator" | "pro" | "agency" | "enterprise"; maxBrands: number }> = {
  // Populate with actual Stripe price IDs from dashboard:
  // "price_xxx_creator": { tier: "creator", maxBrands: 1 },
  // "price_xxx_pro": { tier: "pro", maxBrands: 3 },
  // "price_xxx_agency": { tier: "agency", maxBrands: 10 },
};

export async function POST(request: Request) {
  const stripe = getStripe();
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    logger.error("Stripe webhook signature verification failed", {
      error: String(error),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (orgId && subscriptionId) {
        // Fetch subscription to get the price → plan mapping
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const planConfig = priceId ? PRICE_TO_PLAN[priceId] : undefined;

        await db
          .update(organizations)
          .set({
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: session.customer as string,
            ...(planConfig
              ? { planTier: planConfig.tier, maxBrands: planConfig.maxBrands }
              : {}),
          })
          .where(eq(organizations.id, orgId));

        logger.info("Subscription activated", {
          orgId,
          subscriptionId,
          plan: planConfig?.tier ?? "unknown",
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      const planConfig = priceId ? PRICE_TO_PLAN[priceId] : undefined;

      // Find org by subscription ID
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.stripeSubscriptionId, subscription.id))
        .limit(1);

      if (org && planConfig) {
        await db
          .update(organizations)
          .set({
            planTier: planConfig.tier,
            maxBrands: planConfig.maxBrands,
          })
          .where(eq(organizations.id, org.id));

        logger.info("Subscription updated", {
          orgId: org.id,
          plan: planConfig.tier,
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      // Downgrade to free
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.stripeSubscriptionId, subscription.id))
        .limit(1);

      if (org) {
        await db
          .update(organizations)
          .set({
            planTier: "free",
            maxBrands: 1,
            stripeSubscriptionId: null,
          })
          .where(eq(organizations.id, org.id));

        logger.info("Subscription cancelled — downgraded to free", {
          orgId: org.id,
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

      logger.warn("Payment failed", { customerId, invoiceId: invoice.id });

      if (customerId) {
        // Find the org and owner to send notification
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.stripeCustomerId, customerId))
          .limit(1);

        if (org) {
          const [owner] = await db
            .select({ email: users.email, name: users.name })
            .from(orgMembers)
            .innerJoin(users, eq(users.id, orgMembers.userId))
            .where(eq(orgMembers.orgId, org.id))
            .limit(1);

          if (owner) {
            await sendPaymentFailedEmail(owner.email, owner.name);
          }
        }
      }
      break;
    }

    default:
      logger.debug("Unhandled Stripe event", { type: event.type });
  }

  return NextResponse.json({ received: true });
}
