import { inngest } from "../client";
import { db } from "@/server/db/client";
import {
  strategyPlaybooks,
  brands,
  orgMembers,
  users,
  contentItems,
  platformAccounts,
} from "@/server/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { sendWeeklyDigestEmail } from "@/server/services/email/client";

export const weeklyRecalibration = inngest.createFunction(
  {
    id: "weekly-recalibration",
    name: "Weekly Strategy Recalibration",
  },
  { cron: "0 9 * * 1" }, // Every Monday at 9am
  async ({ step }) => {
    // Step 1: Get all active brands
    const activeBrands = await step.run("get-active-brands", async () => {
      const allBrands = await db.select().from(brands);
      return allBrands;
    });

    // Step 2: Send weekly digest to each brand's org owner
    for (const brand of activeBrands) {
      await step.run(`weekly-digest-${brand.id}`, async () => {
        // Get org owner
        const [membership] = await db
          .select()
          .from(orgMembers)
          .where(
            and(
              eq(orgMembers.orgId, brand.orgId),
              eq(orgMembers.role, "owner")
            )
          )
          .limit(1);

        if (!membership) return;

        const [owner] = await db
          .select()
          .from(users)
          .where(eq(users.id, membership.userId))
          .limit(1);

        if (!owner) return;

        // Calculate weekly stats
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const publishedThisWeek = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(contentItems)
          .where(
            and(
              eq(contentItems.brandId, brand.id),
              eq(contentItems.status, "published"),
              gte(contentItems.publishedAt, oneWeekAgo)
            )
          );

        const pendingReview = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(contentItems)
          .where(
            and(
              eq(contentItems.brandId, brand.id),
              eq(contentItems.status, "pending_review")
            )
          );

        const accounts = await db
          .select()
          .from(platformAccounts)
          .where(eq(platformAccounts.brandId, brand.id));

        const totalFollowers = accounts.reduce(
          (sum, a) => sum + (a.followerCount ?? 0),
          0
        );

        await sendWeeklyDigestEmail(owner.email, owner.name, {
          postsPublished: publishedThisWeek[0]?.count ?? 0,
          totalImpressions: 0, // Would come from analytics
          engagementRate: "0.00",
          followerGrowth: 0,
          pendingReview: pendingReview[0]?.count ?? 0,
        });
      });
    }
  }
);
