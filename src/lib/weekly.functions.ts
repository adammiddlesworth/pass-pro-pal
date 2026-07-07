import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

function getPublicClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// ISO week number (1-53), useful for display.
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export type WeeklyMixPayload = {
  mixId: string;
  weekStart: string; // ISO date
  weekNumber: number;
  questions: any[];
};

// Public read — current week's mix (falls back to most recent if not yet built).
export const getCurrentWeeklyMix = createServerFn({ method: "GET" }).handler(
  async (): Promise<WeeklyMixPayload | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: mix, error } = await supabaseAdmin
      .from("weekly_mixes")
      .select("id, week_start")
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!mix) return null;

    const { data: rows, error: qerr } = await supabaseAdmin
      .from("weekly_mix_questions")
      .select("order_index, questions(*, answers(*))")
      .eq("mix_id", mix.id)
      .order("order_index", { ascending: true });
    if (qerr) throw qerr;

    const questions = (rows || [])
      .map((r: any) => r.questions)
      .filter(Boolean);

    return {
      mixId: mix.id,
      weekStart: mix.week_start,
      weekNumber: isoWeekNumber(new Date(mix.week_start + "T00:00:00Z")),
      questions,
    };
  }
);

// Auth'd — access + best-of-week stats for the current mix.
export type WeeklyMixStatus = {
  hasAccess: boolean;
  mixId: string | null;
  bestScore: number | null;
  attemptsThisWeek: number;
  lastAttemptAt: string | null;
};

export const getWeeklyMixStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WeeklyMixStatus> => {
    const { supabase, userId } = context;

    // Any completed purchase unlocks the weekly challenge.
    const { data: purchases } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .limit(1);

    // Admins get access automatically.
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    const hasAccess = !!isAdmin || (purchases?.length ?? 0) > 0;

    const { data: mix } = await supabase
      .from("weekly_mixes")
      .select("id")
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!mix) {
      return { hasAccess, mixId: null, bestScore: null, attemptsThisWeek: 0, lastAttemptAt: null };
    }

    const { data: attempts } = await supabase
      .from("user_attempts")
      .select("score, total, completed_at")
      .eq("user_id", userId)
      .eq("weekly_mix_id", mix.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    let bestPct: number | null = null;
    let lastAttemptAt: string | null = null;
    for (const a of attempts || []) {
      if (a.total && a.score !== null && a.score !== undefined) {
        const pct = Math.round((a.score / a.total) * 100);
        if (bestPct === null || pct > bestPct) bestPct = pct;
      }
      if (!lastAttemptAt && a.completed_at) lastAttemptAt = a.completed_at;
    }

    return {
      hasAccess,
      mixId: mix.id,
      bestScore: bestPct,
      attemptsThisWeek: attempts?.length ?? 0,
      lastAttemptAt,
    };
  });

// Auth'd — start an attempt on the current mix (gated).
export const startWeeklyAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Gate: any completed purchase, or admin.
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      const { data: purchases } = await supabase
        .from("purchases")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .limit(1);
      if (!purchases || purchases.length === 0) {
        throw new Error("Weekly challenge is a paid feature.");
      }
    }

    const { data: mix } = await supabase
      .from("weekly_mixes")
      .select("id")
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!mix) throw new Error("No weekly mix available yet.");

    const { count } = await supabase
      .from("weekly_mix_questions")
      .select("*", { count: "exact", head: true })
      .eq("mix_id", mix.id);

    const { data: attempt, error } = await supabase
      .from("user_attempts")
      .insert({
        user_id: userId,
        exam_id: null,
        weekly_mix_id: mix.id,
        total: count ?? 0,
        attempt_type: "weekly",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;

    return { attemptId: attempt.id, mixId: mix.id };
  });
