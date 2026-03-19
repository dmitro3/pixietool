import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc";
import { users, organizations, orgMembers } from "@/server/db/schema";
import { getWebhookEvents } from "@/server/lib/webhook-log";

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const [profile] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    return profile ?? null;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        avatarUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id))
        .returning();
      return updated;
    }),

  createOrg: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [org] = await ctx.db
        .insert(organizations)
        .values({
          name: input.name,
          ownerId: ctx.user.id,
        })
        .returning();

      // Add the creator as owner member
      await ctx.db.insert(orgMembers).values({
        orgId: org.id,
        userId: ctx.user.id,
        role: "owner",
      });

      return org;
    }),

  inviteMember: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        email: z.string().email(),
        role: z.enum(["admin", "editor", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user exists
      const [existingUser] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUser) {
        // Add directly to org
        await ctx.db.insert(orgMembers).values({
          orgId: input.orgId,
          userId: existingUser.id,
          role: input.role,
        });
        return { status: "added", email: input.email };
      }

      // User doesn't exist yet — in production, send an invite email via Resend
      // For now, return pending status
      return { status: "invited", email: input.email };
    }),

  webhookLog: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(({ input }) => {
      return getWebhookEvents(input?.limit ?? 50);
    }),

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const [updated] = await ctx.db
      .update(users)
      .set({
        onboardingComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ctx.user.id))
      .returning();
    return updated;
  }),
});
