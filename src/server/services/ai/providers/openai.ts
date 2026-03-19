import OpenAI from "openai";
import { logger } from "@/server/lib/logger";
import { trackAIUsage } from "@/server/services/ai/cost-tracker";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export interface GenerateOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
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

export async function generateWithOpenAI(
  options: GenerateOptions,
  tracking?: TrackingContext
): Promise<GenerateResult> {
  const openai = getClient();
  const start = Date.now();

  const response = await openai.chat.completions.create({
    model: options.model,
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userPrompt },
    ],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
    ...(options.responseFormat === "json"
      ? { response_format: { type: "json_object" } }
      : {}),
  });

  const durationMs = Date.now() - start;
  const content = response.choices[0]?.message?.content ?? "";
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const tokensUsed = inputTokens + outputTokens;

  logger.info("OpenAI generation complete", {
    model: options.model,
    tokensUsed,
    durationMs,
  });

  // Track usage asynchronously — don't block the response
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
