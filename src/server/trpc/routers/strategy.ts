import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { strategyPlaybooks } from "@/server/db/schema";

export const strategyRouter = createTRPCRouter({
  getPlaybook: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        platform: z
          .enum([
            "linkedin",
            "x",
            "instagram",
            "tiktok",
            "youtube",
            "threads",
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(strategyPlaybooks.brandId, input.brandId)];
      if (input.platform) {
        conditions.push(eq(strategyPlaybooks.platform, input.platform));
      }

      const playbooks = await ctx.db
        .select()
        .from(strategyPlaybooks)
        .where(eq(strategyPlaybooks.brandId, input.brandId))
        .orderBy(desc(strategyPlaybooks.generatedAt));

      return playbooks;
    }),
});
