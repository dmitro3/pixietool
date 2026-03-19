import { z } from "zod";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { organizations, orgMembers } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

const PRICE_TO_PLAN: Record<string, "creator" | "pro" | "agency" | "enterprise"> = {
  // Map Stripe price IDs to plan tiers — configured via env or Stripe dashboard
};

const PLAN_CONFIG: Record<string, { maxBrands: number }> = {
  free: { maxBrands: 1 },
  creator: { maxBrands: 1 },
  pro: { maxBrands: 3 },
  agency: { maxBrands: 10 },
  enterprise: { maxBrands: 100 },
};

async function getOrCreateStripeCustomer(
  stripe: Stripe,
  org: { id: string; name: string; stripeCustomerId: string | null },
  email: string,
  database: typeof import("@/server/db/client").db
): Promise<string> {
  if (org.stripeCustomerId) return org.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    name: org.name,
    metadata: { orgId: org.id },
  });

  await database
    .update(organizations)
    .set({ stripeCustomerId: customer.id })
    .where(eq(organizations.id, org.id));

  return customer.id;
}

export const billingRouter = createTRPCRouter({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    // Find the user's org
    const [membership] = await ctx.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, ctx.user.id))
      .limit(1);

    if (!membership) {
      return { plan: "free" as const, status: "active" as const, currentPeriodEnd: null };
    }

    const [org] = await ctx.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, membership.orgId))
      .limit(1);

    if (!org?.stripeSubscriptionId) {
      return { plan: org?.planTier ?? "free", status: "active" as const, cancelAt: null, cancelAtPeriodEnd: false };
    }

    // Fetch live subscription from Stripe
    try {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);

      return {
        plan: org.planTier,
        status: subscription.status,
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        startDate: new Date(subscription.start_date * 1000),
      };
    } catch {
      return { plan: org.planTier, status: "active" as const, cancelAt: null, cancelAtPeriodEnd: false };
    }
  }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ priceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      // Find user's org
      const [membership] = await ctx.db
        .select()
        .from(orgMembers)
        .where(eq(orgMembers.userId, ctx.user.id))
        .limit(1);

      if (!membership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No organization found" });
      }

      const [org] = await ctx.db
        .select()
        .from(organizations)
        .where(eq(organizations.id, membership.orgId))
        .limit(1);

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      const customerId = await getOrCreateStripeCustomer(
        stripe,
        org,
        ctx.user.email!,
        ctx.db
      );

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: `${appUrl}/settings?success=subscribed`,
        cancel_url: `${appUrl}/settings?cancelled=true`,
        metadata: { orgId: org.id },
      });

      return { url: session.url };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const [membership] = await ctx.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, ctx.user.id))
      .limit(1);

    if (!membership) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No organization found" });
    }

    const [org] = await ctx.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, membership.orgId))
      .limit(1);

    if (!org?.stripeCustomerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No billing account found. Subscribe to a plan first.",
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    return { url: session.url };
  }),
});
