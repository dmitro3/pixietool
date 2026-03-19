import { selectModel } from "@/server/services/ai/router";
import { generateWithAnthropic } from "@/server/services/ai/providers/anthropic";
import { buildDiagnosticPrompt } from "@/server/services/ai/prompts/diagnostic";
import { logger } from "@/server/lib/logger";

interface DiagnosticInput {
  platform: string;
  username: string;
  followerCount: number;
  niche: string;
  recentPostsSummary: string;
  engagementMetrics: string;
}

interface DiagnosticResult {
  healthScore: number;
  summary: string;
  strengths: { area: string; detail: string }[];
  issues: {
    area: string;
    severity: string;
    detail: string;
    fix: string;
  }[];
  quickWins: string[];
  modelUsed: string;
}

export async function runDiagnostic(
  input: DiagnosticInput
): Promise<DiagnosticResult> {
  const { systemPrompt, userPrompt } = buildDiagnosticPrompt(input);
  const model = selectModel("diagnostic");

  const result = await generateWithAnthropic({
    model: model.primary,
    systemPrompt,
    userPrompt,
    maxTokens: 4000,
  });

  const parsed = JSON.parse(result.content);

  logger.info("Diagnostic complete", {
    platform: input.platform,
    healthScore: parsed.healthScore,
  });

  return {
    ...parsed,
    modelUsed: result.model,
  };
}
