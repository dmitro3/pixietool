import { NextRequest, NextResponse } from "next/server";
import { LinkedInAdapter } from "@/server/services/platforms/linkedin";
import { encrypt } from "@/server/lib/encryption";
import { db } from "@/server/db/client";
import { platformAccounts } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/server/lib/logger";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const brandId = searchParams.get("state"); // We encode brandId in the state param

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error) {
    logger.error("LinkedIn OAuth denied", { error });
    return NextResponse.redirect(
      `${appUrl}/dashboard/platforms?error=oauth_denied`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/platforms?error=missing_code`
    );
  }

  if (!brandId) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/platforms?error=missing_brand`
    );
  }

  try {
    // Verify the user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        `${appUrl}/auth/login?redirect=/dashboard/platforms`
      );
    }

    // Exchange code for tokens
    const linkedin = new LinkedInAdapter();
    const tokens = await linkedin.handleCallback(code);

    // Fetch the LinkedIn profile
    const profile = await linkedin.getProfile(tokens);

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken
      ? encrypt(tokens.refreshToken)
      : null;

    // Upsert into platform_accounts
    await db
      .insert(platformAccounts)
      .values({
        brandId,
        platform: "linkedin",
        platformUserId: profile.platformUserId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        username: profile.username,
        displayName: profile.displayName,
        followerCount: profile.followerCount,
      })
      .onConflictDoNothing(); // Avoid duplicates if user reconnects

    logger.info("LinkedIn account connected", {
      brandId,
      platformUserId: profile.platformUserId,
      displayName: profile.displayName,
    });

    return NextResponse.redirect(
      `${appUrl}/dashboard/platforms?success=linkedin_connected`
    );
  } catch (err) {
    logger.error("LinkedIn OAuth callback failed", {
      error: String(err),
    });
    return NextResponse.redirect(
      `${appUrl}/dashboard/platforms?error=connection_failed`
    );
  }
}
