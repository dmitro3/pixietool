import { inngest } from "../client";
import { generateContent } from "@/server/services/content/generator";
import { repurposeContent } from "@/server/services/content/waterfall";
import { db } from "@/server/db/client";
import { contentItems, brands } from "@/server/db/schema";
import { eq } from "drizzle-orm";

// ─── Single Content Generation ───────────────────────────

export const contentGenerationPipeline = inngest.createFunction(
  { id: "content-generation-pipeline", name: "Content Generation Pipeline" },
  { event: "content/generate.requested" },
  async ({ event, step }) => {
    const {
      brandId,
      userId,
      platform,
      contentType,
      contentPillar,
      topic,
      additionalContext,
      templateName,
    } = event.data as {
      brandId: string;
      userId: string;
      platform: string;
      contentType: string;
      contentPillar: string;
      topic?: string;
      additionalContext?: string;
      templateName?: string;
    };

    // Step 1: Generate content (includes quality scoring + DB save)
    const result = await step.run("generate-content", async () => {
      const generated = await generateContent({
        brandId,
        userId,
        platform,
        contentType,
        contentPillar,
        topic,
        additionalContext,
        templateName,
      });

      return {
        id: generated.id,
        qualityScore: generated.qualityScore.overall,
        qualityPass: generated.qualityScore.pass,
        modelUsed: generated.modelUsed,
        tokensUsed: generated.tokensUsed,
        attempts: generated.attempts,
      };
    });

    return {
      contentItemId: result.id,
      qualityScore: result.qualityScore,
      qualityPass: result.qualityPass,
      modelUsed: result.modelUsed,
      attempts: result.attempts,
    };
  }
);

// ─── Batch Generation (e.g. weekly content plan) ─────────

export const batchContentPipeline = inngest.createFunction(
  { id: "batch-content-pipeline", name: "Batch Content Generation" },
  { event: "content/batch.requested" },
  async ({ event, step }) => {
    const { brandId, userId, items } = event.data as {
      brandId: string;
      userId: string;
      items: {
        platform: string;
        contentType: string;
        contentPillar: string;
        topic?: string;
      }[];
    };

    const results: { id: string; platform: string; qualityScore: number }[] = [];

    // Generate each item as a separate step for reliability
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const result = await step.run(`generate-item-${i}`, async () => {
        const generated = await generateContent({
          brandId,
          userId,
          platform: item.platform,
          contentType: item.contentType,
          contentPillar: item.contentPillar,
          topic: item.topic,
        });
        return {
          id: generated.id,
          platform: generated.modelUsed,
          qualityScore: generated.qualityScore.overall,
        };
      });
      results.push(result);
    }

    return { generated: results.length, results };
  }
);

// ─── Content Waterfall (cross-platform repurposing) ──────

export const contentWaterfallPipeline = inngest.createFunction(
  { id: "content-waterfall-pipeline", name: "Content Waterfall (Cross-Platform)" },
  { event: "content/waterfall.requested" },
  async ({ event, step }) => {
    const { contentItemId, targetPlatforms, userId } = event.data as {
      contentItemId: string;
      targetPlatforms: string[];
      userId: string;
    };

    // Step 1: Load source content and brand
    const source = await step.run("load-source", async () => {
      const [item] = await db
        .select()
        .from(contentItems)
        .where(eq(contentItems.id, contentItemId))
        .limit(1);

      if (!item) throw new Error(`Content item not found: ${contentItemId}`);

      const [brand] = await db
        .select()
        .from(brands)
        .where(eq(brands.id, item.brandId))
        .limit(1);

      if (!brand) throw new Error(`Brand not found: ${item.brandId}`);

      return {
        text: item.textContent ?? "",
        platform: item.platform,
        hashtags: item.hashtags ?? [],
        brandId: item.brandId,
        brandVoice: brand.voiceDescription ?? "professional",
        niche: brand.niche ?? "general",
      };
    });

    // Step 2: Repurpose to each target platform
    const results = await step.run("repurpose-content", async () => {
      return repurposeContent({
        contentItemId,
        originalText: source.text,
        originalPlatform: source.platform,
        originalHashtags: source.hashtags,
        targetPlatforms,
        brandId: source.brandId,
        userId,
        brandVoice: source.brandVoice,
        niche: source.niche,
      });
    });

    return {
      sourceId: contentItemId,
      repurposed: results.map((r) => ({
        id: r.id,
        platform: r.platform,
        qualityScore: r.qualityScore.overall,
      })),
    };
  }
);
