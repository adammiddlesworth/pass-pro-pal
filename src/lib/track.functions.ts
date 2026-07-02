import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORY_PRODUCT_IDS } from "./exams.functions";

export type TrackId = "real_estate" | "life_health_insurance";

export type ActiveTrackResult = {
  track: TrackId | null;
  locked: boolean; // true if the user has a purchase and can't switch
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
      return { track: storedTrack, locked: false };
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
      return { track: owned[0], locked: true };
    }

    return { track: storedTrack, locked: false };
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
    return { ok: true };
  });
