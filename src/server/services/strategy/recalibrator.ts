import { db } from "@/server/db/client";
import {
  strategyPlaybooks,
  contentItems,
  postAnalytics,
  platformAccounts,
} from "@/server/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { logger } from "@/server/lib/logger";
import { generateWithOpenAI } from "@/server/services/ai/providers/openai";

interface PlaybookUpdate {
  contentPillars?: { name: string; description: string; frequency: string }[];
  postingSchedule?: { day: string; time: string; type: string }[];
  targetMilestones?: { target: string; deadline: string; metric: string }[];
  currentPhase?: string;
}

export async function recalibrateStrategy(brandId: string, platform: string) {
  // Get the latest playbook
  const [currentPlaybook] = await db
    .select()
    .from(strategyPlaybooks)
    .where(eq(strategyPlaybooks.brandId, brandId))
    .orderBy(desc(strategyPlaybooks.generatedAt))
    .limit(1);

  if (!currentPlaybook) {
    logger.warn("No existing playbook to recalibrate", { brandId, platform });
    return null;
  }

  // Gather performance data from the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentContent = await db
    .select({
      contentPillar: contentItems.contentPillar,
      status: contentItems.status,
      count: sql<number>`count(*)::int`,
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.brandId, brandId),
        eq(contentItems.platform, platform as "linkedin"),
        gte(contentItems.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(contentItems.contentPillar, contentItems.status);

  // Get engagement metrics for published posts
  const publishedPosts = await db
    .select({
      id: contentItems.id,
      textContent: contentItems.textContent,
      contentPillar: contentItems.contentPillar,
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.brandId, brandId),
        eq(contentItems.status, "published"),
        gte(contentItems.publishedAt, thirtyDaysAgo)
      )
    );

  // Aggregate analytics per pillar
  const pillarPerformance: Record<
    string,
    { impressions: number; engagement: number; posts: number }
  > = {};

  for (const post of publishedPosts) {
    const pillar = post.contentPillar ?? "uncategorized";
    if (!pillarPerformance[pillar]) {
      pillarPerformance[pillar] = { impressions: 0, engagement: 0, posts: 0 };
    }
    pillarPerformance[pillar].posts++;

    const analytics = await db
      .select()
      .from(postAnalytics)
      .where(eq(postAnalytics.contentItemId, post.id))
      .orderBy(desc(postAnalytics.snapshotAt))
      .limit(1);

    if (analytics[0]) {
      pillarPerformance[pillar].impressions += analytics[0].impressions ?? 0;
      pillarPerformance[pillar].engagement +=
        (analytics[0].likes ?? 0) +
        (analytics[0].comments ?? 0) +
        (analytics[0].shares ?? 0);
    }
  }

  // Get follower count for context
  const [account] = await db
    .select()
    .from(platformAccounts)
    .where(
      and(
        eq(platformAccounts.brandId, brandId),
        eq(platformAccounts.platform, platform as "linkedin")
      )
    )
    .limit(1);

  const followerCount = account?.followerCount ?? 0;

  // Use AI to recalibrate the strategy
  const currentPillars = (currentPlaybook.contentPillars ?? []) as {
    name: string;
    description?: string;
    frequency?: string;
  }[];
  const currentMilestones = (currentPlaybook.targetMilestones ?? []) as {
    target: string;
    deadline?: string;
    metric?: string;
  }[];

  try {
    const result = await generateWithOpenAI({
      model: "gpt-4o",
      systemPrompt: `You are a social media strategist. Analyze performance data and recalibrate the growth strategy. Return JSON only.`,
      userPrompt: `
Current playbook for ${platform} (phase: ${currentPlaybook.currentPhase ?? "unknown"}):
- Content Pillars: ${JSON.stringify(currentPillars)}
- Target Milestones: ${JSON.stringify(currentMilestones)}

Performance last 30 days:
- Published posts by pillar: ${JSON.stringify(pillarPerformance)}
- Content status breakdown: ${JSON.stringify(recentContent)}
- Current follower count: ${followerCount}

Based on this data, generate an updated strategy. Return JSON with this structure:
{
  "contentPillars": [{ "name": "...", "description": "...", "frequency": "2x/week" }],
  "postingSchedule": [{ "day": "Tuesday", "time": "9:00 AM", "type": "thought-leadership" }],
  "targetMilestones": [{ "target": "...", "deadline": "...", "metric": "..." }],
  "currentPhase": "growth|acceleration|optimization",
  "insights": "1-2 sentence summary of what changed and why"
}

Focus on:
- Double down on high-performing pillars
- Reduce or pivot low-performing ones
- Set realistic milestones based on current trajectory
- Adjust posting frequency based on engagement patterns
`,
      temperature: 0.7,
      maxTokens: 1000,
      responseFormat: "json",
    });

    let update: PlaybookUpdate & { insights?: string };
    try {
      const cleaned = result.content.replace(/```json\n?|```\n?/g, "").trim();
      update = JSON.parse(cleaned);
    } catch {
      logger.warn("Failed to parse recalibration response", {
        brandId,
        platform,
      });
      // Still update the timestamp
      await db
        .update(strategyPlaybooks)
        .set({ lastRecalibratedAt: new Date() })
        .where(eq(strategyPlaybooks.id, currentPlaybook.id));
      return currentPlaybook;
    }

    // Apply the update
    await db
      .update(strategyPlaybooks)
      .set({
        contentPillars: update.contentPillars ?? currentPlaybook.contentPillars,
        postingSchedule:
          update.postingSchedule ?? currentPlaybook.postingSchedule,
        targetMilestones:
          update.targetMilestones ?? currentPlaybook.targetMilestones,
        currentPhase: update.currentPhase ?? currentPlaybook.currentPhase,
        lastRecalibratedAt: new Date(),
      })
      .where(eq(strategyPlaybooks.id, currentPlaybook.id));

    logger.info("Strategy recalibrated via AI", {
      brandId,
      platform,
      phase: update.currentPhase,
      insights: update.insights,
    });

    return {
      ...currentPlaybook,
      ...update,
    };
  } catch (error) {
    logger.error("AI recalibration failed, updating timestamp only", {
      brandId,
      error: String(error),
    });

    await db
      .update(strategyPlaybooks)
      .set({ lastRecalibratedAt: new Date() })
      .where(eq(strategyPlaybooks.id, currentPlaybook.id));

    return currentPlaybook;
  }
}
