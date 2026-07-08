/**
 * Client-callable GHL sync helpers. These wrap the server-only ghl.server
 * client and are safe to import from route/component code (only handler
 * bodies ship server-side).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Called from the client after a successful signUp. Best-effort — swallows
 * errors so a CRM outage never breaks signup.
 */
export const syncSignupToGhl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { syncToGhl } = await import("./ghl.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const email = userRes?.user?.email;
      if (!email) return { ok: false, reason: "no_email" };
      const meta = (userRes.user?.user_metadata ?? {}) as Record<string, unknown>;
      const name = (meta.display_name as string) || (meta.full_name as string) || undefined;
      await syncToGhl({
        email,
        name,
        tags: ["passpal-signup"],
        customFields: { passpal_last_activity_at: new Date().toISOString() },
        source: "PassPal signup",
      });
      return { ok: true };
    } catch (e) {
      console.error("[ghl] syncSignupToGhl error", e);
      return { ok: false, reason: "threw" };
    }
  });
