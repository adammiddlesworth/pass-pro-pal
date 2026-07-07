## Goal
Refit the readiness feature to your exact input contract. You pasted the data shape but not the function body, so I'll define `calculateReadiness(input)` against this shape and update `getReadiness` to build the input in this exact form.

## Input contract (authoritative)
```ts
{
  passMark: number,          // %, per-category pass threshold
  totalTopics: number,       // total topics in the blueprint
  recentExams: { score: number }[],  // OLDEST → NEWEST, up to last 8
  topics: { name: string; score: number }[],  // only practiced topics
}
```

## calculateReadiness (rewrite in `src/lib/readiness.ts`)
Deterministic 0–100 score with 5 components, tuned to `passMark`:

- **Recent performance (45%)** — mean of last up to 8 `recentExams.score`, mapped so `passMark` → 60 pts and 100 → 100 pts (below passMark scales down to 0 at passMark-30).
- **Trend (15%)** — mean(last 3) − mean(previous 3). `+10` → 100, `−10` → 0, clamped.
- **Topic mastery (20%)** — fraction of `topics` with `score ≥ passMark`, weighted by coverage: `(strong / totalTopics) * 100`. Practicing more topics counts; unpracticed topics count as weak.
- **Weakest-topic drag (15%)** — 100 minus penalty for the lowest practiced `topics.score` below `passMark`. Above passMark → 100.
- **Consistency (5%)** — 100 − stddev of `recentExams.score`, clamped 0–100.

Weighted sum → round → 0–100.

Bands: `≥80 "Ready"` (green), `65–79 "Almost there"` (amber), `<65 "Not ready yet"` (red).

Reason line priority:
1. `recentExams.length === 0` → "Take an exam to get your first readiness score."
2. `recentExams.length < 3` → "Take N more exams to sharpen this estimate."
3. Weakest practiced topic with `score < passMark` → "{name} is your weakest topic ({score}%). Focus here next."
4. Coverage `< 50%` of `totalTopics` practiced → "You've only practiced X of {totalTopics} topics. Broaden coverage."
5. Trend `< -5` → "Recent scores dropped {n}%. Slow down and review."
6. Band `ready` → "Consistently above the {passMark}% pass mark. Keep it up."
7. Fallback → "Almost there — a few more strong sessions will push you over."

Return:
```ts
{
  score, band, reason,
  recentAvg: number|null,
  trend: number|null,
  weakestTopic: { name, score } | null,
  topicsPracticed: number,
  totalTopics: number,
}
```

## getReadiness server fn (edit `src/lib/dashboard.functions.ts`)
Reshape existing aggregation to produce the exact input:
- `passMark`: 70 for now (single value per category; add per-category override later if needed).
- `totalTopics`: `getTopicsForCategory(category).length` minus the "mixed" and "final-exam-practice" pseudo-topics.
- `recentExams`: last 8 completed attempts in category, REVERSED to oldest→newest, `{ score: pct }`.
- `topics`: keep current per-topic aggregation (via `user_answers → questions → exams → exam_tags`), filter to `total >= 5` answers, map to `{ name: label, score: pct }`. Drop "mixed" / "final-exam-practice" from the blueprint count and the topics array.

## Dashboard UI
`src/routes/_authenticated/dashboard.tsx` — no visual changes. The existing `ReadinessCard` already renders `score`, `band`, `reason`. Update only the field names it reads (`recentAvgPct` → `recentAvg`, `trendPct` → `trend`).

## Files
- edit: `src/lib/readiness.ts` (rewrite `calculateReadiness` to the pasted shape)
- edit: `src/lib/dashboard.functions.ts` (reshape input for `getReadiness`)
- edit: `src/routes/_authenticated/dashboard.tsx` (rename two fields)

## Not changing
- Gauge visuals, band thresholds, card placement.
- Weakness card, streak card, recent card, up-next.
- Database schema.
