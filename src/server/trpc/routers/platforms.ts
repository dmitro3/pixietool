import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { platformAccounts, brands } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { LinkedInAdapter } from "@/server/services/platforms/linkedin";
import { TwitterAdapter } from "@/server/services/platforms/twitter";
import { InstagramAdapter } from "@/server/services/platforms/instagram";
import { decrypt } from "@/server/lib/encryption";

const platformEnum = z.enum([
  "linkedin",
  "x",
  "instagram",
  "tiktok",
  "youtube",
  "threads",
]);

function getAdapter(platform: string) {
  switch (platform) {
    case "linkedin":
      return new LinkedInAdapter();
    case "x":
      return new TwitterAdapter();
    case "instagram":
      return new InstagramAdapter();
    default:
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Platform "${platform}" is not yet supported`,
      });
  }
}

export const platformsRouter = createTRPCRouter({
  // ─── Queries ─────────────────────────────────────────

  listByBrand: protectedProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const accounts = await ctx.db
        .select({
          id: platformAccounts.id,
          brandId: platformAccounts.brandId,
          platform: platformAccounts.platform,
          username: platformAccounts.username,
          displayName: platformAccounts.displayName,
          followerCount: platformAccounts.followerCount,
          connectedAt: platformAccounts.connectedAt,
          lastSyncedAt: platformAccounts.lastSyncedAt,
          accountHealthScore: platformAccounts.accountHealthScore,
        })
        .from(platformAccounts)
        .where(eq(platformAccounts.brandId, input.brandId));

      return accounts;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [account] = await ctx.db
        .select({
          id: platformAccounts.id,
          brandId: platformAccounts.brandId,
          platform: platformAccounts.platform,
          username: platformAccounts.username,
          displayName: platformAccounts.displayName,
          followerCount: platformAccounts.followerCount,
          connectedAt: platformAccounts.connectedAt,
          lastSyncedAt: platformAccounts.lastSyncedAt,
          accountHealthScore: platformAccounts.accountHealthScore,
          tokenExpiresAt: platformAccounts.tokenExpiresAt,
        })
        .from(platformAccounts)
        .where(eq(platformAccounts.id, input.id))
        .limit(1);

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Platform account not found" });
      }
      return account;
    }),

  // ─── Mutations ───────────────────────────────────────

  /**
   * Generate the OAuth authorization URL for a platform.
   * The frontend redirects the user to this URL.
   */
  getConnectUrl: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        platform: platformEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the user owns this brand
      const [brand] = await ctx.db
        .select()
        .from(brands)
        .where(eq(brands.id, input.brandId))
        .limit(1);

      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
      }

      const adapter = getAdapter(input.platform);
      // Pass brandId as the state parameter so the callback knows which brand to associate
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const redirectUri = `${appUrl}/api/auth/callback/${input.platform}`;

      // For LinkedIn, we override the state with brandId
      const url = await adapter.connect(redirectUri);
      // Replace the random state with brandId for the callback to use
      const parsed = new URL(url);
      parsed.searchParams.set("state", input.brandId);

      return { url: parsed.toString() };
    }),

  /**
   * Sync a platform account's profile data (username, displayName, followerCount).
   */
  syncProfile: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [account] = await ctx.db
        .select()
        .from(platformAccounts)
        .where(eq(platformAccounts.id, input.id))
        .limit(1);

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const adapter = getAdapter(account.platform);
      const tokens = {
        accessToken: decrypt(account.accessToken),
        refreshToken: account.refreshToken ? decrypt(account.refreshToken) : undefined,
        expiresAt: account.tokenExpiresAt ?? undefined,
      };

      // Refresh token if expired
      const resolvedTokens = await maybeRefreshTokens(adapter, tokens, account.id, ctx.db);
      const profile = await adapter.getProfile(resolvedTokens);

      const [updated] = await ctx.db
        .update(platformAccounts)
        .set({
          username: profile.username,
          displayName: profile.displayName,
          followerCount: profile.followerCount,
          lastSyncedAt: new Date(),
        })
        .where(eq(platformAccounts.id, input.id))
        .returning({
          id: platformAccounts.id,
          platform: platformAccounts.platform,
          username: platformAccounts.username,
          displayName: platformAccounts.displayName,
          followerCount: platformAccounts.followerCount,
          lastSyncedAt: platformAccounts.lastSyncedAt,
        });

      return updated;
    }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(platformAccounts)
        .where(eq(platformAccounts.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return { success: true };
    }),
});

// ─── Token Refresh Helper ─────────────────────────────────

async function maybeRefreshTokens(
  adapter: { refreshToken: (tokens: { accessToken: string; refreshToken?: string; expiresAt?: Date }) => Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date; scope?: string }> },
  tokens: { accessToken: string; refreshToken?: string; expiresAt?: Date },
  accountId: string,
  database: typeof import("@/server/db/client").db
) {
  // Check if token is expired or about to expire (5 min buffer)
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (tokens.expiresAt && tokens.expiresAt.getTime() - bufferMs < now.getTime()) {
    try {
      const { encrypt } = await import("@/server/lib/encryption");
      const newTokens = await adapter.refreshToken(tokens);

      // Update encrypted tokens in DB
      await database
        .update(platformAccounts)
        .set({
          accessToken: encrypt(newTokens.accessToken),
          refreshToken: newTokens.refreshToken ? encrypt(newTokens.refreshToken) : undefined,
          tokenExpiresAt: newTokens.expiresAt,
        })
        .where(eq(platformAccounts.id, accountId));

      return newTokens;
    } catch {
      // If refresh fails, try with existing token
      return tokens;
    }
  }

  return tokens;
}
