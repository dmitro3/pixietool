interface StrategyPromptInput {
  platform: string;
  followerCount: number;
  niche: string;
  recentPostsData: string;
  currentEngagementRate: number;
  targetAudience: string;
}

export function buildStrategyAnalysisPrompt(input: StrategyPromptInput) {
  const systemPrompt = `You are an expert social media strategist. You analyze accounts and create actionable growth playbooks.
Be specific, data-driven, and honest about what's working and what's not.

OUTPUT FORMAT: Return valid JSON with this schema:
{
  "diagnostic": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "threats": ["..."],
    "overallScore": 0-100
  },
  "playbook": {
    "contentPillars": [{ "name": "...", "percentage": 30, "description": "..." }],
    "postingSchedule": { "timesPerWeek": 4, "bestTimes": ["Tuesday 9am", ...] },
    "milestones": [{ "target": "...", "timeline": "4 weeks", "strategy": "..." }],
    "currentPhase": "growth|optimization|scaling"
  }
}`;

  const userPrompt = `Analyze this ${input.platform} account and create a growth playbook.

ACCOUNT DATA:
- Followers: ${input.followerCount}
- Niche: ${input.niche}
- Target Audience: ${input.targetAudience}
- Current Engagement Rate: ${input.currentEngagementRate}%
- Recent Posts Performance:
${input.recentPostsData}

Provide a thorough diagnostic and a 90-day growth playbook.`;

  return { systemPrompt, userPrompt };
}
