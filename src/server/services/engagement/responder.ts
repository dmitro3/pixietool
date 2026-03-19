import { selectModel } from "@/server/services/ai/router";
import { generateWithOpenAI } from "@/server/services/ai/providers/openai";
import { buildEngagementReplyPrompt } from "@/server/services/ai/prompts/engagement-reply";
import { logger } from "@/server/lib/logger";

interface DraftReplyInput {
  platform: string;
  brandVoice: string;
  originalPostText: string;
  commentText: string;
  commentAuthor: string;
  sentiment: "positive" | "neutral" | "negative" | "question";
}

interface DraftedReply {
  reply: string;
  tone: string;
  confidence: number;
  modelUsed: string;
}

export async function draftReply(
  input: DraftReplyInput
): Promise<DraftedReply> {
  const { systemPrompt, userPrompt } = buildEngagementReplyPrompt(input);
  const model = selectModel("engagement_reply");

  const result = await generateWithOpenAI({
    model: model.primary,
    systemPrompt,
    userPrompt,
    responseFormat: "json",
    temperature: 0.6,
  });

  const parsed = JSON.parse(result.content);

  logger.info("Reply drafted", {
    platform: input.platform,
    confidence: parsed.confidence,
  });

  return {
    reply: parsed.reply,
    tone: parsed.tone,
    confidence: parsed.confidence,
    modelUsed: result.model,
  };
}
