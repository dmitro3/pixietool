import { db } from "@/server/db/client";
import {
  postAnalytics,
  accountAnalytics,
  contentItems,
} from "@/server/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { logger } from "@/server/lib/logger";

interface AggregatedMetrics {
  totalImpressions: number;
  totalReach: number;
  totalEngagements: number;
  avgEngagementRate: number;
  followerGrowth: number;
  topPerformingPostIds: string[];
}

export async function aggregateMetrics(
  platformAccountId: string,
  startDate: string,
  endDate: string
): Promise<AggregatedMetrics> {
  // Account-level daily metrics
  const accountData = await db
    .select()
    .from(accountAnalytics)
    .where(
      and(
        eq(accountAnalytics.platformAccountId, platformAccountId),
        gte(accountAnalytics.date, startDate),
        lte(accountAnalytics.date, endDate)
      )
    );

  const totalImpressions = accountData.reduce(
    (sum, d) => sum + (d.totalImpressions ?? 0),
    0
  );
  const avgEngagementRate =
    accountData.length > 0
      ? accountData.reduce(
          (sum, d) => sum + (d.avgEngagementRate ?? 0),
          0
        ) / accountData.length
      : 0;

  // Follower growth = last day - first day
  const followerGrowth =
    accountData.length >= 2
      ? (accountData[accountData.length - 1].followerCount ?? 0) -
        (accountData[0].followerCount ?? 0)
      : 0;

  // Compute reach and engagement from post-level analytics
  const postMetrics = await db
    .select({
      contentItemId: postAnalytics.contentItemId,
      reach: postAnalytics.reach,
      impressions: postAnalytics.impressions,
      likes: postAnalytics.likes,
      comments: postAnalytics.comments,
      shares: postAnalytics.shares,
      saves: postAnalytics.saves,
      engagementRate: postAnalytics.engagementRate,
    })
    .from(postAnalytics)
    .where(
      and(
        gte(postAnalytics.snapshotAt, new Date(startDate)),
        lte(postAnalytics.snapshotAt, new Date(endDate))
      )
    )
    .orderBy(desc(postAnalytics.engagementRate));

  const totalReach = postMetrics.reduce(
    (sum, p) => sum + (p.reach ?? 0),
    0
  );
  const totalEngagements = postMetrics.reduce(
    (sum, p) =>
      sum +
      (p.likes ?? 0) +
      (p.comments ?? 0) +
      (p.shares ?? 0) +
      (p.saves ?? 0),
    0
  );

  // Top performing posts by engagement rate (deduplicated by content item)
  const seen = new Set<string>();
  const topPerformingPostIds: string[] = [];
  for (const metric of postMetrics) {
    if (!seen.has(metric.contentItemId) && topPerformingPostIds.length < 5) {
      seen.add(metric.contentItemId);
      topPerformingPostIds.push(metric.contentItemId);
    }
  }

  logger.debug("Metrics aggregated", {
    platformAccountId,
    totalImpressions,
    totalReach,
    totalEngagements,
    avgEngagementRate,
    topPosts: topPerformingPostIds.length,
  });

  return {
    totalImpressions,
    totalReach,
    totalEngagements,
    avgEngagementRate,
    followerGrowth,
    topPerformingPostIds,
  };
}
