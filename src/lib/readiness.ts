export type ReadinessRecentExam = { pct: number; completed_at: string };
export type ReadinessTopic = { slug: string; label: string; pct: number; total: number };

export type ReadinessBand = "ready" | "almost" | "not_ready";

export type ReadinessResult = {
  score: number;
  band: ReadinessBand;
  reason: string;
  recentAvgPct: number | null;
  trendPct: number | null;
  weakestTopic: { label: string; pct: number } | null;
};

export function calculateReadiness(input: {
  recentExams: ReadinessRecentExam[];
  topics: ReadinessTopic[];
  coveragePct: number; // 0-100
  streakDays: number;
}): ReadinessResult {
  const { recentExams, topics, coveragePct, streakDays } = input;

  const recent = recentExams.slice(0, 5);
  const recentAvg = recent.length
    ? recent.reduce((a, e) => a + e.pct, 0) / recent.length
    : 0;
  const perfScore = Math.max(0, Math.min(100, (recentAvg - 50) * 2));

  const last3 = recent.slice(0, 3);
  const prior3 = recent.slice(3, 6);
  const avg = (xs: ReadinessRecentExam[]) =>
    xs.length ? xs.reduce((a, e) => a + e.pct, 0) / xs.length : null;
  const trend =
    avg(last3) !== null && avg(prior3) !== null ? (avg(last3) as number) - (avg(prior3) as number) : 0;
  const trendScore = Math.max(0, Math.min(100, 50 + trend * 5));

  const rated = topics.filter((t) => t.total >= 10);
  const strong = rated.filter((t) => t.pct >= 70).length;
  const topicScore = rated.length ? (strong / rated.length) * 100 : 0;

  const volumeScore = Math.min(100, (coveragePct / 60) * 100);
  const habitScore = Math.min(100, (streakDays / 7) * 100);

  const raw =
    perfScore * 0.5 +
    trendScore * 0.15 +
    topicScore * 0.2 +
    volumeScore * 0.1 +
    habitScore * 0.05;
  const score = recent.length === 0 ? 0 : Math.round(raw);

  const band: ReadinessBand = score >= 80 ? "ready" : score >= 65 ? "almost" : "not_ready";

  const weakest = [...topics]
    .filter((t) => t.total >= 5)
    .sort((a, b) => a.pct - b.pct)[0];

  let reason: string;
  if (recent.length === 0) {
    reason = "Take an exam to get your first readiness score.";
  } else if (recent.length < 3) {
    const n = 3 - recent.length;
    reason = `Take ${n} more exam${n === 1 ? "" : "s"} to sharpen this estimate.`;
  } else if (weakest && weakest.pct < 65) {
    reason = `${weakest.label} is your weakest topic (${Math.round(weakest.pct)}%). Focus here next.`;
  } else if (trend < -5) {
    reason = `Recent scores are trending down ${Math.round(-trend)}%. Slow down and review.`;
  } else if (coveragePct < 40) {
    reason = `You've only covered ${Math.round(coveragePct)}% of the question bank. Keep going.`;
  } else if (band === "ready") {
    reason = "You're consistently above the pass mark. Keep it up.";
  } else {
    reason = "Almost there — a few more strong sessions will push you over.";
  }

  return {
    score,
    band,
    reason,
    recentAvgPct: recent.length ? Math.round(recentAvg) : null,
    trendPct: recent.length >= 4 ? Math.round(trend) : null,
    weakestTopic: weakest ? { label: weakest.label, pct: Math.round(weakest.pct) } : null,
  };
}
