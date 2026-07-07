## Goal
Swap in your exact `calculateReadiness` function verbatim and adapt the surrounding code to its return shape.

## Changes

### 1. `src/lib/readiness.ts` — replace body with your function
- Use your function exactly as pasted (JS translated to TS, no logic changes: same weights 40/20/25/15, same penalty multiplier 2, same bands 80/65, same reason priority).
- Export types for input/output:
  ```ts
  type ReadinessInput = { passMark: number; totalTopics: number;
    recentExams: { score: number }[]; topics: { name: string; score: number }[] };
  type ReadinessResult = {
    readiness: number;
    status: "Ready" | "Almost there" | "Not ready yet";
    color: "green" | "amber" | "red";
    reason: string;
    breakdown: { recent: number; coverage: number; weakSpotScore: number; consistency: number };
  };
  ```

### 2. `src/lib/dashboard.functions.ts` — `getReadiness` returns your shape
- Handler already builds `{ passMark, totalTopics, recentExams, topics }` — keep as is.
- Return type changes to the new `ReadinessResult`. Same wire data, no query changes.

### 3. `src/routes/_authenticated/dashboard.tsx` — `ReadinessCard` reads new fields
- Score value: `data.readiness` (was `data.score`).
- Band/label: `data.status` directly ("Ready" / "Almost there" / "Not ready yet") — no more mapping.
- Color: switch on `data.color` (`"green"` → emerald, `"amber"` → amber, `"red"` → rose) for gauge stroke, number color, and pill.
- Reason: `data.reason` (unchanged).
- Empty state: when `data.breakdown.recent === 0` and no topics practiced → show `—` and "Take an exam to get your first readiness score."
- Keep gauge visuals, layout, and card slot unchanged.

## Files
- edit: `src/lib/readiness.ts`
- edit: `src/lib/dashboard.functions.ts` (return type only)
- edit: `src/routes/_authenticated/dashboard.tsx` (field names + color mapping)

## Not changing
- Data aggregation queries, weights, thresholds, or reason logic (all defined by your pasted function).
- Weakness card, streak card, up-next, recent activity.
