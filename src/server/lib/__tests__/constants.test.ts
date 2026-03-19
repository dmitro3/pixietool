import { describe, it, expect } from "vitest";
import {
  PLATFORM_LIMITS,
  PLATFORM_CONTENT_TYPES,
  PLAN_LIMITS,
} from "@/server/lib/constants";

describe("Constants", () => {
  it("has limits for all 6 platforms", () => {
    const platforms = ["linkedin", "x", "instagram", "tiktok", "youtube", "threads"];
    for (const p of platforms) {
      expect(PLATFORM_LIMITS[p as keyof typeof PLATFORM_LIMITS]).toBeDefined();
    }
  });

  it("has content types for all platforms", () => {
    const platforms = ["linkedin", "x", "instagram", "tiktok", "youtube", "threads"];
    for (const p of platforms) {
      const types = PLATFORM_CONTENT_TYPES[p as keyof typeof PLATFORM_CONTENT_TYPES];
      expect(types).toBeDefined();
      expect(types.length).toBeGreaterThan(0);
    }
  });

  it("has plan limits for all tiers", () => {
    const tiers = ["free", "creator", "pro", "agency", "enterprise"];
    for (const tier of tiers) {
      const limits = PLAN_LIMITS[tier as keyof typeof PLAN_LIMITS];
      expect(limits).toBeDefined();
      expect(limits.brands).toBeGreaterThanOrEqual(1);
      expect(limits.postsPerMonth).toBeGreaterThanOrEqual(10);
    }
  });

  it("enterprise has unlimited posts", () => {
    expect(PLAN_LIMITS.enterprise.postsPerMonth).toBe(Infinity);
  });

  it("linkedin text post limit is 3000 chars", () => {
    expect(PLATFORM_LIMITS.linkedin.textPost).toBe(3000);
  });

  it("tweet limit is 280 chars", () => {
    expect(PLATFORM_LIMITS.x.tweet).toBe(280);
  });
});
