import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  brands,
  orgMembers,
  organizations,
  brandVoiceProfiles,
} from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

export const brandsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Get all brands the user has access to through their orgs
    const userOrgs = await ctx.db
      .select({ orgId: orgMembers.orgId })
      .from(orgMembers)
      .where(eq(orgMembers.userId, ctx.user.id));

    if (userOrgs.length === 0) return [];

    const orgIds = userOrgs.map((o) => o.orgId);
    const result = await ctx.db
      .select()
      .from(brands)
      .where(
        orgIds.length === 1
          ? eq(brands.orgId, orgIds[0])
          : inArray(brands.orgId, orgIds)
      );
    return result;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [brand] = await ctx.db
        .select()
        .from(brands)
        .where(eq(brands.id, input.id))
        .limit(1);

      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
      }

      return brand;
    }),

  create: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        name: z.string().min(1),
        niche: z.string().optional(),
        targetAudience: z.string().optional(),
        voiceDescription: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user belongs to this org
      const [membership] = await ctx.db
        .select()
        .from(orgMembers)
        .where(
          and(
            eq(orgMembers.orgId, input.orgId),
            eq(orgMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [brand] = await ctx.db.insert(brands).values(input).returning();
      return brand;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        niche: z.string().optional(),
        targetAudience: z.string().optional(),
        voiceDescription: z.string().optional(),
        logoUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(brands)
        .set(data)
        .where(eq(brands.id, id))
        .returning();
      return updated;
    }),

  getVoiceProfile: protectedProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [profile] = await ctx.db
        .select()
        .from(brandVoiceProfiles)
        .where(eq(brandVoiceProfiles.brandId, input.brandId))
        .limit(1);
      return profile ?? null;
    }),

  upsertVoiceProfile: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        toneDescriptors: z.array(z.string()).optional(),
        vocabularyPreferences: z
          .object({
            preferred: z.array(z.string()).optional(),
            avoided: z.array(z.string()).optional(),
          })
          .optional(),
        topicsToAvoid: z.array(z.string()).optional(),
        examplePosts: z
          .array(
            z.object({
              platform: z.string(),
              text: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { brandId, ...data } = input;

      // Check if profile exists
      const [existing] = await ctx.db
        .select()
        .from(brandVoiceProfiles)
        .where(eq(brandVoiceProfiles.brandId, brandId))
        .limit(1);

      if (existing) {
        const [updated] = await ctx.db
          .update(brandVoiceProfiles)
          .set({
            toneDescriptors: data.toneDescriptors,
            vocabularyPreferences: data.vocabularyPreferences,
            topicsToAvoid: data.topicsToAvoid,
            examplePosts: data.examplePosts,
          })
          .where(eq(brandVoiceProfiles.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(brandVoiceProfiles)
        .values({
          brandId,
          toneDescriptors: data.toneDescriptors,
          vocabularyPreferences: data.vocabularyPreferences,
          topicsToAvoid: data.topicsToAvoid,
          examplePosts: data.examplePosts,
        })
        .returning();
      return created;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(brands)
        .where(eq(brands.id, input.id))
        .returning();
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return { success: true };
    }),
});
