
## Brand direction

From the uploaded logos, the PassPal brand is:
- **Primary green** ~ `#22c55e` (checkmark chat bubble)
- **Deep green** ~ `#0f7a4a` (back "P" mark)
- **Navy** ~ `#0a1a4a` (wordmark on light bg, and dark background variant)
- **White** for reversed marks

I'll treat green as the primary action color and navy as the anchor/text color, with white and a soft off-white for surfaces.

## What I'll do

1. **Upload logos as CDN assets** (via `lovable-assets`) — no binaries in the repo:
   - `logo-full-light.png` (user-uploads://1.png — color logo on white, for light UI)
   - `logo-full-dark.png` (user-uploads://4-2.png — color logo on navy, for dark sections)
   - `logo-mark-white.png` (user-uploads://2.png — white mark, for green/navy backgrounds)
   - `logo-full-green.png` (user-uploads://2-2.png — white on green, marketing)
   - Favicon source: crop from the mark; save as `public/favicon.png`, delete default `public/favicon.ico`, and update `<link rel="icon">` in `src/routes/__root.tsx`.

2. **Design tokens** (`src/styles.css`) — replace the current generic theme with PassPal palette:
   - `--primary` → PassPal green, `--primary-foreground` → white
   - `--accent` → deep green, `--secondary` → navy
   - `--background`, `--foreground`, `--muted`, `--border` retuned to complement
   - Add gradient token `--gradient-brand: linear-gradient(135deg, deep-green → primary-green)` for hero/CTA surfaces
   - Keep semantic tokens only — no hardcoded colors in components

3. **Navbar (`src/routes/__root.tsx`)**:
   - Replace the "PassPal" text with the full color logo (light variant), sized ~28px tall
   - Keep nav links; style active state in brand green

4. **Landing page (`src/routes/index.tsx`)**:
   - Hero uses the brand gradient as background with the reversed (white) logo mark as a decorative element
   - Track chooser cards get subtle brand-colored borders/accents (green for Real Estate, navy for Life & Health) so the two tracks feel visually distinct — extending the "stronger visual separation" direction from the previous turn
   - CTA buttons use primary green

5. **Auth page (`src/routes/auth.tsx`)** and **Checkout success page**: show the logo above the card

6. **Footer**: small logo mark + copyright in navy

## Technical section

- Assets created with `lovable-assets create --file /mnt/user-uploads/<file> --filename <name>.png > src/assets/<name>.png.asset.json`, imported as JSON in components
- Favicon: copy chosen mark to `public/favicon.png`, `rm public/favicon.ico`, update `links` in root route `head()`
- Color tokens stored as `oklch(...)` in `src/styles.css` under `:root`; no changes to `tailwind.config`
- No routing or database changes; this is purely presentation

## Not in this change

- The track-separation work from the previous turn (removing the bundle, splitting `/real-estate` and `/life-health`) is still pending — I'll pick that back up next turn unless you want me to bundle it in.
