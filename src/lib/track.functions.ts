import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORY_PRODUCT_IDS } from "./exams.functions";

export type TrackId = "real_estate" | "life_health_insurance";

export type ActiveTrackResult = {
  track: TrackId | null;
  locked: boolean; // true if the user has a purchase and can't switch
  hasFullAccess: boolean; // true if admin or owns the active track
};

// Owned track (if any) takes precedence; otherwise the stored preference.
export const getActiveTrack = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActiveTrackResult> => {
    const { supabase, userId } = context;

    // Admins can freely switch tracks regardless of purchases.
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("active_track")
      .eq("id", userId)
      .maybeSingle();
    const storedTrack = (profile?.active_track as TrackId | null) ?? null;

    if (isAdmin) {
      return { track: storedTrack, locked: false, hasFullAccess: true };
    }

    const { data: purchases } = await supabase
      .from("purchases")
      .select("product_id")
      .eq("user_id", userId)
      .eq("status", "completed");

    const productToTrack = new Map(
      Object.entries(CATEGORY_PRODUCT_IDS).map(([k, v]) => [v, k as TrackId])
    );
    const owned = (purchases || [])
      .map((p: any) => productToTrack.get(p.product_id))
      .filter(Boolean) as TrackId[];

    if (owned.length > 0) {
      const track = owned[0];
      return { track, locked: true, hasFullAccess: true };
    }

    return {
      track: storedTrack,
      locked: false,
      hasFullAccess: storedTrack ? owned.includes(storedTrack) : false,
    };
  });



export const setActiveTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { track: TrackId }) => {
    if (data.track !== "real_estate" && data.track !== "life_health_insurance") {
      throw new Error("Invalid track");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ active_track: data.track })
      .eq("id", context.userId);
    if (error) throw error;

    // Best-effort GHL sync.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { syncToGhl } = await import("@/lib/ghl.server");
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const email = userRes?.user?.email;
      if (email) {
        await syncToGhl({
          email,
          tags: [`track-${data.track}`],
          customFields: {
            passpal_track: data.track,
            passpal_last_activity_at: new Date().toISOString(),
          },
          source: "PassPal track select",
        });
      }
    } catch (e) {
      console.error("[ghl] track sync error", e);
    }

    return { ok: true };
  });
