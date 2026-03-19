import { describe, it, expect } from "vitest";
import {
  getOptimalPostingTimes,
  getNextAvailableSlot,
} from "@/server/services/scheduling/scheduler";

describe("Scheduler", () => {
  it("returns default times for linkedin when no history", () => {
    const times = getOptimalPostingTimes({
      platform: "linkedin",
      timezone: "America/New_York",
    });

    expect(times.length).toBeGreaterThan(0);
    expect(times[0].score).toBe(90); // Tuesday 9am is highest
    expect(times[0].dayOfWeek).toBe(2);
    expect(times[0].hour).toBe(9);
  });

  it("computes from historical data when enough data points", () => {
    // Generate 15 data points weighted toward Wednesday 2pm
    const history = [];
    for (let i = 0; i < 15; i++) {
      history.push({
        dayOfWeek: 3,
        hour: 14,
        engagementRate: 0.08 + Math.random() * 0.04,
      });
    }
    // Add some noise
    for (let i = 0; i < 5; i++) {
      history.push({
        dayOfWeek: 1,
        hour: 9,
        engagementRate: 0.02,
      });
    }

    const times = getOptimalPostingTimes({
      platform: "linkedin",
      timezone: "America/New_York",
      historicalData: history,
    });

    expect(times.length).toBeGreaterThan(0);
    // Wednesday 2pm should be top-ranked
    expect(times[0].dayOfWeek).toBe(3);
    expect(times[0].hour).toBe(14);
  });

  it("returns empty for unknown platform defaults", () => {
    const times = getOptimalPostingTimes({
      platform: "mastodon",
      timezone: "UTC",
    });
    expect(times).toEqual([]);
  });

  it("getNextAvailableSlot returns a future date", () => {
    const slot = getNextAvailableSlot("linkedin", "UTC", []);
    expect(slot.getTime()).toBeGreaterThan(Date.now());
  });

  it("avoids conflicts with existing scheduled posts", () => {
    const now = new Date();
    // Create a conflict at the top optimal slot
    const topSlot = getOptimalPostingTimes({
      platform: "linkedin",
      timezone: "UTC",
    })[0];

    // Build a date for that slot
    const conflictDate = new Date(now);
    const daysUntil =
      ((topSlot.dayOfWeek - now.getDay() + 7) % 7) || 7;
    conflictDate.setDate(conflictDate.getDate() + daysUntil);
    conflictDate.setHours(topSlot.hour, 0, 0, 0);

    const slot = getNextAvailableSlot("linkedin", "UTC", [conflictDate]);

    // Should not be the same time as the conflict
    expect(
      Math.abs(slot.getTime() - conflictDate.getTime())
    ).toBeGreaterThan(2 * 60 * 60 * 1000);
  });
});
