export type ReadinessExam = { score: number };
export type ReadinessTopic = { name: string; score: number };

export type ReadinessInput = {
  passMark: number;
  totalTopics: number;
  recentExams: ReadinessExam[];
  topics: ReadinessTopic[];
};

export type ReadinessResult = {
  readiness: number;
  status: "Ready" | "Almost there" | "Not ready yet";
  color: "green" | "amber" | "red";
  reason: string;
  breakdown: {
    recent: number;
    coverage: number;
    weakSpotScore: number;
    consistency: number;
  };
};

export function calculateReadiness(input: ReadinessInput): ReadinessResult {
  const { passMark, totalTopics, recentExams, topics } = input;

  // --- 1. Recent performance (40%) — linear-decay weighted average, last 8 exams
  const recent8 = recentExams.slice(-8);
  let recent = 0;
  if (recent8.length > 0) {
    let weightedSum = 0;
    let weightTotal = 0;
    recent8.forEach((exam, i) => {
      const weight = i + 1; // oldest = 1, newest = highest
      weightedSum += exam.score * weight;
      weightTotal += weight;
    });
    recent = weightedSum / weightTotal;
  }

  // --- 2. Coverage (20%) — % of exam topics practiced
  const coverage =
    totalTopics > 0 ? Math.min(100, (topics.length / totalTopics) * 100) : 0;

  // --- 3. Weak-spot penalty (25%) — averaged shortfall below pass mark
  const PENALTY_MULTIPLIER = 2;
  let gapSum = 0;
  topics.forEach((t) => {
    gapSum += Math.max(0, passMark - t.score);
  });
  const avgGap = totalTopics > 0 ? gapSum / totalTopics : 0;
  const weakSpotScore = Math.max(0, 100 - avgGap * PENALTY_MULTIPLIER);

  // --- 4. Consistency (15%) — lower score volatility = higher score
  let consistency = 100;
  const scores = recent8.map((e) => e.score);
  if (scores.length > 1) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    consistency = Math.max(0, 100 - stdDev * 2);
  }

  // --- Final weighted blend
  const readiness = Math.round(
    recent * 0.4 + coverage * 0.2 + weakSpotScore * 0.25 + consistency * 0.15
  );

  // --- Status band
  let status: ReadinessResult["status"];
  let color: ReadinessResult["color"];
  if (readiness >= 80) {
    status = "Ready";
    color = "green";
  } else if (readiness >= 65) {
    status = "Almost there";
    color = "amber";
  } else {
    status = "Not ready yet";
    color = "red";
  }

  // --- Dynamic reason: name the weakest practiced topic
  let weakest: ReadinessTopic | null = null;
  topics.forEach((t) => {
    if (!weakest || t.score < weakest.score) weakest = t;
  });

  let reason: string;
  if (readiness >= 80) {
    reason = "You're tracking above the pass line. Keep it up.";
  } else if (weakest) {
    reason = `Focus on your weak spots. Weakest area: ${(weakest as ReadinessTopic).name} (${(weakest as ReadinessTopic).score}%).`;
  } else {
    reason = "Take a few practice exams to build your readiness score.";
  }

  return {
    readiness,
    status,
    color,
    reason,
    breakdown: {
      recent: Math.round(recent),
      coverage: Math.round(coverage),
      weakSpotScore: Math.round(weakSpotScore),
      consistency: Math.round(consistency),
    },
  };
}
