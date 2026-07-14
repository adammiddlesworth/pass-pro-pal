import { createFileRoute } from "@tanstack/react-router";

/**
 * Nightly GHL sync trigger. Called by pg_cron with the Supabase anon key
 * in the `apikey` header (canonical pattern for `/api/public/*` cron hooks
 * — see schedule-jobs guidance). Idempotent and safe to re-run.
 */
export const Route = createFileRoute("/api/public/hooks/ghl-nightly-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runNightlyGhlSync } = await import("@/lib/ghl-cron.server");
        const summary = await runNightlyGhlSync();
        return Response.json(summary);
      },
    },
  },
});
