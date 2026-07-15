/**
 * Client-callable GHL sync helpers. These wrap the server-only ghl.server
 * client and are safe to import from route/component code (only handler
 * bodies ship server-side).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Called from the email/password signup path after Supabase returns a
 * session. Best-effort — swallows errors so a CRM outage never breaks
 * signup. Also marks profiles.ghl_synced_at so the on-login sync doesn't
 * re-fire.
 */
export const syncSignupToGhl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { syncToGhl } = await import("./ghl.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(
        context.userId,
      );
      const email = userRes?.user?.email;
      if (!email) return { ok: false, reason: "no_email" };
      const meta = (userRes.user?.user_metadata ?? {}) as Record<string, unknown>;
      const name =
        (meta.display_name as string) ||
        (meta.full_name as string) ||
        undefined;
      const result = await syncToGhl({
        email,
        name,
        tags: ["passpal-signup"],
        customFields: { passpal_last_activity_at: new Date().toISOString() },
        source: "PassPal signup",
      });
      if (result.ok) {
        await supabaseAdmin
          .from("profiles")
          .update({ ghl_synced_at: new Date().toISOString() } as any)
          .eq("id", context.userId);
      }
      return { ok: true };
    } catch (e) {
      console.error("[ghl] syncSignupToGhl error", e);
      return { ok: false, reason: "threw" };
    }
  });

/**
 * Called from the client on every SIGNED_IN event. Deduped server-side via
 * profiles.ghl_synced_at — first successful sync stamps that column, and
 * subsequent logins short-circuit. Ongoing stat updates are handled by the
 * nightly cron.
 */
export const syncCurrentUserToGhl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("ghl_synced_at")
        .eq("id", context.userId)
        .maybeSingle();
      if ((profile as any)?.ghl_synced_at) {
        return { ok: true, skipped: true };
      }
      const { syncUserToGhl } = await import("./ghl-cron.server");
      const ok = await syncUserToGhl(context.userId);
      return { ok, skipped: false };
    } catch (e) {
      console.error("[ghl] syncCurrentUserToGhl error", e);
      return { ok: false, reason: "threw" };
    }
  });

/**
 * Admin-only trigger for the full nightly sync. Runs on the server so the
 * admin can smoke-test without waiting for cron.
 */
export const runGhlSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");
    const { runNightlyGhlSync } = await import("./ghl-cron.server");
    return runNightlyGhlSync("manual");
  });

/**
 * Admin-only: sync a single user to GHL on demand (per-row button + retry).
 */
export const syncOneUserToGhl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");
    const { syncUserToGhlDetailed } = await import("./ghl-cron.server");
    return syncUserToGhlDetailed(data.userId);
  });

export type GhlSyncRunRow = {
  id: string;
  trigger: "cron" | "manual" | "signin";
  started_at: string;
  finished_at: string | null;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  errors: Array<{ user_id: string; email: string | null; error: string }>;
  truncated: boolean;
};

/**
 * Admin-only: last 20 GHL sync runs with per-contact errors.
 */
export const listGhlSyncRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ runs: GhlSyncRunRow[] }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");
    const { data, error } = await context.supabase
      .from("ghl_sync_runs" as any)
      .select(
        "id, trigger, started_at, finished_at, processed, succeeded, failed, skipped, duration_ms, errors, truncated",
      )
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { runs: (data ?? []) as unknown as GhlSyncRunRow[] };
  });
