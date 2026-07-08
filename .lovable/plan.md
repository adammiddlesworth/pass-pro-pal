## Profile Settings Page

Add `/settings` under the authenticated layout so users can manage their account.

### Route
- Create `src/routes/_authenticated/settings.tsx` rendering a Settings page with three sections in cards.
- Add a "Settings" link in the dashboard header/user menu.

### Sections

1. **Profile**
   - Display name (editable text input)
   - Email (read-only, from `auth.user.email`)
   - Save button → calls new `updateProfile` server fn

2. **Study preferences**
   - Active track (Real Estate / Life & Health Insurance) — dropdown
   - Test date — date picker (reuses existing `updateTestDate`)

3. **Account**
   - Change password → calls `supabase.auth.updateUser({ password })` with confirm field
   - Sign out button (cancel queries, clear cache, signOut, navigate to `/auth`)

### Server functions (`src/lib/profile.functions.ts`)
Extend existing file:
- `getProfile` — returns `{ display_name, active_track, test_date, email }` for current user
- `updateProfile` — updates `display_name` and `active_track` on `profiles` (Zod-validated: display_name trim 1–80, active_track enum)

Both use `requireSupabaseAuth`. Best-effort GHL sync on profile update (display name → contact firstName/lastName; track → existing `passpal_track` field + `track-{x}` tag), matching the pattern in `track.functions.ts`.

### UI
Uses existing shadcn `Card`, `Input`, `Label`, `Button`, `Select`, plus `sonner` toasts for save feedback. Loading state via `useSuspenseQuery` on `getProfile`.

No schema changes — all fields already exist on `profiles`.