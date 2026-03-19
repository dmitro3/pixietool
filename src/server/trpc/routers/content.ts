import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { contentItems, brands } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import {
  generateContent,
  generateBatch,
} from "@/server/services/content/generator";
import { repurposeContent } from "@/server/services/content/waterfall";
import {
  CONTENT_TEMPLATES,
  getTemplatesByPlatform,
  getTemplateById,
} from "@/server/services/content/template-library";

const platformEnum = z.enum([
  "linkedin",
  "x",
  "instagram",
  "tiktok",
  "youtube",
  "threads",
]);

const contentTypeEnum = z.enum([
  "text",
  "image",
  "video",
  "carousel",
  "reel",
  "thread",
  "short",
  "story",
  "poll",
]);

const statusEnum = z.enum([
  "draft",
  "pending_review",
  "approved",
  "scheduled",
  "published",
  "failed",
]);

export const contentRouter = createTRPCRouter({
  // ─── Queries ─────────────────────────────────────────

  list: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        status: statusEnum.optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(contentItems.brandId, input.brandId)];
      if (input.status) {
        conditions.push(eq(contentItems.status, input.status));
      }

      const items = await ctx.db
        .select()
        .from(contentItems)
        .where(and(...conditions))
        .orderBy(desc(contentItems.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return items;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(contentItems)
        .where(eq(contentItems.id, input.id))
        .limit(1);

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Content item not found",
        });
      }
      return item;
    }),

  countByStatus: protectedProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db
        .select({
          status: contentItems.status,
          count: sql<number>`count(*)::int`,
        })
        .from(contentItems)
        .where(eq(contentItems.brandId, input.brandId))
        .groupBy(contentItems.status);

      const counts: Record<string, number> = {};
      for (const row of results) {
        counts[row.status] = row.count;
      }
      return counts;
    }),

  // ─── Manual Create ───────────────────────────────────

  create: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        platform: platformEnum,
        contentType: contentTypeEnum,
        textContent: z.string().optional(),
        mediaUrls: z.array(z.string()).optional(),
        hashtags: z.array(z.string()).optional(),
        contentPillar: z.string().optional(),
        createdBy: z.enum(["ai", "human"]).default("human"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .insert(contentItems)
        .values({
          ...input,
          status: "draft",
        })
        .returning();
      return item;
    }),

  // ─── AI Generation ───────────────────────────────────

  generate: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        platform: platformEnum,
        contentType: contentTypeEnum,
        contentPillar: z.string().min(1),
        topic: z.string().optional(),
        additionalContext: z.string().optional(),
        templateName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await generateContent({
        ...input,
        userId: ctx.user.id,
      });

      return {
        id: result.id,
        text: result.text,
        hashtags: result.hashtags,
        hookType: result.hookType,
        cta: result.cta,
        qualityScore: result.qualityScore.overall,
        qualityPass: result.qualityScore.pass,
        suggestions: result.qualityScore.suggestions,
        violations: result.qualityScore.violations,
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
        durationMs: result.durationMs,
        attempts: result.attempts,
      };
    }),

  generateBatch: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        items: z
          .array(
            z.object({
              platform: platformEnum,
              contentType: contentTypeEnum,
              contentPillar: z.string().min(1),
              topic: z.string().optional(),
            })
          )
          .min(1)
          .max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = await generateBatch(
        input.items.map((item) => ({
          ...item,
          brandId: input.brandId,
          userId: ctx.user.id,
        }))
      );

      return results.map((r) => ({
        id: r.id,
        text: r.text,
        hashtags: r.hashtags,
        qualityScore: r.qualityScore.overall,
        qualityPass: r.qualityScore.pass,
        modelUsed: r.modelUsed,
        attempts: r.attempts,
      }));
    }),

  // ─── Cross-Platform Repurposing ──────────────────────

  repurpose: protectedProcedure
    .input(
      z.object({
        contentItemId: z.string().uuid(),
        targetPlatforms: z.array(platformEnum).min(1).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Load the source content item
      const [source] = await ctx.db
        .select()
        .from(contentItems)
        .where(eq(contentItems.id, input.contentItemId))
        .limit(1);

      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source content not found" });
      }

      // Load brand for voice context
      const [brand] = await ctx.db
        .select()
        .from(brands)
        .where(eq(brands.id, source.brandId))
        .limit(1);

      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
      }

      const results = await repurposeContent({
        contentItemId: source.id,
        originalText: source.textContent ?? "",
        originalPlatform: source.platform,
        originalHashtags: source.hashtags ?? [],
        targetPlatforms: input.targetPlatforms,
        brandId: source.brandId,
        userId: ctx.user.id,
        brandVoice: brand.voiceDescription ?? "professional",
        niche: brand.niche ?? "general",
      });

      return results.map((r) => ({
        id: r.id,
        platform: r.platform,
        contentType: r.contentType,
        text: r.text,
        hashtags: r.hashtags,
        qualityScore: r.qualityScore.overall,
        adaptations: r.adaptations,
      }));
    }),

  // ─── Status & Scheduling ─────────────────────────────

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: statusEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(contentItems)
        .set({
          status: input.status,
          ...(input.status === "approved"
            ? { approvedBy: ctx.user.id }
            : {}),
        })
        .where(eq(contentItems.id, input.id))
        .returning();
      return updated;
    }),

  schedule: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        scheduledFor: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(contentItems)
        .set({
          status: "scheduled",
          scheduledFor: new Date(input.scheduledFor),
        })
        .where(eq(contentItems.id, input.id))
        .returning();
      return updated;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        textContent: z.string().optional(),
        mediaUrls: z.array(z.string()).optional(),
        hashtags: z.array(z.string()).optional(),
        contentPillar: z.string().optional(),
        scheduledFor: z.string().datetime().optional(),
        status: z.enum(["draft", "pending_review", "approved", "scheduled"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, scheduledFor, ...data } = input;
      const [updated] = await ctx.db
        .update(contentItems)
        .set({
          ...data,
          ...(scheduledFor ? { scheduledFor: new Date(scheduledFor) } : {}),
        })
        .where(eq(contentItems.id, id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(contentItems)
        .where(eq(contentItems.id, input.id))
        .returning();
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return { success: true };
    }),

  // ─── Templates ──────────────────────────────────────

  templates: protectedProcedure
    .input(z.object({ platform: z.string().optional() }).optional())
    .query(({ input }) => {
      if (input?.platform) {
        return getTemplatesByPlatform(input.platform);
      }
      return CONTENT_TEMPLATES;
    }),

  templateById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const template = getTemplateById(input.id);
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      return template;
    }),

  exportCsv: protectedProcedure
    .input(z.object({ brandId: z.string().uuid(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(contentItems.brandId, input.brandId)];
      if (input.status) {
        conditions.push(eq(contentItems.status, input.status as "draft" | "pending_review" | "approved" | "scheduled" | "published" | "failed"));
      }

      const items = await ctx.db
        .select({
          id: contentItems.id,
          platform: contentItems.platform,
          contentType: contentItems.contentType,
          status: contentItems.status,
          textContent: contentItems.textContent,
          hashtags: contentItems.hashtags,
          scheduledFor: contentItems.scheduledFor,
          publishedAt: contentItems.publishedAt,
          createdAt: contentItems.createdAt,
        })
        .from(contentItems)
        .where(and(...conditions))
        .orderBy(desc(contentItems.createdAt));

      // Build CSV string
      const headers = ["id", "platform", "type", "status", "text", "hashtags", "scheduled", "published", "created"];
      const rows = items.map((item) => [
        item.id,
        item.platform,
        item.contentType,
        item.status,
        `"${(item.textContent ?? "").replace(/"/g, '""')}"`,
        (item.hashtags ?? []).join(";"),
        item.scheduledFor?.toISOString() ?? "",
        item.publishedAt?.toISOString() ?? "",
        item.createdAt.toISOString(),
      ]);

      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }),
});
