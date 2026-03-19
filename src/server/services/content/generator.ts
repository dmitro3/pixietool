import { selectModel } from "@/server/services/ai/router";
import { generateWithOpenAI } from "@/server/services/ai/providers/openai";
import { generateWithAnthropic } from "@/server/services/ai/providers/anthropic";
import { buildContentGenerationPrompt } from "@/server/services/ai/prompts/content-generation";
import { scoreContent, type QualityScore } from "@/server/services/ai/quality-scorer";
import { trackAIUsage } from "@/server/services/ai/cost-tracker";
import { db } from "@/server/db/client";
import { contentItems, brands, brandVoiceProfiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/server/lib/logger";

// ─── Types ───────────────────────────────────────────────

export interface GenerateContentInput {
  brandId: string;
  userId: string;
  platform: string;
  contentType: string;
  contentPillar: string;
  topic?: string;
  additionalContext?: string;
  templateName?: string;
}

export interface GeneratedContent {
  id: string; // content_items.id after DB insert
  text: string;
  hashtags: string[];
  hookType: string;
  cta: string;
  qualityScore: QualityScore;
  modelUsed: string;
  tokensUsed: number;
  durationMs: number;
  attempts: number;
}

interface BrandContext {
  name: string;
  niche: string;
  targetAudience: string;
  voiceDescription: string;
  toneDescriptors: string[];
  topicsToAvoid: string[];
  examplePosts: string[];
}

// ─── Brand Context Loader ────────────────────────────────

async function loadBrandContext(brandId: string): Promise<BrandContext> {
  const [brand] = await db
    .select()
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);

  if (!brand) {
    throw new Error(`Brand not found: ${brandId}`);
  }

  const [voiceProfile] = await db
    .select()
    .from(brandVoiceProfiles)
    .where(eq(brandVoiceProfiles.brandId, brandId))
    .limit(1);

  return {
    name: brand.name,
    niche: brand.niche ?? "general",
    targetAudience: brand.targetAudience ?? "professionals",
    voiceDescription: brand.voiceDescription ?? "professional and knowledgeable",
    toneDescriptors: voiceProfile?.toneDescriptors ?? [],
    topicsToAvoid: voiceProfile?.topicsToAvoid ?? [],
    examplePosts: (voiceProfile?.examplePosts as string[]) ?? [],
  };
}

// ─── AI Call Dispatcher ──────────────────────────────────

interface AICallResult {
  content: string;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
  durationMs: number;
}

async function callAI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  tracking: { task: string; userId: string; brandId: string }
): Promise<AICallResult> {
  if (model.startsWith("gpt")) {
    return generateWithOpenAI(
      { model, systemPrompt, userPrompt, responseFormat: "json" },
      tracking
    );
  }
  return generateWithAnthropic(
    { model, systemPrompt, userPrompt },
    tracking
  );
}

// ─── JSON Parser with Recovery ───────────────────────────

function parseAIResponse(raw: string): {
  text: string;
  hashtags: string[];
  hookType: string;
  cta: string;
} {
  try {
    const parsed = JSON.parse(raw);
    return {
      text: parsed.text ?? "",
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      hookType: parsed.hookType ?? "unknown",
      cta: parsed.cta ?? "",
    };
  } catch {
    // AI sometimes wraps JSON in markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        text: parsed.text ?? "",
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        hookType: parsed.hookType ?? "unknown",
        cta: parsed.cta ?? "",
      };
    }

    logger.warn("Failed to parse AI response as JSON, using raw text");
    return { text: raw.slice(0, 3000), hashtags: [], hookType: "unknown", cta: "" };
  }
}

// ─── Retry Context Builder ───────────────────────────────

function buildRetryContext(
  originalContext: string | undefined,
  previousQuality: QualityScore
): string {
  const parts: string[] = [];
  if (originalContext) parts.push(originalContext);

  parts.push("\nIMPORTANT — The previous version had these issues. Fix them:");

  if (previousQuality.violations.length > 0) {
    parts.push(`VIOLATIONS (must fix): ${previousQuality.violations.join("; ")}`);
  }

  const topSuggestions = previousQuality.suggestions.slice(0, 3);
  if (topSuggestions.length > 0) {
    parts.push(`IMPROVEMENTS needed: ${topSuggestions.join("; ")}`);
  }

  return parts.join("\n");
}

// ─── Main Generator ──────────────────────────────────────

const MAX_ATTEMPTS = 3;

export async function generateContent(
  input: GenerateContentInput
): Promise<GeneratedContent> {
  const brandContext = await loadBrandContext(input.brandId);
  const modelSelection = selectModel("short_content");
  const tracking = {
    task: "short_content",
    userId: input.userId,
    brandId: input.brandId,
  };

  let lastResult: AICallResult | null = null;
  let lastParsed: ReturnType<typeof parseAIResponse> | null = null;
  let lastQuality: QualityScore | null = null;
  let attempts = 0;
  let modelToUse = modelSelection.primary;

  for (attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
    const { systemPrompt, userPrompt } = buildContentGenerationPrompt({
      platform: input.platform,
      contentType: input.contentType,
      contentPillar: input.contentPillar,
      brandVoice: brandContext.voiceDescription,
      targetAudience: brandContext.targetAudience,
      niche: brandContext.niche,
      topic: input.topic,
      additionalContext:
        attempts > 1 && lastQuality
          ? buildRetryContext(input.additionalContext, lastQuality)
          : input.additionalContext,
      templateName: input.templateName,
      toneDescriptors: brandContext.toneDescriptors,
      topicsToAvoid: brandContext.topicsToAvoid,
      examplePosts: brandContext.examplePosts,
    });

    try {
      lastResult = await callAI(modelToUse, systemPrompt, userPrompt, tracking);
      lastParsed = parseAIResponse(lastResult.content);
      lastQuality = scoreContent({
        text: lastParsed.text,
        platform: input.platform,
        contentType: input.contentType,
        brandVoice: brandContext.voiceDescription,
        hashtags: lastParsed.hashtags,
      });

      if (lastQuality.pass) {
        logger.info("Content generation passed quality check", {
          attempt: attempts,
          model: modelToUse,
          score: lastQuality.overall,
        });
        break;
      }

      logger.info("Content failed quality check, retrying", {
        attempt: attempts,
        score: lastQuality.overall,
        violations: lastQuality.violations,
      });
    } catch (error) {
      logger.warn("AI generation failed", {
        attempt: attempts,
        model: modelToUse,
        error: String(error),
      });

      trackAIUsage({
        ...tracking,
        model: modelToUse,
        inputTokens: 0,
        outputTokens: 0,
        durationMs: 0,
        success: false,
        errorMessage: String(error),
      });

      // Switch to fallback model
      if (modelToUse === modelSelection.primary) {
        modelToUse = modelSelection.fallback;
      }
    }
  }

  if (!lastResult || !lastParsed || !lastQuality) {
    throw new Error(
      `Content generation failed after ${MAX_ATTEMPTS} attempts for brand ${input.brandId}`
    );
  }

  // Save to database as pending_review
  const [saved] = await db
    .insert(contentItems)
    .values({
      brandId: input.brandId,
      platform: input.platform as "linkedin" | "x" | "instagram" | "tiktok" | "youtube" | "threads",
      contentType: input.contentType as "text" | "image" | "video" | "carousel" | "reel" | "thread" | "short" | "story" | "poll",
      status: "pending_review",
      textContent: lastParsed.text,
      hashtags: lastParsed.hashtags,
      aiModelUsed: lastResult.model,
      contentPillar: input.contentPillar,
      createdBy: "ai",
    })
    .returning();

  logger.info("Content generated and saved", {
    contentItemId: saved.id,
    platform: input.platform,
    attempts,
    qualityScore: lastQuality.overall,
    tokensUsed: lastResult.tokensUsed,
  });

  return {
    id: saved.id,
    text: lastParsed.text,
    hashtags: lastParsed.hashtags,
    hookType: lastParsed.hookType,
    cta: lastParsed.cta,
    qualityScore: lastQuality,
    modelUsed: lastResult.model,
    tokensUsed: lastResult.tokensUsed,
    durationMs: lastResult.durationMs,
    attempts,
  };
}

// ─── Batch Generation ────────────────────────────────────

export async function generateBatch(
  inputs: GenerateContentInput[]
): Promise<GeneratedContent[]> {
  const CONCURRENCY = 3;
  const results: GeneratedContent[] = [];

  for (let i = 0; i < inputs.length; i += CONCURRENCY) {
    const batch = inputs.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((input) => generateContent(input))
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        logger.error("Batch generation item failed", {
          error: String(result.reason),
        });
      }
    }
  }

  return results;
}
