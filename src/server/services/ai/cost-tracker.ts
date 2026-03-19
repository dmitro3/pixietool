import { db } from "@/server/db/client";
import { aiUsageLogs } from "@/server/db/schema";
import { logger } from "@/server/lib/logger";

// Cost per 1M tokens in USD cents (as of 2026)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 250, output: 1000 },
  "gpt-4o-mini": { input: 15, output: 60 },
  "claude-opus-4-6": { input: 1500, output: 7500 },
  "claude-sonnet-4-6": { input: 300, output: 1500 },
  "claude-haiku-4-5-20251001": { input: 80, output: 400 },
  "gemini-2.5-pro": { input: 125, output: 500 },
};

function getProvider(model: string): string {
  if (model.startsWith("gpt")) return "openai";
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gemini")) return "google";
  return "unknown";
}

function calculateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model];
  if (!costs) return 0;
  // costs are per 1M tokens, so divide by 1M
  return (
    (inputTokens * costs.input) / 1_000_000 +
    (outputTokens * costs.output) / 1_000_000
  );
}

export interface AIUsageEntry {
  userId?: string;
  brandId?: string;
  contentItemId?: string;
  task: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

export async function trackAIUsage(entry: AIUsageEntry): Promise<void> {
  const totalTokens = entry.inputTokens + entry.outputTokens;
  const costCents = calculateCostCents(
    entry.model,
    entry.inputTokens,
    entry.outputTokens
  );
  const provider = getProvider(entry.model);

  try {
    await db.insert(aiUsageLogs).values({
      userId: entry.userId,
      brandId: entry.brandId,
      contentItemId: entry.contentItemId,
      task: entry.task,
      model: entry.model,
      provider,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      totalTokens,
      costCents,
      durationMs: entry.durationMs,
      success: entry.success,
      errorMessage: entry.errorMessage,
    });

    logger.debug("AI usage tracked", {
      task: entry.task,
      model: entry.model,
      totalTokens,
      costCents: costCents.toFixed(4),
    });
  } catch (error) {
    // Don't fail the pipeline if tracking fails
    logger.error("Failed to track AI usage", { error: String(error) });
  }
}
