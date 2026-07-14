## Goal

Fold total study time into the readiness score so a user isn't marked "Ready" until they've put in real hours. Target: **30 hours of studying = full credit** on this dimension.

## Approach

Add a fifth component to `calculateReadiness` in `src/lib/readiness.ts`: **Study time (hours)**, alongside the existing Recent (30%), Coverage (35%), Weak spots (20%), Consistency (15%).

### New weighting

- Recent performance: 25%
- Coverage: 25%
- Weak spots: 20%
- Consistency: 10%
- **Study time: 20%** (new)

Study score = `min(100, studyHours / 30 * 100)` — linear ramp, saturates at 30h.

### New hard cap

Mirror the coverage/final-exam gate pattern: if `studyHours < 30`, cap readiness at **79** (below the "Ready" threshold of 80). Reason copy: "Put in more study time — you're at Xh of 30h."

Cap precedence (first match wins for the reason):
1. Timed final not passed (existing)
2. Coverage not met (existing)
3. **Study time under 30h (new)**

### Wiring

`calculateReadiness` gains a `studySeconds` input. Every caller passes it:

- `src/lib/dashboard.functions.ts` — already computes `study_seconds_total` for the dashboard card; pass it into the readiness call.
- Any other caller (diagnostic previews, admin) — pass `studySeconds: 0` if unknown so behavior is unchanged for ad-hoc calls, OR compute it. I'll audit callers during implementation and pass real seconds wherever the value is already at hand; default to `0` only for true preview/diagnostic contexts (matching the existing `passedTimedFinal` default pattern).

### Files

- `src/lib/readiness.ts` — add `studySeconds` input, study-time component, cap, weighting change, reason copy, breakdown field.
- `src/lib/dashboard.functions.ts` — pass `studySeconds` into `calculateReadiness`.
- Audit and update any other `calculateReadiness` call sites found during implementation.

No UI changes required — the readiness number and reason string update automatically wherever they render.

## Verification

1. User with 0h study, otherwise strong scores → readiness capped at 79, reason mentions study time.
2. User with 30h+ study and strong scores → can reach ≥80 ("Ready").
3. Existing coverage/final-exam caps still fire when they should.
