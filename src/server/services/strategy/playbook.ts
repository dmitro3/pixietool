import { selectModel } from "@/server/services/ai/router";
import { generateWithAnthropic } from "@/server/services/ai/providers/anthropic";
import { buildStrategyAnalysisPrompt } from "@/server/services/ai/prompts/strategy-analysis";
import { db } from "@/server/db/client";
import { strategyPlaybooks } from "@/server/db/schema";
import { logger } from "@/server/lib/logger";

interface PlaybookInput {
  brandId: string;
  platform: string;
  followerCount: number;
  niche: string;
  targetAudience: string;
  recentPostsData: string;
  currentEngagementRate: number;
}

export async function generatePlaybook(input: PlaybookInput) {
  const { systemPrompt, userPrompt } = buildStrategyAnalysisPrompt(input);
  const model = selectModel("long_strategy");

  const result = await generateWithAnthropic({
    model: model.primary,
    systemPrompt,
    userPrompt,
    maxTokens: 4000,
  });

  const parsed = JSON.parse(result.content);

  // Store the playbook
  const [playbook] = await db
    .insert(strategyPlaybooks)
    .values({
      brandId: input.brandId,
      platform: input.platform as "linkedin" | "x" | "instagram" | "tiktok" | "youtube" | "threads",
      contentPillars: parsed.playbook.contentPillars,
      postingSchedule: parsed.playbook.postingSchedule,
      targetMilestones: parsed.playbook.milestones,
      currentPhase: parsed.playbook.currentPhase,
    })
    .returning();

  logger.info("Playbook generated", {
    brandId: input.brandId,
    platform: input.platform,
    phase: parsed.playbook.currentPhase,
  });

  return { diagnostic: parsed.diagnostic, playbook };
}
