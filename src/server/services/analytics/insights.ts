import { selectModel } from "@/server/services/ai/router";
import { generateWithOpenAI } from "@/server/services/ai/providers/openai";
import { logger } from "@/server/lib/logger";

interface InsightsInput {
  platform: string;
  metricsJson: string;
  previousPeriodJson?: string;
}

interface AnalyticsInsight {
  headline: string;
  detail: string;
  type: "positive" | "neutral" | "negative";
  actionItem?: string;
}

export async function generateInsights(
  input: InsightsInput
): Promise<AnalyticsInsight[]> {
  const model = selectModel("fast_cheap");

  const systemPrompt = `You are an analytics expert. Analyze the provided metrics and generate 3-5 key insights.
Each insight should be actionable and specific.
Return valid JSON: { "insights": [{ "headline": "...", "detail": "...", "type": "positive|neutral|negative", "actionItem": "..." }] }`;

  const userPrompt = `Analyze these ${input.platform} metrics and provide insights:

Current Period: ${input.metricsJson}
${input.previousPeriodJson ? `Previous Period: ${input.previousPeriodJson}` : ""}`;

  try {
    const result = await generateWithOpenAI({
      model: model.primary,
      systemPrompt,
      userPrompt,
      responseFormat: "json",
      temperature: 0.3,
    });

    const parsed = JSON.parse(result.content);
    return parsed.insights ?? [];
  } catch (error) {
    logger.error("Insight generation failed", { error: String(error) });
    return [];
  }
}
