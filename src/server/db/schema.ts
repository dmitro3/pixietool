import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  real,
  date,
  jsonb,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────

export const planTierEnum = pgEnum("plan_tier", [
  "free",
  "creator",
  "pro",
  "agency",
  "enterprise",
]);

export const orgRoleEnum = pgEnum("org_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);

export const platformEnum = pgEnum("platform", [
  "linkedin",
  "x",
  "instagram",
  "tiktok",
  "youtube",
  "threads",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "text",
  "image",
  "video",
  "carousel",
  "reel",
  "thread",
  "short",
  "story",
  "poll",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "pending_review",
  "approved",
  "scheduled",
  "published",
  "failed",
]);

export const engagementTypeEnum = pgEnum("engagement_type", [
  "comment",
  "dm",
  "mention",
  "reply",
]);

export const replyStatusEnum = pgEnum("reply_status", [
  "pending",
  "approved",
  "sent",
  "skipped",
]);

export const priorityEnum = pgEnum("priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const contentCreatorEnum = pgEnum("content_creator", ["ai", "human"]);

// ─── Tables ──────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  planTier: planTierEnum("plan_tier").notNull().default("free"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  planTier: planTierEnum("plan_tier").notNull().default("free"),
  maxBrands: integer("max_brands").notNull().default(1),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orgMembers = pgTable(
  "org_members",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: orgRoleEnum("role").notNull().default("viewer"),
  },
  (table) => [primaryKey({ columns: [table.orgId, table.userId] })]
);

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  niche: text("niche"),
  targetAudience: text("target_audience"),
  voiceDescription: text("voice_description"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const platformAccounts = pgTable("platform_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id),
  platform: platformEnum("platform").notNull(),
  platformUserId: text("platform_user_id").notNull(),
  accessToken: text("access_token").notNull(), // encrypted
  refreshToken: text("refresh_token"), // encrypted
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  username: text("username"),
  displayName: text("display_name"),
  followerCount: integer("follower_count").default(0),
  connectedAt: timestamp("connected_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  accountHealthScore: integer("account_health_score"),
  permissionsGranted: jsonb("permissions_granted"),
});

export const contentItems = pgTable("content_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id),
  platform: platformEnum("platform").notNull(),
  contentType: contentTypeEnum("content_type").notNull(),
  status: contentStatusEnum("status").notNull().default("draft"),
  textContent: text("text_content"),
  mediaUrls: jsonb("media_urls").$type<string[]>(),
  hashtags: text("hashtags").array(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  platformPostId: text("platform_post_id"),
  aiModelUsed: text("ai_model_used"),
  contentPillar: text("content_pillar"),
  createdBy: contentCreatorEnum("created_by").notNull().default("ai"),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const engagementItems = pgTable("engagement_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id),
  platform: platformEnum("platform").notNull(),
  platformAccountId: uuid("platform_account_id")
    .notNull()
    .references(() => platformAccounts.id),
  type: engagementTypeEnum("type").notNull(),
  platformItemId: text("platform_item_id").notNull(),
  originalText: text("original_text").notNull(),
  authorName: text("author_name"),
  authorHandle: text("author_handle"),
  aiSuggestedReply: text("ai_suggested_reply"),
  replyStatus: replyStatusEnum("reply_status").notNull().default("pending"),
  sentimentScore: real("sentiment_score"),
  priority: priorityEnum("priority").notNull().default("medium"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  approvedBy: uuid("approved_by").references(() => users.id),
});

export const postAnalytics = pgTable("post_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentItemId: uuid("content_item_id")
    .notNull()
    .references(() => contentItems.id),
  platform: platformEnum("platform").notNull(),
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  saves: integer("saves").default(0),
  clicks: integer("clicks").default(0),
  engagementRate: real("engagement_rate").default(0),
  followerDelta: integer("follower_delta").default(0),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accountAnalytics = pgTable("account_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  platformAccountId: uuid("platform_account_id")
    .notNull()
    .references(() => platformAccounts.id),
  date: date("date").notNull(),
  followerCount: integer("follower_count").default(0),
  totalImpressions: integer("total_impressions").default(0),
  avgEngagementRate: real("avg_engagement_rate").default(0),
  profileViews: integer("profile_views").default(0),
});

export const strategyPlaybooks = pgTable("strategy_playbooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id),
  platform: platformEnum("platform").notNull(),
  contentPillars: jsonb("content_pillars"),
  postingSchedule: jsonb("posting_schedule"),
  targetMilestones: jsonb("target_milestones"),
  currentPhase: text("current_phase"),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastRecalibratedAt: timestamp("last_recalibrated_at", {
    withTimezone: true,
  }),
});

export const brandVoiceProfiles = pgTable("brand_voice_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id),
  toneDescriptors: text("tone_descriptors").array(),
  vocabularyPreferences: jsonb("vocabulary_preferences"),
  topicsToAvoid: text("topics_to_avoid").array(),
  examplePosts: jsonb("example_posts"),
});

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  brandId: uuid("brand_id").references(() => brands.id),
  contentItemId: uuid("content_item_id").references(() => contentItems.id),
  task: text("task").notNull(), // e.g. "short_content", "engagement_reply"
  model: text("model").notNull(),
  provider: text("provider").notNull(), // "openai" | "anthropic" | "google"
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  costCents: real("cost_cents").notNull().default(0), // cost in USD cents
  durationMs: integer("duration_ms"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Relations ───────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  organizations: many(orgMembers),
}));

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    owner: one(users, {
      fields: [organizations.ownerId],
      references: [users.id],
    }),
    members: many(orgMembers),
    brands: many(brands),
  })
);

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMembers.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
}));

export const brandsRelations = relations(brands, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [brands.orgId],
    references: [organizations.id],
  }),
  platformAccounts: many(platformAccounts),
  contentItems: many(contentItems),
  engagementItems: many(engagementItems),
  strategyPlaybooks: many(strategyPlaybooks),
  voiceProfile: one(brandVoiceProfiles, {
    fields: [brands.id],
    references: [brandVoiceProfiles.brandId],
  }),
}));

export const platformAccountsRelations = relations(
  platformAccounts,
  ({ one, many }) => ({
    brand: one(brands, {
      fields: [platformAccounts.brandId],
      references: [brands.id],
    }),
    analytics: many(accountAnalytics),
    engagementItems: many(engagementItems),
  })
);

export const contentItemsRelations = relations(
  contentItems,
  ({ one, many }) => ({
    brand: one(brands, {
      fields: [contentItems.brandId],
      references: [brands.id],
    }),
    approver: one(users, {
      fields: [contentItems.approvedBy],
      references: [users.id],
    }),
    analytics: many(postAnalytics),
  })
);

export const engagementItemsRelations = relations(
  engagementItems,
  ({ one }) => ({
    brand: one(brands, {
      fields: [engagementItems.brandId],
      references: [brands.id],
    }),
    platformAccount: one(platformAccounts, {
      fields: [engagementItems.platformAccountId],
      references: [platformAccounts.id],
    }),
    approver: one(users, {
      fields: [engagementItems.approvedBy],
      references: [users.id],
    }),
  })
);

export const postAnalyticsRelations = relations(postAnalytics, ({ one }) => ({
  contentItem: one(contentItems, {
    fields: [postAnalytics.contentItemId],
    references: [contentItems.id],
  }),
}));

export const accountAnalyticsRelations = relations(
  accountAnalytics,
  ({ one }) => ({
    platformAccount: one(platformAccounts, {
      fields: [accountAnalytics.platformAccountId],
      references: [platformAccounts.id],
    }),
  })
);

export const strategyPlaybooksRelations = relations(
  strategyPlaybooks,
  ({ one }) => ({
    brand: one(brands, {
      fields: [strategyPlaybooks.brandId],
      references: [brands.id],
    }),
  })
);

export const brandVoiceProfilesRelations = relations(
  brandVoiceProfiles,
  ({ one }) => ({
    brand: one(brands, {
      fields: [brandVoiceProfiles.brandId],
      references: [brands.id],
    }),
  })
);

export const aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
  user: one(users, {
    fields: [aiUsageLogs.userId],
    references: [users.id],
  }),
  brand: one(brands, {
    fields: [aiUsageLogs.brandId],
    references: [brands.id],
  }),
  contentItem: one(contentItems, {
    fields: [aiUsageLogs.contentItemId],
    references: [contentItems.id],
  }),
}));
