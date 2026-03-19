import { logger } from "@/server/lib/logger";

interface OptimalTimeInput {
  platform: string;
  timezone: string;
  historicalData?: {
    dayOfWeek: number;
    hour: number;
    engagementRate: number;
  }[];
}

interface OptimalSlot {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  hour: number; // 0-23
  score: number; // 0-100 confidence
}

// Default optimal posting times per platform (based on industry research)
const DEFAULT_OPTIMAL_TIMES: Record<string, OptimalSlot[]> = {
  linkedin: [
    { dayOfWeek: 2, hour: 9, score: 90 }, // Tuesday 9am
    { dayOfWeek: 3, hour: 10, score: 85 }, // Wednesday 10am
    { dayOfWeek: 4, hour: 9, score: 80 }, // Thursday 9am
    { dayOfWeek: 1, hour: 10, score: 75 }, // Monday 10am
    { dayOfWeek: 2, hour: 12, score: 70 }, // Tuesday 12pm
  ],
  x: [
    { dayOfWeek: 1, hour: 8, score: 85 },
    { dayOfWeek: 3, hour: 12, score: 80 },
    { dayOfWeek: 5, hour: 9, score: 75 },
  ],
  instagram: [
    { dayOfWeek: 2, hour: 11, score: 90 },
    { dayOfWeek: 4, hour: 14, score: 85 },
    { dayOfWeek: 5, hour: 10, score: 80 },
  ],
  tiktok: [
    { dayOfWeek: 2, hour: 19, score: 90 },
    { dayOfWeek: 4, hour: 12, score: 85 },
    { dayOfWeek: 6, hour: 10, score: 80 },
  ],
  youtube: [
    { dayOfWeek: 5, hour: 15, score: 90 },
    { dayOfWeek: 6, hour: 11, score: 85 },
    { dayOfWeek: 4, hour: 14, score: 80 },
  ],
  threads: [
    { dayOfWeek: 1, hour: 9, score: 85 },
    { dayOfWeek: 3, hour: 11, score: 80 },
    { dayOfWeek: 5, hour: 8, score: 75 },
  ],
};

export function getOptimalPostingTimes(
  input: OptimalTimeInput
): OptimalSlot[] {
  // If we have enough historical data, compute optimal slots using weighted averages
  if (input.historicalData && input.historicalData.length > 10) {
    logger.info("Calculating optimal times from historical data", {
      platform: input.platform,
      dataPoints: input.historicalData.length,
    });
    return computeFromHistory(input.historicalData, input.platform);
  }

  // Fall back to industry defaults
  return DEFAULT_OPTIMAL_TIMES[input.platform] ?? [];
}

/**
 * Compute optimal posting slots from historical engagement data.
 * Groups data by (dayOfWeek, hour), calculates weighted engagement averages,
 * and returns the top 5 slots ranked by score.
 */
function computeFromHistory(
  data: { dayOfWeek: number; hour: number; engagementRate: number }[],
  platform: string
): OptimalSlot[] {
  // Build a grid: [dayOfWeek][hour] → { totalEngagement, count, recencyWeightedEngagement }
  const grid: Map<string, { total: number; weighted: number; count: number }> =
    new Map();

  // More recent data gets higher weight (exponential decay over index)
  const totalPoints = data.length;
  for (let i = 0; i < totalPoints; i++) {
    const point = data[i];
    const key = `${point.dayOfWeek}-${point.hour}`;
    const recencyWeight = 1 + (i / totalPoints); // later entries weighted more

    const existing = grid.get(key) ?? { total: 0, weighted: 0, count: 0 };
    existing.total += point.engagementRate;
    existing.weighted += point.engagementRate * recencyWeight;
    existing.count += 1;
    grid.set(key, existing);
  }

  // Convert to slots with scores
  const slots: OptimalSlot[] = [];
  for (const [key, value] of grid.entries()) {
    const [day, hour] = key.split("-").map(Number);
    // Score = weighted avg engagement normalized to 0-100
    const avgWeighted = value.weighted / value.count;
    slots.push({
      dayOfWeek: day,
      hour,
      score: Math.round(Math.min(avgWeighted * 1000, 100)), // Scale engagement to 0-100
    });
  }

  // Sort by score descending, take top 5
  slots.sort((a, b) => b.score - a.score);
  const topSlots = slots.slice(0, 5);

  // If we got fewer than 3 computed slots, fill with defaults
  if (topSlots.length < 3) {
    const defaults = DEFAULT_OPTIMAL_TIMES[platform] ?? [];
    const existingKeys = new Set(topSlots.map((s) => `${s.dayOfWeek}-${s.hour}`));
    for (const d of defaults) {
      if (!existingKeys.has(`${d.dayOfWeek}-${d.hour}`) && topSlots.length < 5) {
        topSlots.push({ ...d, score: d.score * 0.7 }); // Discount default scores
      }
    }
  }

  logger.info("Computed optimal posting times", {
    platform,
    slotsFound: topSlots.length,
    topScore: topSlots[0]?.score,
  });

  return topSlots;
}

export function getNextAvailableSlot(
  platform: string,
  timezone: string,
  existingScheduled: Date[]
): Date {
  const optimalTimes = getOptimalPostingTimes({ platform, timezone });
  const now = new Date();

  for (const slot of optimalTimes) {
    const next = getNextOccurrence(slot.dayOfWeek, slot.hour);
    const isConflict = existingScheduled.some(
      (d) => Math.abs(d.getTime() - next.getTime()) < 2 * 60 * 60 * 1000 // 2 hour buffer
    );
    if (next > now && !isConflict) {
      return next;
    }
  }

  // Fallback: next day at 9am
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(9, 0, 0, 0);
  return fallback;
}

function getNextOccurrence(dayOfWeek: number, hour: number): Date {
  const now = new Date();
  const result = new Date(now);
  result.setHours(hour, 0, 0, 0);

  const currentDay = now.getDay();
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && now.getHours() >= hour)) {
    daysUntil += 7;
  }
  result.setDate(result.getDate() + daysUntil);

  return result;
}
