export type ReadinessExam = { score: number };
export type ReadinessTopic = { name: string; score: number };

export type ReadinessBand = "ready" | "almost" | "not_ready";

export type ReadinessInput = {
  passMark: number;
  totalTopics: number;
  recentExams: ReadinessExam[]; // OLDEST -> NEWEST, up to last 8
  topics: ReadinessTopic[]; // practiced topics only
};

export type ReadinessResult = {
  score: number;
  band: ReadinessBand;
  reason: string;
  recentAvg: number | null;
  trend: number | null;
  weakestTopic: { name: string; score: number } | null;
  topicsPracticed: number;
  totalTopics: number;
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function calculateReadiness(input: ReadinessInput): ReadinessResult {
  const passMark = input.passMark;
  const totalTopics = Math.max(1, input.totalTopics);
  const exams = input.recentExams.slice(-8); // oldest -> newest
  const scores = exams.map((e) => e.score);
  const topics = input.topics;

  // 1) Recent performance (45%): passMark -> 60, 100 -> 100, (passMark-30) -> 0
  const avg = scores.length ? mean(scores) : 0;
  const perfScore = scores.length
    ? avg >= passMark
      ? clamp(60 + ((avg - passMark) / (100 - passMark)) * 40)
      : clamp(60 - ((passMark - avg) / 30) * 60)
    : 0;

  // 2) Trend (15%): last3 vs prior3, +/-10 -> 100/0
  const last3 = scores.slice(-3);
  const prior3 = scores.slice(-6, -3);
  const trend = last3.length && prior3.length ? mean(last3) - mean(prior3) : 0;
  const trendScore = scores.length >= 2 ? clamp(50 + trend * 5) : 50;

  // 3) Topic mastery (20%): strong topics / totalTopics
  const strong = topics.filter((t) => t.score >= passMark).length;
  const masteryScore = clamp((strong / totalTopics) * 100);

  // 4) Weakest-topic drag (15%)
  const weakest = topics.length ? [...topics].sort((a, b) => a.score - b.score)[0] : null;
  const dragScore = !weakest
    ? 50
    : weakest.score >= passMark
      ? 100
      : clamp(100 - (passMark - weakest.score) * 2);

  // 5) Consistency (5%): 100 - stddev
  let consistencyScore = 100;
  if (scores.length >= 2) {
    const m = mean(scores);
    const variance = mean(scores.map((s) => (s - m) ** 2));
    consistencyScore = clamp(100 - Math.sqrt(variance));
  }

  const raw =
    perfScore * 0.45 +
    trendScore * 0.15 +
    masteryScore * 0.2 +
    dragScore * 0.15 +
    consistencyScore * 0.05;

  const score = scores.length === 0 ? 0 : Math.round(raw);
  const band: ReadinessBand = score >= 80 ? "ready" : score >= 65 ? "almost" : "not_ready";

  const topicsPracticed = topics.length;
  const coverageFrac = topicsPracticed / totalTopics;

  let reason: string;
  if (scores.length === 0) {
    reason = "Take an exam to get your first readiness score.";
  } else if (scores.length < 3) {
    const n = 3 - scores.length;
    reason = `Take ${n} more exam${n === 1 ? "" : "s"} to sharpen this estimate.`;
  } else if (weakest && weakest.score < passMark) {
    reason = `${weakest.name} is your weakest topic (${Math.round(weakest.score)}%). Focus here next.`;
  } else if (coverageFrac < 0.5) {
    reason = `You've only practiced ${topicsPracticed} of ${totalTopics} topics. Broaden your coverage.`;
  } else if (trend < -5) {
    reason = `Recent scores dropped ${Math.round(-trend)}%. Slow down and review.`;
  } else if (band === "ready") {
    reason = `Consistently above the ${passMark}% pass mark. Keep it up.`;
  } else {
    reason = "Almost there — a few more strong sessions will push you over.";
  }

  return {
    score,
    band,
    reason,
    recentAvg: scores.length ? Math.round(avg) : null,
    trend: scores.length >= 2 ? Math.round(trend) : null,
    weakestTopic: weakest ? { name: weakest.name, score: Math.round(weakest.score) } : null,
    topicsPracticed,
    totalTopics,
  };
}
