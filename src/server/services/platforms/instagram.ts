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

const GRAPH_API = "https://graph.instagram.com/v21.0";
const FB_OAUTH = "https://www.facebook.com/v21.0/dialog/oauth";
const FB_TOKEN = "https://graph.facebook.com/v21.0/oauth/access_token";

export class InstagramAdapter implements PlatformAdapter {
  readonly platform = "instagram";

  private appId: string;
  private appSecret: string;

  constructor() {
    this.appId = process.env.META_APP_ID ?? "";
    this.appSecret = process.env.META_APP_SECRET ?? "";
  }

  async connect(redirectUrl: string): Promise<string> {
    const scopes = [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_comments",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
    ].join(",");

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUrl,
      scope: scopes,
      response_type: "code",
      state: crypto.randomUUID(),
    });

    return `${FB_OAUTH}?${params}`;
  }

  async handleCallback(code: string): Promise<OAuthTokens> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const res = await fetch(
      `${FB_TOKEN}?client_id=${this.appId}&client_secret=${this.appSecret}&redirect_uri=${encodeURIComponent(`${appUrl}/api/auth/callback/instagram`)}&code=${code}`
    );

    if (!res.ok) throw new Error(`Instagram OAuth failed: ${res.status}`);
    const data = await res.json();

    // Exchange for long-lived token
    const longLivedRes = await fetch(
      `${FB_TOKEN}?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${data.access_token}`
    );

    if (!longLivedRes.ok) throw new Error("Instagram long-lived token exchange failed");
    const longLived = await longLivedRes.json();

    return {
      accessToken: longLived.access_token,
      expiresAt: new Date(Date.now() + (longLived.expires_in ?? 5184000) * 1000),
      scope: "instagram_basic,instagram_content_publish",
    };
  }

  async refreshToken(tokens: OAuthTokens): Promise<OAuthTokens> {
    const res = await fetch(
      `${GRAPH_API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${tokens.accessToken}`
    );

    if (!res.ok) throw new Error("Instagram token refresh failed");
    const data = await res.json();

    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 5184000) * 1000),
    };
  }

  async getProfile(tokens: OAuthTokens): Promise<ProfileData> {
    const res = await fetch(
      `${GRAPH_API}/me?fields=id,username,name,profile_picture_url,followers_count,biography&access_token=${tokens.accessToken}`
    );

    if (!res.ok) throw new Error(`Instagram getProfile failed: ${res.status}`);
    const data = await res.json();

    return {
      platformUserId: data.id,
      username: data.username,
      displayName: data.name ?? data.username,
      avatarUrl: data.profile_picture_url,
      followerCount: data.followers_count ?? 0,
      bio: data.biography,
    };
  }

  async publishPost(_tokens: OAuthTokens, _content: PostContent): Promise<PublishResult> {
    // Instagram requires media — text-only posts not supported
    logger.info("Instagram requires media for publishing — use publishMedia");
    return { success: false, error: "Instagram requires media content" };
  }

  async publishMedia(tokens: OAuthTokens, content: MediaContent): Promise<PublishResult> {
    if (!content.mediaUrls?.length) {
      return { success: false, error: "No media URLs provided" };
    }

    const profile = await this.getProfile(tokens);
    const caption = [
      content.text ?? "",
      content.hashtags?.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ") ?? "",
    ].filter(Boolean).join("\n\n");

    try {
      // Step 1: Create media container
      const createRes = await fetch(`${GRAPH_API}/${profile.platformUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: content.mediaUrls[0],
          caption,
          access_token: tokens.accessToken,
        }),
      });

      if (!createRes.ok) throw new Error(`Instagram media create failed: ${createRes.status}`);
      const { id: containerId } = await createRes.json();

      // Step 2: Publish the container
      const publishRes = await fetch(`${GRAPH_API}/${profile.platformUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: tokens.accessToken,
        }),
      });

      if (!publishRes.ok) throw new Error(`Instagram publish failed: ${publishRes.status}`);
      const { id: mediaId } = await publishRes.json();

      return {
        success: true,
        platformPostId: mediaId,
        url: `https://www.instagram.com/p/${mediaId}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getAnalytics(tokens: OAuthTokens, dateRange: DateRange): Promise<AnalyticsData> {
    const profile = await this.getProfile(tokens);
    try {
      const res = await fetch(
        `${GRAPH_API}/${profile.platformUserId}/insights?metric=impressions,reach,follower_count&period=day&since=${Math.floor(dateRange.start.getTime() / 1000)}&until=${Math.floor(dateRange.end.getTime() / 1000)}&access_token=${tokens.accessToken}`
      );

      if (!res.ok) return { impressions: 0, reach: 0, engagement: 0, followerDelta: 0, topPosts: [] };
      const { data } = await res.json();

      const impressions = data?.find((d: { name: string }) => d.name === "impressions")?.values?.reduce((s: number, v: { value: number }) => s + v.value, 0) ?? 0;
      const reach = data?.find((d: { name: string }) => d.name === "reach")?.values?.reduce((s: number, v: { value: number }) => s + v.value, 0) ?? 0;

      return { impressions, reach, engagement: 0, followerDelta: 0, topPosts: [] };
    } catch {
      return { impressions: 0, reach: 0, engagement: 0, followerDelta: 0, topPosts: [] };
    }
  }

  async getRecentPosts(tokens: OAuthTokens, limit: number): Promise<{ id: string; text: string; createdAt: Date }[]> {
    const profile = await this.getProfile(tokens);
    try {
      const res = await fetch(
        `${GRAPH_API}/${profile.platformUserId}/media?fields=id,caption,timestamp&limit=${limit}&access_token=${tokens.accessToken}`
      );
      if (!res.ok) return [];
      const { data } = await res.json();
      return (data ?? []).map((p: { id: string; caption?: string; timestamp: string }) => ({
        id: p.id,
        text: p.caption ?? "",
        createdAt: new Date(p.timestamp),
      }));
    } catch {
      return [];
    }
  }

  async getComments(tokens: OAuthTokens, postId: string): Promise<Comment[]> {
    try {
      const res = await fetch(
        `${GRAPH_API}/${postId}/comments?fields=id,text,username,timestamp&access_token=${tokens.accessToken}`
      );
      if (!res.ok) return [];
      const { data } = await res.json();
      return (data ?? []).map((c: { id: string; text: string; username: string; timestamp: string }) => ({
        id: c.id,
        text: c.text,
        authorName: c.username,
        authorHandle: c.username,
        createdAt: new Date(c.timestamp),
      }));
    } catch {
      return [];
    }
  }

  async replyToComment(tokens: OAuthTokens, commentId: string, text: string): Promise<void> {
    await fetch(`${GRAPH_API}/${commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, access_token: tokens.accessToken }),
    });
  }

  async getFollowerInsights(_tokens: OAuthTokens): Promise<DemographicData> {
    return { ageRanges: [], topLocations: [], genderSplit: [] };
  }
}
