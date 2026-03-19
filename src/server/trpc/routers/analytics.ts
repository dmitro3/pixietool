import { z } from "zod";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { postAnalytics, accountAnalytics } from "@/server/db/schema";

export const analyticsRouter = createTRPCRouter({
  getPostAnalytics: protectedProcedure
    .input(z.object({ contentItemId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const analytics = await ctx.db
        .select()
        .from(postAnalytics)
        .where(eq(postAnalytics.contentItemId, input.contentItemId))
        .orderBy(desc(postAnalytics.snapshotAt));
      return analytics;
    }),

  getAccountAnalytics: protectedProcedure
    .input(
      z.object({
        platformAccountId: z.string().uuid(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const analytics = await ctx.db
        .select()
        .from(accountAnalytics)
        .where(
          and(
            eq(accountAnalytics.platformAccountId, input.platformAccountId),
            gte(accountAnalytics.date, input.startDate),
            lte(accountAnalytics.date, input.endDate)
          )
        )
        .orderBy(accountAnalytics.date);
      return analytics;
    }),
});
