export type ReadinessExam = { score: number };
export type ReadinessTopic = { name: string; score: number };

export type ReadinessInput = {
  passMark: number;
  totalTopics: number;
  recentExams: ReadinessExam[];
  topics: ReadinessTopic[];
  /**
   * Whether the user has passed the timed final exam for this track.
   * When false, readiness is capped below the "Ready" threshold.
   * Defaults to true so ad-hoc calls (diagnostic, previews) aren't gated.
   */
  passedTimedFinal?: boolean;
  /**
   * Whether a timed final exam exists for this track. Used only for the
   * reason copy — when no final exists yet, we don't nag the user.
   */
  hasTimedFinal?: boolean;
  /**
   * Total seconds of study time (attempts + reviews) for this user/track.
   * Reaches full credit at STUDY_TIME_TARGET_HOURS. Defaults to the target
   * so ad-hoc callers (diagnostic previews) aren't gated.
   */
  studySeconds?: number;
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
    studyTime: number;
  };
};

// A user must practice at least this share of topics before "Ready" is
// possible. Below the threshold, coverage saturates below 100 and a hard
// cap applies to the final score.
const COVERAGE_TARGET = 0.8; // 80%
const COVERAGE_CAP = 75; // max readiness while coverage < target
const FINAL_GATE_CAP = 79; // max readiness while timed final not passed
export const STUDY_TIME_TARGET_HOURS = 30;
const STUDY_TIME_CAP = 79; // max readiness while study time < target

export function calculateReadiness(input: ReadinessInput): ReadinessResult {
  const {
    passMark,
    totalTopics,
    recentExams,
    topics,
    passedTimedFinal = true,
    hasTimedFinal = false,
    studySeconds = STUDY_TIME_TARGET_HOURS * 3600,
  } = input;

  // --- 1. Recent performance (25%) — linear-decay weighted avg, last 8 exams
  const recent8 = recentExams.slice(-8);
  let recent = 0;
  if (recent8.length > 0) {
    let weightedSum = 0;
    let weightTotal = 0;
    recent8.forEach((exam, i) => {
      const weight = i + 1;
      weightedSum += exam.score * weight;
      weightTotal += weight;
    });
    recent = weightedSum / weightTotal;
  }

  // --- 2. Coverage (25%) — scales against required 80% of topics practiced
  const required = Math.max(1, totalTopics * COVERAGE_TARGET);
  const coverageRatio = topics.length / required;
  const coverage = Math.min(100, coverageRatio * 100);

  // --- 3. Weak-spot penalty (20%) — averaged shortfall below pass mark
  const PENALTY_MULTIPLIER = 2;
  let gapSum = 0;
  topics.forEach((t) => {
    gapSum += Math.max(0, passMark - t.score);
  });
  const avgGap = totalTopics > 0 ? gapSum / totalTopics : 0;
  const weakSpotScore = Math.max(0, 100 - avgGap * PENALTY_MULTIPLIER);

  // --- 4. Consistency (10%) — lower score volatility = higher score
  let consistency = 100;
  const scores = recent8.map((e) => e.score);
  if (scores.length > 1) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    consistency = Math.max(0, 100 - stdDev * 2);
  }

  // --- 5. Study time (20%) — linear ramp to STUDY_TIME_TARGET_HOURS
  const studyHours = Math.max(0, studySeconds) / 3600;
  const studyTime = Math.min(
    100,
    (studyHours / STUDY_TIME_TARGET_HOURS) * 100
  );

  // --- Final weighted blend
  let readiness = Math.round(
    recent * 0.25 +
      coverage * 0.25 +
      weakSpotScore * 0.2 +
      consistency * 0.1 +
      studyTime * 0.2
  );

  // --- Caps
  const coverageMet = totalTopics === 0 || topics.length >= required;
  const studyMet = studyHours >= STUDY_TIME_TARGET_HOURS;
  let cappedByCoverage = false;
  let cappedByFinal = false;
  let cappedByStudy = false;
  if (!coverageMet && readiness > COVERAGE_CAP) {
    readiness = COVERAGE_CAP;
    cappedByCoverage = true;
  }
  if (!passedTimedFinal && readiness > FINAL_GATE_CAP) {
    readiness = FINAL_GATE_CAP;
    cappedByFinal = true;
  }
  if (!studyMet && readiness > STUDY_TIME_CAP) {
    readiness = STUDY_TIME_CAP;
    cappedByStudy = true;
  }

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

  // --- Dynamic reason
  let weakest: ReadinessTopic | null = null;
  topics.forEach((t) => {
    if (!weakest || t.score < weakest.score) weakest = t;
  });

  let reason: string;
  if (cappedByFinal && hasTimedFinal) {
    reason =
      "Pass the timed final exam to prove you're ready — it's the last step.";
  } else if (cappedByCoverage) {
    const remaining = Math.max(0, Math.ceil(required) - topics.length);
    reason =
      remaining > 0
        ? `Practice ${remaining} more topic${remaining === 1 ? "" : "s"} to broaden your coverage.`
        : "Broaden your topic coverage to reach Ready.";
  } else if (cappedByStudy) {
    const hoursDone = Math.floor(studyHours);
    reason = `Put in more study time — you're at ${hoursDone}h of ${STUDY_TIME_TARGET_HOURS}h.`;
  } else if (readiness >= 80) {
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
      studyTime: Math.round(studyTime),
    },
  };
}
