import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/server/lib/logger";
import { trackAIUsage } from "@/server/services/ai/cost-tracker";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface GenerateOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResult {
  content: string;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
  durationMs: number;
}

interface TrackingContext {
  task?: string;
  userId?: string;
  brandId?: string;
}

export async function generateWithAnthropic(
  options: GenerateOptions,
  tracking?: TrackingContext
): Promise<GenerateResult> {
  const anthropic = getClient();
  const start = Date.now();

  const response = await anthropic.messages.create({
    model: options.model,
    max_tokens: options.maxTokens ?? 2000,
    temperature: options.temperature ?? 0.7,
    system: options.systemPrompt,
    messages: [{ role: "user", content: options.userPrompt }],
  });

  const durationMs = Date.now() - start;
  const content =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const tokensUsed = inputTokens + outputTokens;

  logger.info("Anthropic generation complete", {
    model: options.model,
    tokensUsed,
    durationMs,
  });

  if (tracking?.task) {
    trackAIUsage({
      task: tracking.task,
      model: options.model,
      inputTokens,
      outputTokens,
      durationMs,
      success: true,
      userId: tracking.userId,
      brandId: tracking.brandId,
    });
  }

  return { content, tokensUsed, inputTokens, outputTokens, model: options.model, durationMs };
}
