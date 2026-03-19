import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { engagementItems } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

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

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [updated] = await ctx.db
        .update(engagementItems)
        .set({
          replyStatus: "approved",
          approvedBy: ctx.user.id,
          ...(input.editedReply
            ? { aiSuggestedReply: input.editedReply }
            : {}),
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
