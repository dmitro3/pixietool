import { describe, it, expect } from "vitest";
import { scoreContent } from "@/server/services/ai/quality-scorer";

describe("Quality Scorer", () => {
  it("passes high-quality LinkedIn content", () => {
    const result = scoreContent({
      text: "Here's what I learned from leading a team of 50 engineers through a major platform migration:\n\n1. Communication is everything\n2. Small wins build momentum\n3. Documentation saves lives\n\nWhat's your biggest lesson from a large-scale project?\n\n#leadership #engineering #management",
      platform: "linkedin",
      contentType: "text",
      hashtags: ["leadership", "engineering", "management"],
    });

    expect(result.pass).toBe(true);
    expect(result.overall).toBeGreaterThanOrEqual(60);
    expect(result.violations).toHaveLength(0);
  });

  it("fails content that exceeds platform character limit", () => {
    const longText = "a".repeat(3100); // LinkedIn limit is 3000
    const result = scoreContent({
      text: longText,
      platform: "linkedin",
      contentType: "text",
      hashtags: [],
    });

    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some((v) => v.includes("character"))).toBe(true);
  });

  it("detects AI slop phrases", () => {
    const result = scoreContent({
      text: "In the ever-evolving landscape of digital transformation, it's important to leverage cutting-edge solutions. Let's dive in and unpack this game-changing paradigm shift.",
      platform: "linkedin",
      contentType: "text",
      hashtags: [],
    });

    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("enforces tweet character limit", () => {
    const longTweet = "x".repeat(300); // X limit is 280
    const result = scoreContent({
      text: longTweet,
      platform: "x",
      contentType: "text",
      hashtags: [],
    });

    expect(result.violations.some((v) => v.includes("character"))).toBe(true);
  });

  it("returns numeric scores for all dimensions", () => {
    const result = scoreContent({
      text: "Test content for scoring.",
      platform: "linkedin",
      contentType: "text",
      hashtags: [],
    });

    expect(typeof result.overall).toBe("number");
    expect(typeof result.dimensions.hook).toBe("number");
    expect(typeof result.dimensions.clarity).toBe("number");
    expect(typeof result.dimensions.callToAction).toBe("number");
    expect(typeof result.dimensions.platformFit).toBe("number");
  });
});
