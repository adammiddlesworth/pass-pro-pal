## Goal
Surface the `breakdown` object from `calculateReadiness` in the Readiness card so users can see what's driving their score, not just the headline number.

## Change

### `src/routes/_authenticated/dashboard.tsx` — extend `ReadinessCard`
Under the existing reason line, add a compact 4-metric breakdown row:

```
Recent 74   ·   Coverage 40   ·   Weak-spot 95   ·   Consistency 84
```

Layout:
- 2×2 grid on the card (fits the narrow tile), each cell shows label + value.
- Each value colored by threshold: `≥80` emerald, `≥65` amber, `<65` rose — same band logic as the headline, applied per metric so users see which pillar is dragging the score.
- Labels: "Recent", "Coverage", "Weak spots", "Consistency".
- Hidden when `hasData` is false (empty state stays clean).

No changes to `calculateReadiness`, `getReadiness`, or the gauge visuals.

## Files
- edit: `src/routes/_authenticated/dashboard.tsx`

## Not changing
- Function logic, weights, thresholds, or data fetch.
- Other cards.
