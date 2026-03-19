import { PLATFORM_CONTENT_TYPES, PLATFORM_LIMITS } from "@/server/lib/constants";
import { generateWithOpenAI } from "@/server/services/ai/providers/openai";
import { selectModel } from "@/server/services/ai/router";
import { scoreContent, type QualityScore } from "@/server/services/ai/quality-scorer";
import { db } from "@/server/db/client";
import { contentItems } from "@/server/db/schema";
import { logger } from "@/server/lib/logger";

interface RepurposeInput {
  contentItemId: string;
  originalText: string;
  originalPlatform: string;
  originalHashtags: string[];
  targetPlatforms: string[];
  brandId: string;
  userId: string;
  brandVoice: string;
  niche: string;
}

interface RepurposedItem {
  id: string;
  platform: string;
  contentType: string;
  text: string;
  hashtags: string[];
  qualityScore: QualityScore;
  adaptations: string[];
}

function getMaxLength(platform: string): number {
  const limits = PLATFORM_LIMITS[platform as keyof typeof PLATFORM_LIMITS];
  if (!limits) return 3000;
  return (Object.values(limits)[0] as number) ?? 3000;
}

function getBestContentType(platform: string): string {
  const types = PLATFORM_CONTENT_TYPES[platform as keyof typeof PLATFORM_CONTENT_TYPES];
  if (!types) return "text";
  return types.includes("text" as never) ? "text" : (types[0] as string);
}

export async function repurposeContent(
  input: RepurposeInput
): Promise<RepurposedItem[]> {
  const model = selectModel("fast_cheap");
  const results: RepurposedItem[] = [];

  for (const targetPlatform of input.targetPlatforms) {
    if (targetPlatform === input.originalPlatform) continue;

    const maxLen = getMaxLength(targetPlatform);
    const contentType = getBestContentType(targetPlatform);

    const systemPrompt = `You are a social media content repurposing expert.
Adapt the given post from ${input.originalPlatform} to ${targetPlatform}.

BRAND VOICE: ${input.brandVoice}
NICHE: ${input.niche}

RULES:
- Rewrite for ${targetPlatform}'s native style — do NOT just copy-paste
- Stay under ${maxLen} characters
- ${targetPlatform === "x" ? "Make it punchy and under 280 chars. No fluff." : ""}
- ${targetPlatform === "linkedin" ? "Make it professional and thoughtful. Use line breaks." : ""}
- ${targetPlatform === "threads" ? "Keep it casual and conversational. Under 500 chars." : ""}
- ${targetPlatform === "instagram" ? "Visual-first platform. Write a compelling caption with emoji." : ""}
- Adjust hashtag strategy for ${targetPlatform}
- Keep the core message and CTA intact

OUTPUT FORMAT: Return valid JSON:
{
  "text": "The adapted post text",
  "hashtags": ["platform", "appropriate", "tags"],
  "adaptations": ["list of changes made"]
}`;

    const userPrompt = `Adapt this ${input.originalPlatform} post for ${targetPlatform}:

ORIGINAL POST:
${input.originalText}

ORIGINAL HASHTAGS: ${input.originalHashtags.join(", ")}`;

    try {
      const result = await generateWithOpenAI(
        {
          model: model.primary,
          systemPrompt,
          userPrompt,
          responseFormat: "json",
          temperature: 0.6,
        },
        {
          task: "content_repurpose",
          userId: input.userId,
          brandId: input.brandId,
        }
      );

      const parsed = JSON.parse(result.content);
      const quality = scoreContent({
        text: parsed.text,
        platform: targetPlatform,
        contentType,
        hashtags: parsed.hashtags,
      });

      // Save to DB
      const [saved] = await db
        .insert(contentItems)
        .values({
          brandId: input.brandId,
          platform: targetPlatform as "linkedin" | "x" | "instagram" | "tiktok" | "youtube" | "threads",
          contentType: contentType as "text" | "image" | "video" | "carousel" | "reel" | "thread" | "short" | "story" | "poll",
          status: "pending_review",
          textContent: parsed.text,
          hashtags: parsed.hashtags ?? [],
          aiModelUsed: result.model,
          createdBy: "ai",
        })
        .returning();

      results.push({
        id: saved.id,
        platform: targetPlatform,
        contentType,
        text: parsed.text,
        hashtags: parsed.hashtags ?? [],
        qualityScore: quality,
        adaptations: parsed.adaptations ?? [],
      });

      logger.info("Content repurposed", {
        from: input.originalPlatform,
        to: targetPlatform,
        qualityScore: quality.overall,
      });
    } catch (error) {
      logger.error("Content repurposing failed", {
        targetPlatform,
        error: String(error),
      });
    }
  }

  return results;
}
