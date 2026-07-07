## Goal
Replace the "Avg score" tile with an "Exam-day readiness (estimate)" gauge that scores 0–100, shows a colored status band, and explains the top reason.

## Note on the missing paste
Your message referenced a `calculateReadiness` function + data shape, but the paste block was empty. I'm proposing a concrete function below so we can move forward — if you paste your version, I'll swap it in verbatim without changing the UI.

## 1. New server function — `getReadiness`
File: `src/lib/dashboard.functions.ts` (new export).

Aggregates from existing tables (no schema changes):
- `recentExams`: last 5 completed `user_attempts` in the active category → `{ pct, completed_at }`.
- `topics`: per-topic accuracy via `user_answers → questions → exam_tags` joined on category. Shape: `{ slug, label, correct, total, pct }`.
- `daysUntilExam`: not tracked yet → passed as `null`.
- `streak`: reuse `user_streaks.current_streak`.
- `questionsAnswered` / `questionsTotal`: reuse existing stats logic.

Returns:
```
{
  score: number,           // 0-100
  band: "ready" | "almost" | "not_ready",
  reason: string,          // top weakness sentence
  recentAvgPct: number|null,
  weakestTopic: { label, pct } | null,
  trendPct: number|null,   // last3 vs prior3 delta
  coveragePct: number,     // questionsAnswered / questionsTotal
}
```

## 2. `calculateReadiness` (pure function)
File: `src/lib/readiness.ts`. Deterministic, unit-testable, called inside `getReadiness`.

```ts
type RecentExam = { pct: number; completed_at: string };
type Topic = { slug: string; label: string; pct: number; total: number };

export function calculateReadiness(input: {
  recentExams: RecentExam[];
  topics: Topic[];
  coveragePct: number;   // 0-100
  streakDays: number;
}) {
  const { recentExams, topics, coveragePct, streakDays } = input;

  // Recent performance (50%): avg of last up-to-5 exams, mapped 50→0, 100→100.
  const recent = recentExams.slice(0, 5);
  const recentAvg = recent.length
    ? recent.reduce((a, e) => a + e.pct, 0) / recent.length
    : 0;
  const perfScore = Math.max(0, Math.min(100, (recentAvg - 50) * 2));

  // Consistency (15%): trend of last 3 vs prior 3.
  const last3 = recent.slice(0, 3);
  const prior3 = recent.slice(3, 6);
  const avg = (xs: RecentExam[]) =>
    xs.length ? xs.reduce((a, e) => a + e.pct, 0) / xs.length : null;
  const trend =
    avg(last3) !== null && avg(prior3) !== null ? avg(last3)! - avg(prior3)! : 0;
  const trendScore = Math.max(0, Math.min(100, 50 + trend * 5));

  // Topic coverage (20%): fraction of topics with ≥10 answers AND ≥70% accuracy.
  const rated = topics.filter((t) => t.total >= 10);
  const strong = rated.filter((t) => t.pct >= 70).length;
  const topicScore = rated.length ? (strong / rated.length) * 100 : 0;

  // Volume (10%): coverage of question bank, capped at 60% = full credit.
  const volumeScore = Math.min(100, (coveragePct / 60) * 100);

  // Habit (5%): streak, capped at 7 days.
  const habitScore = Math.min(100, (streakDays / 7) * 100);

  const score = Math.round(
    perfScore * 0.5 +
      trendScore * 0.15 +
      topicScore * 0.2 +
      volumeScore * 0.1 +
      habitScore * 0.05
  );

  const band: "ready" | "almost" | "not_ready" =
    score >= 80 ? "ready" : score >= 65 ? "almost" : "not_ready";

  // Reason line — pick the biggest drag.
  const weakest = [...topics]
    .filter((t) => t.total >= 5)
    .sort((a, b) => a.pct - b.pct)[0];
  let reason: string;
  if (recent.length < 3) {
    reason = `Take ${3 - recent.length} more exam${3 - recent.length === 1 ? "" : "s"} to sharpen this estimate.`;
  } else if (weakest && weakest.pct < 65) {
    reason = `${weakest.label} is your weakest topic (${Math.round(weakest.pct)}%). Focus here next.`;
  } else if (trend < -5) {
    reason = `Your recent scores are trending down ${Math.round(-trend)}%. Slow down and review.`;
  } else if (coveragePct < 40) {
    reason = `You've only covered ${Math.round(coveragePct)}% of the question bank. Keep going.`;
  } else if (band === "ready") {
    reason = "You're consistently above the pass mark. Keep it up.";
  } else {
    reason = "Almost there — a few more strong sessions will push you over.";
  }

  return { score, band, reason, recentAvgPct: recent.length ? Math.round(recentAvg) : null, trendPct: Math.round(trend) };
}
```

Weights: perf 50 / trend 15 / topics 20 / volume 10 / habit 5 (sum 100).

## 3. Dashboard UI
File: `src/routes/_authenticated/dashboard.tsx`.

- Replace the "Avg score" `StatCard` in the top stats row with a new `<ReadinessCard />` that spans the same slot (still 3-column grid).
- Circular gauge: inline SVG (no new deps). 120px, stroke 12, arc from 0→score/100 * 360°, color driven by band (`text-emerald-500` / `text-amber-500` / `text-rose-500`, using existing tokens).
- Center: big score number, "/ 100" subscript.
- Below gauge: band pill ("Ready" / "Almost there" / "Not ready yet") + reason line in `text-muted-foreground`.
- Header: "Exam-day readiness (estimate)" with an info tooltip explaining weights.
- Empty state (no completed exams): show `—` and "Take an exam to get your first readiness score."

Data via `useQuery(["readiness", category], () => getReadiness({ data: { category } }))`.

## 4. Keep existing behavior
- Weakness card and WeaknessCard still uses `getDashboardStats` for the pass-mark bar — unchanged.
- No routing, no schema, no auth changes.

## Files
- new: `src/lib/readiness.ts`
- edit: `src/lib/dashboard.functions.ts` (add `getReadiness`)
- edit: `src/routes/_authenticated/dashboard.tsx` (replace Avg score tile)

## Out of scope
- Scheduled exam date input (used as `daysUntilExam` weight) — can add later behind a settings field.
- Persisting readiness history for trend charts.
