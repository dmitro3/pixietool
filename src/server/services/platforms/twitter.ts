import type {
  PlatformAdapter,
  OAuthTokens,
  ProfileData,
  DateRange,
  AnalyticsData,
  PostContent,
  MediaContent,
  PublishResult,
  Comment,
  DemographicData,
} from "./types";
import { logger } from "@/server/lib/logger";

const TWITTER_API = "https://api.x.com/2";
const TWITTER_OAUTH = "https://twitter.com/i/oauth2";

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export class TwitterAdapter implements PlatformAdapter {
  readonly platform = "x";

  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.TWITTER_CLIENT_ID ?? "";
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET ?? "";
  }

  async connect(redirectUrl: string): Promise<string> {
    const scopes = [
      "tweet.read",
      "tweet.write",
      "users.read",
      "offline.access",
    ].join(" ");

    const codeChallenge = crypto.randomUUID().replace(/-/g, "");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUrl,
      scope: scopes,
      state: crypto.randomUUID(),
      code_challenge: codeChallenge,
      code_challenge_method: "plain",
    });

    return `${TWITTER_OAUTH}/authorize?${params}`;
  }

  async handleCallback(code: string): Promise<OAuthTokens> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const res = await fetch(`${TWITTER_OAUTH}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${appUrl}/api/auth/callback/x`,
        code_verifier: "placeholder", // Should match code_challenge from connect()
      }),
    });

    if (!res.ok) throw new Error(`Twitter OAuth failed: ${res.status}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  }

  async refreshToken(tokens: OAuthTokens): Promise<OAuthTokens> {
    if (!tokens.refreshToken) throw new Error("No refresh token");

    const res = await fetch(`${TWITTER_OAUTH}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      }),
    });

    if (!res.ok) throw new Error(`Twitter token refresh failed: ${res.status}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getProfile(tokens: OAuthTokens): Promise<ProfileData> {
    const res = await fetch(`${TWITTER_API}/users/me?user.fields=profile_image_url,public_metrics,description`, {
      headers: authHeaders(tokens.accessToken),
    });

    if (!res.ok) throw new Error(`Twitter getProfile failed: ${res.status}`);
    const { data } = await res.json();

    return {
      platformUserId: data.id,
      username: data.username,
      displayName: data.name,
      avatarUrl: data.profile_image_url,
      followerCount: data.public_metrics?.followers_count ?? 0,
      bio: data.description,
    };
  }

  async publishPost(tokens: OAuthTokens, content: PostContent): Promise<PublishResult> {
    const text = content.text ?? "";
    const hashtags = content.hashtags?.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ") ?? "";
    const fullText = hashtags ? `${text}\n\n${hashtags}` : text;

    try {
      const res = await fetch(`${TWITTER_API}/tweets`, {
        method: "POST",
        headers: authHeaders(tokens.accessToken),
        body: JSON.stringify({ text: fullText }),
      });

      if (!res.ok) throw new Error(`Twitter post failed: ${res.status}`);
      const { data } = await res.json();

      return {
        success: true,
        platformPostId: data.id,
        url: `https://x.com/i/status/${data.id}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async publishMedia(tokens: OAuthTokens, content: MediaContent): Promise<PublishResult> {
    // Twitter media upload requires v1.1 chunked upload — implement when activated
    logger.info("Twitter media publish not yet fully implemented");
    return this.publishPost(tokens, content);
  }

  async getAnalytics(_tokens: OAuthTokens, _dateRange: DateRange): Promise<AnalyticsData> {
    return { impressions: 0, reach: 0, engagement: 0, followerDelta: 0, topPosts: [] };
  }

  async getRecentPosts(tokens: OAuthTokens, limit: number): Promise<{ id: string; text: string; createdAt: Date }[]> {
    const profile = await this.getProfile(tokens);
    const res = await fetch(
      `${TWITTER_API}/users/${profile.platformUserId}/tweets?max_results=${Math.min(limit, 100)}&tweet.fields=created_at`,
      { headers: authHeaders(tokens.accessToken) }
    );

    if (!res.ok) return [];
    const { data: tweets } = await res.json();

    return (tweets ?? []).map((t: { id: string; text: string; created_at: string }) => ({
      id: t.id,
      text: t.text,
      createdAt: new Date(t.created_at),
    }));
  }

  async getComments(_tokens: OAuthTokens, _postId: string): Promise<Comment[]> { return []; }
  async replyToComment(_tokens: OAuthTokens, _commentId: string, _text: string): Promise<void> {}
  async getFollowerInsights(_tokens: OAuthTokens): Promise<DemographicData> {
    return { ageRanges: [], topLocations: [], genderSplit: [] };
  }
}
