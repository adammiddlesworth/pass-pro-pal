## Hide diagnostic from paid users + strengthen the public funnel

### 1. Hide from paid users

On `src/routes/_authenticated/dashboard.tsx`, only render `<DiagnosticCard>` when the user does NOT have full access:

```tsx
{!trackInfo.hasFullAccess && (
  <div className="mt-6">
    <DiagnosticCard category={cat} />
  </div>
)}
```

`trackInfo.hasFullAccess` already comes from `getTrackInfo` (`src/lib/track.functions.ts`) and is true whenever the user has a completed purchase. No new data needed.

Also hide the diagnostic entry point from the header/nav for signed-in paid users (if one exists) using the same flag.

### 2. Dedicated public page for the free diagnostic

`/diagnostic/$category` already exists and already funnels through signup — keep that page as the diagnostic-taking surface. Add a new public picker at `/diagnostic` (`src/routes/diagnostic.index.tsx`) as the shareable "free diagnostic" landing page:

- Hero: "Free licensing exam diagnostic — see where you stand in 10 minutes."
- Two large cards, one per track (Real Estate, Life & Health Insurance), each linking to `/diagnostic/{category}`.
- Explains: free, no card required, personalized report at the end.
- Route-level `head()` with title/description/og:title/og:description for shareability.

### 3. Signup → diagnostic → report flow

Already wired on `/diagnostic/$category`:
- Unauth visitor sees "Create free account to start" → goes to `/auth?mode=signup&redirect=/diagnostic/{category}`.
- After signup, they land back on the page.

Tighten one thing: on return, auto-start the diagnostic instead of showing the intro card a second time. Add a `?autostart=1` search param that the signup CTA sets; when the page mounts authed and sees that flag, it calls `startDiagnostic` immediately (skipping the intro's "Start diagnostic" click).

After completion, the existing `ResultView` is the report — unchanged.

### 4. Landing-page entry point

On `src/routes/index.tsx` (public landing), add a prominent "Take the free diagnostic" CTA in the hero linking to `/diagnostic`. This is the primary funnel entry for non-paying visitors.

### Files touched

- `src/routes/_authenticated/dashboard.tsx` (gate `<DiagnosticCard>` on `!hasFullAccess`)
- `src/routes/__root.tsx` (hide any diagnostic nav link for paid users, if present)
- `src/routes/diagnostic.index.tsx` (new — public track picker)
- `src/routes/diagnostic.$category.tsx` (support `?autostart=1`)
- `src/routes/index.tsx` (add hero CTA to `/diagnostic`)

### Out of scope

- No schema changes.
- No changes to diagnostic scoring, GHL sync, or checkout.
