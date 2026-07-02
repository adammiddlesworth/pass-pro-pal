## Overview

Three changes:
1. **New `/dashboard`** — stats-focused, matching the mock (Up Next, stat cards, Daily streak, Weakness exam, Recent exams).
2. **Move the current dashboard UI** (track → topic → exam browser) to **`/exams`**, replacing the old exams list page.
3. **Single-track experience** — each user has one active track. Free users pick once on first visit; paid users are locked to what they bought. Nothing from the other track is ever shown.

---

## 1. Track selection (single-track UX)

Add `active_track` to `profiles` (`'real_estate' | 'life_health_insurance' | null`).

Resolution order on load:
1. If the user owns a track (from `purchases`), force `active_track` to that track.
2. Else if `active_track` is set, use it.
3. Else show a one-time full-page **"Choose your track"** picker (the current two-card chooser). Selection writes to `profiles.active_track`.

Track can be changed later from a small "Switch track" link in the header (only offered to free users; hidden once they've purchased).

Every dashboard/exams query is scoped to the active track — no cross-track content anywhere.

---

## 2. New `/dashboard` (stats)

Replaces the current dashboard. Layout mirrors the mock:

```text
Good morning, {name} 👋
Your dashboard
┌──────────────────────────────────────────────────────────┐
│ UP NEXT   {Topic} — Practice Exam N        [ ▶ Start ]  │
│           {question_count} questions · ~{est} min        │
└──────────────────────────────────────────────────────────┘
┌ Exams taken ┐ ┌ Avg score ┐ ┌ Questions answered ┐
│    18       │ │   74%     │ │   612 of 1,200     │
│ ↗ 3 this wk │ │ ↗ +6% mo  │ │                    │
└─────────────┘ └───────────┘ └────────────────────┘
┌ 🔥 Daily streak ─────────┐  ┌ ⚠ Weakness exam ─────────┐
│ 9 days · [✓✓✓✓✓✓T]      │  │ {Lowest topic}            │
│ Best: 14 · Keep going!   │  │ avg X% · pass 70%         │
│                          │  │ [Retake weakness exam]    │
│ Recent exams             │  └───────────────────────────┘
│ • Agency Law — 88% Today │
│ • Contracts — 71% Yest.  │
│ • Finance — 58% Jun 30   │
└──────────────────────────┘
```

### Up Next logic

Serves exams in the order defined in `src/lib/topics.ts` for the active track. Algorithm (new server fn `getUpNext`):

1. Walk topics in list order.
2. For each topic, load its published exams ordered by `exam_number` asc.
3. Return the first exam the user has **not completed** (no `user_attempts` row with `completed_at`). If they have an in-progress attempt on it, label the button "Resume".
4. If everything is complete, suggest the lowest-scoring exam to retake.

### Stats (server fn `getDashboardStats`)

From `user_attempts` / `user_answers` scoped to active track:
- `exams_taken` = count of completed attempts; `this_week` = last 7 days.
- `avg_score` = avg(`score / total`) over completed attempts; delta vs prior 30d.
- `questions_answered` = count of `user_answers` rows; `total` = sum of `question_count` across published exams in the track.

### Daily streak

New table `user_streaks(user_id pk, current_streak int, best_streak int, last_active_date date)` with RLS `auth.uid() = user_id`, GRANTs for `authenticated` + `service_role`. A server fn `touchStreak` runs whenever an attempt is submitted: if `last_active_date` = today → noop; = yesterday → increment; else → reset to 1. Widget shows the last 7 days as ticks/T (today).

### Weakness widget

Reuses existing weak-spots logic — lowest-scoring topic in the active track + top 3 lowest sub-areas, plus a button linking to `/review/{active_track}`. Hidden for free users (weak-spots is paid).

### Recent exams

Existing `getRecentActivity`, filtered to active track, capped at 3.

---

## 3. Move browser to `/exams`

- Delete current `src/routes/exams.index.tsx`.
- Rename `src/routes/_authenticated/dashboard.tsx` → `src/routes/_authenticated/exams.index.tsx` with these changes:
  - Remove the top-level track chooser (there's only one track now).
  - Page opens directly on the topic grid for the active track; breadcrumb collapses to `Topics / {Topic}`.
  - Search + topic filter behavior preserved.
- Update all internal links: header nav, "Browse all exams" CTAs, post-quiz "back to exams" → `/exams`.

---

## 4. Header / nav

- Signed-in nav: **Dashboard** (`/dashboard`) · **Exams** (`/exams`) · **Weak Spots** (paid only) · account menu.
- Show active-track badge next to the logo (e.g. "Real Estate"); free users get a "Switch" link, paid users don't.

---

## Files changed

- `supabase/migrations/*` — add `profiles.active_track`, create `user_streaks`, GRANTs, RLS, policies.
- `src/lib/dashboard.functions.ts` — add `getDashboardStats`, `getUpNext`, `getStreak`, `getActiveTrack`, `setActiveTrack`; scope `searchExams` / `getTopicCounts` / `getRecentActivity` to active track.
- `src/lib/attempts.functions.ts` (or existing quiz submit path) — call `touchStreak` on attempt completion.
- `src/routes/_authenticated/dashboard.tsx` — rewritten as stats dashboard.
- `src/routes/_authenticated/exams.index.tsx` — new, holds the old browser UI (topic grid + exam results), scoped to active track.
- `src/routes/exams.index.tsx` — deleted.
- `src/routes/_authenticated/select-track.tsx` — one-time picker (redirect target when `active_track` is null and user has no purchase).
- Header component — nav links + active-track badge.
- Any `<Link to="/exams">` / `to="/dashboard"` call sites updated.

## Out of scope (ask before adding)

- Estimated time on Up Next card ("~35 min") — will use a simple `question_count * 45s` unless you want a stored field.
- "Study plan" concept beyond the sequential Up Next.
- Changing track after purchase (locked by design — say the word if you want an override).
