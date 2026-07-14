import { createFileRoute } from "@tanstack/react-router";

/**
 * Nightly GHL sync trigger. Called by pg_cron with an `x-cron-secret`
 * header. Verifies the shared secret, then runs the full sync.
 */
export const Route = createFileRoute("/api/public/hooks/ghl-nightly-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-secret") ?? "";
        const expected = process.env.CRON_SHARED_SECRET;
        if (!expected) {
          return new Response("Server not configured", { status: 500 });
        }
        // Constant-time compare.
        const a = new TextEncoder().encode(provided);
        const b = new TextEncoder().encode(expected);
        let equal = a.length === b.length;
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          equal = equal && a[i % a.length] === b[i % b.length];
        }
        if (!equal || a.length !== b.length) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { runNightlyGhlSync } = await import("@/lib/ghl-cron.server");
        const summary = await runNightlyGhlSync();
        return Response.json(summary);
      },
    },
  },
});
