import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  engagementItems,
  brands,
  brandVoiceProfiles,
  platformAccounts,
} from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { draftReply } from "@/server/services/engagement/responder";
import { classifyEngagement } from "@/server/services/engagement/classifier";
import { decrypt } from "@/server/lib/encryption";
import { LinkedInAdapter } from "@/server/services/platforms/linkedin";
import { trackAIUsage } from "@/server/services/ai/cost-tracker";

export const engagementRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        status: z.enum(["pending", "approved", "sent", "skipped"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(engagementItems.brandId, input.brandId)];
      if (input.status) {
        conditions.push(eq(engagementItems.replyStatus, input.status));
      }

      const items = await ctx.db
        .select()
        .from(engagementItems)
        .where(and(...conditions))
        .orderBy(desc(engagementItems.priority))
        .limit(input.limit)
        .offset(input.offset);

      return items;
    }),

  counts: protectedProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          status: engagementItems.replyStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(engagementItems)
        .where(eq(engagementItems.brandId, input.brandId))
        .groupBy(engagementItems.replyStatus);

      const counts: Record<string, number> = { pending: 0, approved: 0, sent: 0, skipped: 0 };
      for (const row of rows) {
        counts[row.status] = row.count;
      }
      return counts;
    }),

  /**
   * Generate an AI reply for a pending engagement item.
   * Classifies sentiment, drafts a brand-voice reply, and saves it.
   */
  generateReply: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the engagement item
      const [item] = await ctx.db
        .select()
        .from(engagementItems)
        .where(eq(engagementItems.id, input.id))
        .limit(1);

      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      // Load brand voice
      const [brand] = await ctx.db
        .select()
        .from(brands)
        .where(eq(brands.id, item.brandId))
        .limit(1);

      const [voiceProfile] = await ctx.db
        .select()
        .from(brandVoiceProfiles)
        .where(eq(brandVoiceProfiles.brandId, item.brandId))
        .limit(1);

      const brandVoice = voiceProfile?.toneDescriptors?.join(", ") ?? brand?.voiceDescription ?? "professional and friendly";

      // Classify sentiment if not already done
      let sentiment: "positive" | "neutral" | "negative" | "question" = "neutral";
      if (!item.sentimentScore) {
        const classification = await classifyEngagement(item.originalText);
        sentiment = classification.sentiment;
        await ctx.db
          .update(engagementItems)
          .set({
            sentimentScore: classification.sentimentScore,
            priority: classification.priority,
          })
          .where(eq(engagementItems.id, input.id));
      } else {
        sentiment = item.sentimentScore > 0.3
          ? "positive"
          : item.sentimentScore < -0.3
            ? "negative"
            : "neutral";
      }

      // Draft AI reply
      const drafted = await draftReply({
        platform: item.platform,
        brandVoice,
        originalPostText: "", // We don't have the original post text stored
        commentText: item.originalText,
        commentAuthor: item.authorName ?? item.authorHandle ?? "someone",
        sentiment,
      });

      // Track AI usage
      await trackAIUsage({
        userId: ctx.user.id,
        brandId: item.brandId,
        task: "engagement_reply",
        model: drafted.modelUsed,
        inputTokens: 0,
        outputTokens: 0,
        durationMs: 0,
        success: true,
      });

      // Save the drafted reply
      const [updated] = await ctx.db
        .update(engagementItems)
        .set({ aiSuggestedReply: drafted.reply })
        .where(eq(engagementItems.id, input.id))
        .returning();

      return {
        ...updated,
        draftedReply: drafted.reply,
        tone: drafted.tone,
        confidence: drafted.confidence,
      };
    }),

  /**
   * Send an approved reply to the platform.
   */
  sendReply: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(engagementItems)
        .where(eq(engagementItems.id, input.id))
        .limit(1);

      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      if (item.replyStatus !== "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Reply must be approved first" });
      }
      if (!item.aiSuggestedReply) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No reply text to send" });
      }

      // Get the platform account tokens
      const [account] = await ctx.db
        .select()
        .from(platformAccounts)
        .where(eq(platformAccounts.id, item.platformAccountId))
        .limit(1);

      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Platform account not found" });

      const tokens = {
        accessToken: decrypt(account.accessToken),
        refreshToken: account.refreshToken ? decrypt(account.refreshToken) : undefined,
        expiresAt: account.tokenExpiresAt ?? undefined,
      };

      // Send via platform adapter
      if (item.platform === "linkedin") {
        const linkedin = new LinkedInAdapter();
        await linkedin.replyToComment(tokens, item.platformItemId, item.aiSuggestedReply);
      }
      // X/Instagram adapters can be added here

      // Mark as sent
      const [updated] = await ctx.db
        .update(engagementItems)
        .set({
          replyStatus: "sent",
          respondedAt: new Date(),
        })
        .where(eq(engagementItems.id, input.id))
        .returning();

      return updated;
    }),

  approve: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        editedReply: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(engagementItems)
        .where(eq(engagementItems.id, input.id))
        .limit(1);

      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await ctx.db
        .update(engagementItems)
        .set({
          replyStatus: "approved",
          approvedBy: ctx.user.id,
          ...(input.editedReply ? { aiSuggestedReply: input.editedReply } : {}),
        })
        .where(eq(engagementItems.id, input.id))
        .returning();

      return updated;
    }),

  skip: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(engagementItems)
        .set({ replyStatus: "skipped" })
        .where(eq(engagementItems.id, input.id))
        .returning();
      return updated;
    }),
});
