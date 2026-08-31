/**
 * Nightly sync — pushes per-user stats and segmentation tags into
 * GoHighLevel. Server-only. Invoked by pg_cron via
 * /api/public/hooks/ghl-nightly-sync and by an admin "Run now" button.
 */

import { STUDY_TIME_TARGET_HOURS, calculateReadiness } from "@/lib/readiness";
import { computeAttemptSeconds } from "@/lib/utils";
import { getTopicsForCategory } from "@/lib/topics";

// Users idle longer than this aren't sent to GHL each night — reduces API
// volume. Increase if you want to touch dormant leads too.
const ACTIVE_WINDOW_DAYS = 90;
const PSEUDO_TOPICS = new Set(["mixed", "final-exam-practice"]);
const PASS_MARK = 70;

export type GhlSyncError = { user_id: string; email: string | null; error: string };

type SyncSummary = {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  durationMs: number;
};

export type SyncUserResult =
  | { ok: true; email: string | null }
  | { ok: false; email: string | null; error: string };

const MAX_ERRORS_STORED = 100;

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

function activityTags(lastActivity: Date | null): string[] {
  if (!lastActivity) return ["passpal-inactive-60d"];
  const days = daysBetween(new Date(), lastActivity);
  if (days <= 7) return ["passpal-active-7d", "passpal-active-30d"];
  if (days <= 30) return ["passpal-active-30d"];
  if (days <= 60) return ["passpal-inactive-30d"];
  return ["passpal-inactive-60d"];
}

function streakTags(current: number): string[] {
  const tags: string[] = [];
  if (current >= 30) tags.push("passpal-streak-30");
  else if (current >= 14) tags.push("passpal-streak-14");
  else if (current >= 7) tags.push("passpal-streak-7");
  else if (current >= 3) tags.push("passpal-streak-3");
  return tags;
}

function readinessTags(score: number): string[] {
  if (score >= 80) return ["passpal-readiness-ready"];
  if (score >= 50) return ["passpal-readiness-mid"];
  return ["passpal-readiness-low"];
}

function testDateTags(testDate: string | null): {
  tags: string[];
  daysToTest: number | null;
} {
  if (!testDate) return { tags: [], daysToTest: null };
  const t = new Date(testDate);
  const days = daysBetween(t, new Date());
  const tags = ["passpal-test-date-set"];
  if (days >= 0 && days <= 7) tags.push("passpal-test-within-7d", "passpal-test-within-30d");
  else if (days >= 0 && days <= 30) tags.push("passpal-test-within-30d");
  return { tags, daysToTest: days };
}

/**
 * Compute + push GHL payload for a single user. Best-effort: any error is
 * logged and swallowed. Returns whether it succeeded so the caller can tally.
 */
export async function syncUserToGhl(userId: string): Promise<boolean> {
  const r = await syncUserToGhlDetailed(userId);
  return r.ok;
}

/**
 * Detailed variant that returns the GHL error string on failure so the
 * caller (nightly runner) can persist per-contact failures.
 */
export async function syncUserToGhlDetailed(
  userId: string,
): Promise<SyncUserResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const {
    upsertContact,
    reconcilePasspalTags,
  } = await import("@/lib/ghl.server");

  let email: string | null = null;
  try {
    // Auth user (email + last sign-in from auth.users).
    const { data: userRes, error: userErr } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !userRes?.user) {
      const msg = userErr?.message ?? "getUserById returned no user";
      console.error("[ghl-cron] getUserById failed", userId, userErr);
      return { ok: false, email: null, error: msg };
    }
    const authUser = userRes.user;
    email = authUser.email ?? null;
    if (!email) return { ok: false, email: null, error: "no_email" };

    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const displayNameFromMeta =
      (meta.display_name as string) || (meta.full_name as string) || null;
    const lastSignInAt = authUser.last_sign_in_at
      ? new Date(authUser.last_sign_in_at)
      : null;

    // Profile.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, active_track, test_date")
      .eq("id", userId)
      .maybeSingle();

    const displayName = profile?.display_name || displayNameFromMeta || null;
    const activeTrack = (profile as any)?.active_track ?? null;
    const testDate = (profile as any)?.test_date ?? null;

    // Purchases (paid access).
    const { data: purchaseRows } = await supabaseAdmin
      .from("purchases")
      .select("product_id, status")
      .eq("user_id", userId)
      .eq("status", "completed");
    const paidProductIds = ((purchaseRows || []) as any[]).map(
      (p) => p.product_id as string,
    );
    const isPaid = paidProductIds.length > 0;

    // Streak.
    const { data: streak } = await supabaseAdmin
      .from("user_streaks")
      .select("current_streak, best_streak, last_active_date")
      .eq("user_id", userId)
      .maybeSingle();

    // Attempts (used for study time, readiness, accuracy).
    const { data: attemptRows } = await supabaseAdmin
      .from("user_attempts")
      .select(
        "started_at, completed_at, score, total, exam_id, exams(category, question_count, is_timed_final, time_limit_minutes)",
      )
      .eq("user_id", userId);

    const attempts = (attemptRows || []) as any[];

    // Study seconds — all attempts, category-agnostic (matches
    // getStudyTime.total_seconds shown on the dashboard).
    let studySeconds = 0;
    for (const r of attempts) {
      if (!r.completed_at) continue;
      studySeconds += computeAttemptSeconds({
        started_at: r.started_at,
        completed_at: r.completed_at,
        exam_id: r.exam_id,
        question_count: r.exams?.question_count ?? null,
        is_timed_final: r.exams?.is_timed_final ?? null,
        time_limit_minutes: r.exams?.time_limit_minutes ?? null,
      });
    }

    // 30-day accuracy (all categories).
    const monthAgo = Date.now() - 30 * 86_400_000;
    let sumPct = 0;
    let countPct = 0;
    for (const r of attempts) {
      if (!r.completed_at) continue;
      if (new Date(r.completed_at).getTime() < monthAgo) continue;
      if (r.total > 0 && r.score !== null) {
        sumPct += (r.score / r.total) * 100;
        countPct += 1;
      }
    }
    const accuracyPct = countPct > 0 ? Math.round(sumPct / countPct) : null;

    // Readiness — computed against the user's active track when set, else
    // the track with the most attempts.
    const category = activeTrack ?? pickPrimaryCategory(attempts);
    const readinessScore = category
      ? await computeReadinessForCategory(supabaseAdmin, userId, category, studySeconds)
      : null;

    // Last activity = most recent of completed attempt, streak update, sign-in.
    const lastActivity = pickLatestDate([
      lastSignInAt,
      streak?.last_active_date ? new Date(streak.last_active_date) : null,
      ...attempts
        .map((a: any) => (a.completed_at ? new Date(a.completed_at) : null))
        .filter(Boolean),
    ]);

    // Skip fully-idle users beyond the active window (never signed in in
    // ACTIVE_WINDOW_DAYS AND no attempts). Keeps GHL API volume low.
    if (
      lastActivity &&
      daysBetween(new Date(), lastActivity) > ACTIVE_WINDOW_DAYS
    ) {
      return { ok: false, email, error: "skipped_inactive" };
    }

    // ---------- Build payload ----------
    const testInfo = testDateTags(testDate);
    const desiredPasspalTags = [
      "passpal-signup",
      ...(activeTrack ? [`track-${activeTrack}`] : []),
      ...activityTags(lastActivity),
      ...streakTags(streak?.current_streak ?? 0),
      ...(readinessScore !== null ? readinessTags(readinessScore) : []),
      ...testInfo.tags,
      ...(isPaid
        ? ["passpal-paid", ...paidProductIds.map((p) => `passpal-paid-${p}`)]
        : ["passpal-free"]),
    ];

    const parts = (displayName || "").split(/\s+/).filter(Boolean);
    const firstName = parts[0] || undefined;
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;

    const customFields: Record<string, string | number | null> = {
      passpal_last_login_at: lastSignInAt ? lastSignInAt.toISOString() : null,
      passpal_last_activity_at: lastActivity ? lastActivity.toISOString() : null,
      passpal_current_streak: streak?.current_streak ?? 0,
      passpal_best_streak: streak?.best_streak ?? 0,
      passpal_study_hours: Number((studySeconds / 3600).toFixed(1)),
      passpal_accuracy_pct: accuracyPct ?? 0,
      passpal_readiness_score: readinessScore ?? 0,
      passpal_track: activeTrack ?? "",
      passpal_test_date: testDate ?? "",
      passpal_days_to_test: testInfo.daysToTest ?? "",
    };

    const upsertResult = await upsertContact({
      email,
      name: displayName || undefined,
      firstName,
      lastName,
      tags: desiredPasspalTags,
      customFields,
      source: "PassPal nightly sync",
    });

    if (!upsertResult.ok) {
      console.error(`[ghl-cron] upsert failed for ${email}: ${upsertResult.error}`);
      await supabaseAdmin
        .from("profiles")
        .update({
          ghl_sync_status: "failed",
          ghl_last_error: upsertResult.error,
          ghl_last_synced_at: new Date().toISOString(),
        } as any)
        .eq("id", userId);
      return { ok: false, email, error: upsertResult.error };
    }

    const nowIso = new Date().toISOString();
    const profileUpdate: Record<string, unknown> = {
      ghl_sync_status: "synced",
      ghl_contact_id: upsertResult.contactId,
      ghl_last_error: null,
      ghl_last_synced_at: nowIso,
    };
    // Mark first-time synced so the on-signup path doesn't re-send.
    if (!(profile as any)?.ghl_synced_at) {
      profileUpdate.ghl_synced_at = nowIso;
    }
    await supabaseAdmin
      .from("profiles")
      .update(profileUpdate as any)
      .eq("id", userId);

    // Remove any stale passpal-* tags that no longer apply.
    await reconcilePasspalTags(upsertResult.contactId, desiredPasspalTags);
    return { ok: true, email };
  } catch (e) {
    console.error("[ghl-cron] syncUserToGhl error", userId, e);
    return { ok: false, email, error: e instanceof Error ? e.message : String(e) };
  }
}

function pickLatestDate(dates: Array<Date | null | undefined>): Date | null {
  let latest: Date | null = null;
  for (const d of dates) {
    if (!d) continue;
    if (!latest || d.getTime() > latest.getTime()) latest = d;
  }
  return latest;
}

function pickPrimaryCategory(attempts: any[]): string | null {
  const counts = new Map<string, number>();
  for (const a of attempts) {
    const c = a.exams?.category;
    if (!c) continue;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [c, n] of counts) {
    if (n > bestCount) {
      bestCount = n;
      best = c;
    }
  }
  return best;
}

async function computeReadinessForCategory(
  admin: any,
  userId: string,
  category: string,
  studySecondsAllTracks: number,
): Promise<number | null> {
  try {
    const { data: catAttempts } = await admin
      .from("user_attempts")
      .select("score, total, completed_at, exams!inner(category)")
      .eq("user_id", userId)
      .eq("exams.category", category)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(8);

    const recentExams = ((catAttempts || []) as any[])
      .filter((a) => a.total > 0 && a.score !== null)
      .map((a) => ({ score: (a.score / a.total) * 100 }))
      .reverse();

    const { data: answerRows } = await admin
      .from("user_answers")
      .select(
        "is_correct, questions!inner(exam_id, exams!inner(category, exam_tags(tag)))",
      )
      .eq("questions.exams.category", category);

    const topicAgg = new Map<string, { correct: number; total: number }>();
    for (const r of (answerRows || []) as any[]) {
      const tags: string[] = (r.questions?.exams?.exam_tags || []).map(
        (t: any) => t.tag,
      );
      for (const tag of tags) {
        if (PSEUDO_TOPICS.has(tag)) continue;
        const s = topicAgg.get(tag) ?? { correct: 0, total: 0 };
        s.total += 1;
        if (r.is_correct) s.correct += 1;
        topicAgg.set(tag, s);
      }
    }
    const topicDefs = getTopicsForCategory(category).filter(
      (t) => !PSEUDO_TOPICS.has(t.slug),
    );
    const totalTopics = Math.max(1, topicDefs.length);
    const practicedTopics = topicDefs
      .map((t) => {
        const s = topicAgg.get(t.slug);
        if (!s || s.total < 5) return null;
        return { name: t.label, score: (s.correct / s.total) * 100 };
      })
      .filter(Boolean) as { name: string; score: number }[];

    const { data: finalExams } = await admin
      .from("exams")
      .select("id")
      .eq("category", category)
      .eq("status", "published")
      .eq("is_timed_final", true);
    const hasTimedFinal = !!(finalExams && finalExams.length > 0);
    let passedTimedFinal = false;
    if (hasTimedFinal) {
      const finalIds = (finalExams as any[]).map((e) => e.id);
      const { data: fa } = await admin
        .from("user_attempts")
        .select("score, total")
        .eq("user_id", userId)
        .in("exam_id", finalIds)
        .not("completed_at", "is", null);
      passedTimedFinal = ((fa || []) as any[]).some(
        (a) => a.total > 0 && (a.score / a.total) * 100 >= PASS_MARK,
      );
    }

    const res = calculateReadiness({
      passMark: PASS_MARK,
      totalTopics,
      recentExams,
      topics: practicedTopics,
      passedTimedFinal: hasTimedFinal ? passedTimedFinal : true,
      hasTimedFinal,
      studySeconds: studySecondsAllTracks,
    });
    return res.readiness;
  } catch (e) {
    console.error("[ghl-cron] readiness compute error", userId, category, e);
    return null;
  }
}

/**
 * Run the nightly sync across all users who signed in or completed an
 * attempt within ACTIVE_WINDOW_DAYS. Batched to stay under GHL rate limits.
 */
export async function runNightlyGhlSync(
  trigger: "cron" | "manual" = "cron",
): Promise<SyncSummary> {
  const startedAt = new Date();
  const started = Date.now();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const summary: SyncSummary = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
  };
  const errors: GhlSyncError[] = [];

  const cutoff = new Date(
    Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000,
  ).toISOString();

  const userIds = new Set<string>();

  // Users active by attempt.
  const { data: attemptUsers } = await supabaseAdmin
    .from("user_attempts")
    .select("user_id")
    .gte("started_at", cutoff);
  for (const r of (attemptUsers || []) as any[]) {
    if (r.user_id) userIds.add(r.user_id);
  }

  // Every profile that has never been synced (backfill new signups).
  const { data: unsyncedProfiles } = await supabaseAdmin
    .from("profiles")
    .select("id, ghl_synced_at")
    .is("ghl_synced_at", null);
  for (const p of (unsyncedProfiles || []) as any[]) {
    userIds.add(p.id);
  }

  // Users active by streak.
  const streakCutoff = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const { data: streakUsers } = await supabaseAdmin
    .from("user_streaks")
    .select("user_id, last_active_date")
    .gte("last_active_date", streakCutoff);
  for (const r of (streakUsers || []) as any[]) {
    if (r.user_id) userIds.add(r.user_id);
  }

  const ids = Array.from(userIds);
  console.log(`[ghl-cron] starting nightly sync for ${ids.length} users`);

  // Bounded-concurrency worker pool. GHL rate-limits per location, and each
  // user costs up to 3 API calls, so keep the in-flight count low instead of
  // firing wide parallel batches.
  const CONCURRENCY = 5;
  const PER_USER_DELAY_MS = 120;
  let cursor = 0;

  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++]!;
      const r = await syncUserToGhlDetailed(id);
      summary.processed += 1;
      if (r.ok) {
        summary.succeeded += 1;
      } else if (r.error === "skipped_inactive") {
        summary.skipped += 1;
      } else {
        summary.failed += 1;
        errors.push({ user_id: id, email: r.email, error: r.error });
      }
      await new Promise((res) => setTimeout(res, PER_USER_DELAY_MS));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, ids.length) }, () => worker()),
  );


  summary.durationMs = Date.now() - started;
  console.log(`[ghl-cron] nightly sync complete`, summary);

  // Persist the run row (best-effort — never let a logging failure escape).
  try {
    const truncated = errors.length > MAX_ERRORS_STORED;
    await supabaseAdmin.from("ghl_sync_runs" as any).insert({
      trigger,
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      processed: summary.processed,
      succeeded: summary.succeeded,
      failed: summary.failed,
      skipped: summary.skipped,
      duration_ms: summary.durationMs,
      errors: truncated ? errors.slice(0, MAX_ERRORS_STORED) : errors,
      truncated,
    } as any);
  } catch (e) {
    console.error("[ghl-cron] failed to persist sync run", e);
  }

  return summary;
}
