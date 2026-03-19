import { db } from "@/server/db/client";
import {
  platformAccounts,
  contentItems,
  postAnalytics,
  accountAnalytics,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/server/lib/encryption";
import { LinkedInAdapter } from "@/server/services/platforms/linkedin";
import { logger } from "@/server/lib/logger";
import type { PlatformAdapter } from "@/server/services/platforms/types";

function getAdapter(platform: string): PlatformAdapter {
  switch (platform) {
    case "linkedin":
      return new LinkedInAdapter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export async function collectAccountAnalytics(platformAccountId: string) {
  const [account] = await db
    .select()
    .from(platformAccounts)
    .where(eq(platformAccounts.id, platformAccountId))
    .limit(1);

  if (!account) {
    logger.error("Platform account not found for analytics", {
      platformAccountId,
    });
    return;
  }

  const adapter = getAdapter(account.platform);
  const tokens = {
    accessToken: decrypt(account.accessToken),
    refreshToken: account.refreshToken
      ? decrypt(account.refreshToken)
      : undefined,
  };

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const analytics = await adapter.getAnalytics(tokens, {
      start: weekAgo,
      end: now,
    });

    const profile = await adapter.getProfile(tokens);

    // Store account-level analytics
    await db.insert(accountAnalytics).values({
      platformAccountId: account.id,
      date: now.toISOString().split("T")[0],
      followerCount: profile.followerCount,
      totalImpressions: analytics.impressions,
      avgEngagementRate: analytics.engagement,
      profileViews: 0,
    });

    // Update follower count on account
    await db
      .update(platformAccounts)
      .set({
        followerCount: profile.followerCount,
        lastSyncedAt: now,
      })
      .where(eq(platformAccounts.id, platformAccountId));

    logger.info("Account analytics collected", {
      platformAccountId,
      followerCount: profile.followerCount,
    });
  } catch (error) {
    logger.error("Analytics collection failed", {
      platformAccountId,
      error: String(error),
    });
  }
}
