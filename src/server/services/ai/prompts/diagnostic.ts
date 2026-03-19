interface DiagnosticPromptInput {
  platform: string;
  username: string;
  followerCount: number;
  recentPostsSummary: string;
  engagementMetrics: string;
  niche: string;
}

export function buildDiagnosticPrompt(input: DiagnosticPromptInput) {
  const systemPrompt = `You are a social media diagnostic expert. Analyze the account data and provide an honest assessment.
Focus on actionable insights, not platitudes.

OUTPUT FORMAT: Return valid JSON:
{
  "healthScore": 0-100,
  "summary": "2-3 sentence overall assessment",
  "strengths": [{ "area": "...", "detail": "..." }],
  "issues": [{ "area": "...", "severity": "low|medium|high|critical", "detail": "...", "fix": "..." }],
  "quickWins": ["immediate actionable improvements"],
  "benchmarks": {
    "engagementRate": { "current": 0.0, "niche_avg": 0.0, "status": "above|at|below" },
    "postingFrequency": { "current": "...", "recommended": "...", "status": "above|at|below" }
  }
}`;

  const userPrompt = `Run a diagnostic on this ${input.platform} account:

USERNAME: @${input.username}
FOLLOWERS: ${input.followerCount}
NICHE: ${input.niche}

RECENT POSTS:
${input.recentPostsSummary}

ENGAGEMENT METRICS:
${input.engagementMetrics}`;

  return { systemPrompt, userPrompt };
}
