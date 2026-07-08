import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const updateTestDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { date: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ test_date: data.date } as any)
      .eq("id", userId);
    if (error) throw error;
    return { ok: true, test_date: data.date };
  });

export type ProfileData = {
  display_name: string | null;
  active_track: "real_estate" | "life_health_insurance" | null;
  test_date: string | null;
  email: string | null;
};

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileData> => {
    const { supabase, userId, claims } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, active_track, test_date")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return {
      display_name: (data?.display_name as string | null) ?? null,
      active_track:
        (data?.active_track as ProfileData["active_track"]) ?? null,
      test_date: (data?.test_date as string | null) ?? null,
      email: (claims?.email as string | undefined) ?? null,
    };
  });

const updateProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(80, "Display name must be 80 characters or fewer"),
  active_track: z.enum(["real_estate", "life_health_insurance"]).nullable(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateProfileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        active_track: data.active_track,
      } as any)
      .eq("id", userId);
    if (error) throw error;

    // Best-effort GHL sync.
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { syncToGhl } = await import("@/lib/ghl.server");
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(
        userId
      );
      const email = userRes?.user?.email;
      if (email) {
        const parts = data.display_name.split(/\s+/);
        const firstName = parts[0] ?? "";
        const lastName = parts.slice(1).join(" ") || undefined;
        await syncToGhl({
          email,
          firstName,
          lastName,
          tags: data.active_track ? [`track-${data.active_track}`] : [],
          customFields: {
            ...(data.active_track
              ? { passpal_track: data.active_track }
              : {}),
            passpal_last_activity_at: new Date().toISOString(),
          },
          source: "PassPal profile update",
        });
      }
    } catch (e) {
      console.error("[ghl] profile sync error", e);
    }

    return { ok: true };
  });
