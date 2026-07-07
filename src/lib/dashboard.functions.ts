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

export type ExamSearchResult = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  question_count: number;
  exam_number: number | null;
  youtube_video_id: string | null;
  tags: string[];
};

export const searchExams = createServerFn({ method: "GET" })
  .inputValidator((data: { category: string; q?: string; topic?: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<ExamSearchResult[]> => {
    const supabase = getPublicClient();
    const limit = Math.min(data.limit ?? 30, 60);
    const q = (data.q ?? "").trim();
    const topic = (data.topic ?? "").trim();

    let topicExamIds: string[] | null = null;
    if (topic) {
      const { data: tagRows, error: tagErr } = await supabase
        .from("exam_tags")
        .select("exam_id")
        .eq("tag", topic);
      if (tagErr) throw tagErr;
      topicExamIds = (tagRows || []).map((r: any) => r.exam_id);
      if (topicExamIds.length === 0) return [];
    }

    let query = supabase
      .from("exams")
      .select(
        "id, slug, title, description, category, question_count, exam_number, youtube_video_id, exam_tags(tag)"
      )
      .eq("status", "published")
      .eq("category", data.category as any)
      .order("exam_number", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (topicExamIds) {
      query = query.in("id", topicExamIds);
    }

    if (q) {
      query = query.or(
        `title.ilike.%${q}%,description.ilike.%${q}%,slug.ilike.%${q}%`
      );
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    let results = (rows || []).map((r: any) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      category: r.category,
      question_count: r.question_count,
      exam_number: r.exam_number,
      youtube_video_id: r.youtube_video_id,
      tags: (r.exam_tags || []).map((t: any) => t.tag),
    }));

    if (q && !topic) {
      const { data: tagged, error: tagErr } = await supabase
        .from("exam_tags")
        .select("exam_id, exams!inner(id, slug, title, description, category, question_count, exam_number, youtube_video_id, status)")
        .ilike("tag", `%${q}%`)
        .eq("exams.status", "published")
        .eq("exams.category", data.category as any)
        .limit(limit);
      if (!tagErr && tagged) {
        const existing = new Set(results.map((r) => r.id));
        for (const row of tagged as any[]) {
          const e = row.exams;
          if (!e || existing.has(e.id)) continue;
          existing.add(e.id);
          results.push({
            id: e.id,
            slug: e.slug,
            title: e.title,
            description: e.description,
            category: e.category,
            question_count: e.question_count,
            exam_number: e.exam_number,
            youtube_video_id: e.youtube_video_id,
            tags: [],
          });
        }
      }
    }

    return results;
  });

export type TopicCount = { tag: string; count: number };

export const getTopicCounts = createServerFn({ method: "GET" })
  .inputValidator((data: { category: string }) => data)
  .handler(async ({ data }): Promise<TopicCount[]> => {
    const supabase = getPublicClient();
    const { data: rows, error } = await supabase
      .from("exam_tags")
      .select("tag, exams!inner(status, category)")
      .eq("exams.status", "published")
      .eq("exams.category", data.category as any);
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const r of (rows || []) as any[]) {
      counts.set(r.tag, (counts.get(r.tag) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([tag, count]) => ({ tag, count }));
  });

export type RecentAttempt = {
  id: string;
  exam_id: string | null;
  exam_slug: string | null;
  exam_title: string;
  attempt_type: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total: number;
};

export const getRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { category?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }): Promise<RecentAttempt[]> => {
    let q = context.supabase
      .from("user_attempts")
      .select("id, exam_id, attempt_type, started_at, completed_at, score, total, exams!inner(slug, title, category)")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(10);
    if (data.category) {
      q = q.eq("exams.category", data.category as any);
    }
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows || []).slice(0, 5).map((r: any) => ({
      id: r.id,
      exam_id: r.exam_id,
      exam_slug: r.exams?.slug ?? null,
      exam_title: r.exams?.title ?? (r.attempt_type === "review" ? "Weak Spots Review" : "Exam"),
      attempt_type: r.attempt_type,
      started_at: r.started_at,
      completed_at: r.completed_at,
      score: r.score,
      total: r.total,
    }));
  });

// ---------- Stats / Up Next / Streak ----------

import { getTopicsForCategory } from "./topics";

export type DashboardStats = {
  exams_taken: number;
  exams_taken_week: number;
  avg_score_pct: number | null;
  avg_score_delta_pct: number | null;
  questions_answered: number;
  questions_total: number;
};

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { category: string }) => data)
  .handler(async ({ data, context }): Promise<DashboardStats> => {
    const { supabase, userId } = context;
    const category = data.category;

    const { data: attempts } = await supabase
      .from("user_attempts")
      .select("id, score, total, completed_at, exams!inner(category)")
      .eq("user_id", userId)
      .eq("exams.category", category as any)
      .not("completed_at", "is", null);

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const twoMonthsAgo = now - 60 * 24 * 60 * 60 * 1000;

    let taken = 0;
    let takenWeek = 0;
    let sumPctRecent = 0;
    let countRecent = 0;
    let sumPctPrior = 0;
    let countPrior = 0;

    for (const a of (attempts || []) as any[]) {
      taken += 1;
      const t = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      if (t >= weekAgo) takenWeek += 1;
      if (a.total > 0 && a.score !== null) {
        const pct = (a.score / a.total) * 100;
        if (t >= monthAgo) {
          sumPctRecent += pct;
          countRecent += 1;
        } else if (t >= twoMonthsAgo) {
          sumPctPrior += pct;
          countPrior += 1;
        }
      }
    }

    const avgRecent = countRecent > 0 ? sumPctRecent / countRecent : null;
    const avgPrior = countPrior > 0 ? sumPctPrior / countPrior : null;
    const avgOverall =
      taken > 0
        ? ((attempts || []) as any[])
            .filter((a) => a.total > 0 && a.score !== null)
            .reduce((acc, a) => acc + (a.score / a.total) * 100, 0) /
          Math.max(1, ((attempts || []) as any[]).filter((a) => a.total > 0 && a.score !== null).length)
        : null;

    // questions answered
    const { data: examsInCat } = await supabase
      .from("exams")
      .select("id, question_count")
      .eq("status", "published")
      .eq("category", category as any);
    const examIds = (examsInCat || []).map((e: any) => e.id);
    const questionsTotal = (examsInCat || []).reduce((s: number, e: any) => s + (e.question_count || 0), 0);

    let questionsAnswered = 0;
    if (examIds.length > 0) {
      const { count } = await supabase
        .from("user_answers")
        .select("id, user_attempts!inner(user_id, exam_id)", { count: "exact", head: true })
        .eq("user_attempts.user_id", userId)
        .in("user_attempts.exam_id", examIds);
      questionsAnswered = count ?? 0;
    }

    return {
      exams_taken: taken,
      exams_taken_week: takenWeek,
      avg_score_pct: avgOverall !== null ? Math.round(avgOverall) : null,
      avg_score_delta_pct:
        avgRecent !== null && avgPrior !== null ? Math.round(avgRecent - avgPrior) : null,
      questions_answered: questionsAnswered,
      questions_total: questionsTotal,
    };
  });

export type UpNext =
  | {
      kind: "start" | "resume" | "retake";
      exam_slug: string;
      exam_title: string;
      exam_number: number | null;
      question_count: number;
      topic_label: string | null;
      estimated_minutes: number;
    }
  | { kind: "none" };

export const getUpNext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { category: string }) => data)
  .handler(async ({ data, context }): Promise<UpNext> => {
    const { supabase, userId } = context;
    const category = data.category;
    const topics = getTopicsForCategory(category);
    if (topics.length === 0) return { kind: "none" };

    // Load all published exams for the category with tags in one shot.
    const { data: exams } = await supabase
      .from("exams")
      .select("id, slug, title, question_count, exam_number, exam_tags(tag)")
      .eq("status", "published")
      .eq("category", category as any)
      .order("exam_number", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (!exams || exams.length === 0) return { kind: "none" };

    // Attempts for this user in this category.
    const { data: attempts } = await supabase
      .from("user_attempts")
      .select("exam_id, completed_at, score, total, exams!inner(category)")
      .eq("user_id", userId)
      .eq("exams.category", category as any);

    const completedIds = new Set<string>();
    const inProgressIds = new Set<string>();
    const scoreByExam = new Map<string, { score: number; total: number }>();
    for (const a of (attempts || []) as any[]) {
      if (a.completed_at) {
        completedIds.add(a.exam_id);
        if (a.total > 0 && a.score !== null) {
          const prev = scoreByExam.get(a.exam_id);
          if (!prev || a.score / a.total < prev.score / prev.total) {
            scoreByExam.set(a.exam_id, { score: a.score, total: a.total });
          }
        }
      } else {
        inProgressIds.add(a.exam_id);
      }
    }

    // Bucket exams by topic slug.
    const byTopic = new Map<string, any[]>();
    const untagged: any[] = [];
    for (const e of exams as any[]) {
      const tags: string[] = (e.exam_tags || []).map((t: any) => t.tag);
      if (tags.length === 0) untagged.push(e);
      for (const tag of tags) {
        const arr = byTopic.get(tag) ?? [];
        arr.push(e);
        byTopic.set(tag, arr);
      }
    }

    const toResult = (e: any, kind: "start" | "resume" | "retake", topicLabel: string | null): UpNext => ({
      kind,
      exam_slug: e.slug,
      exam_title: e.title,
      exam_number: e.exam_number,
      question_count: e.question_count,
      topic_label: topicLabel,
      estimated_minutes: Math.max(1, Math.round((e.question_count * 45) / 60)),
    });

    // Walk topics in order, then untagged.
    const order: Array<{ label: string | null; exams: any[] }> = [
      ...topics.map((t) => ({ label: t.label, exams: byTopic.get(t.slug) ?? [] })),
      { label: null, exams: untagged },
    ];

    for (const bucket of order) {
      for (const e of bucket.exams) {
        if (inProgressIds.has(e.id)) return toResult(e, "resume", bucket.label);
        if (!completedIds.has(e.id)) return toResult(e, "start", bucket.label);
      }
    }

    // Everything done — suggest lowest-scoring exam.
    let worst: any = null;
    let worstPct = 2;
    for (const e of exams as any[]) {
      const s = scoreByExam.get(e.id);
      if (!s) continue;
      const pct = s.score / s.total;
      if (pct < worstPct) {
        worstPct = pct;
        worst = e;
      }
    }
    if (worst) return toResult(worst, "retake", null);
    return { kind: "none" };
  });

export type StreakInfo = {
  current_streak: number;
  best_streak: number;
  last_active_date: string | null;
  week_activity: boolean[]; // Sun..Sat
  streak_start_date: string | null;
};

export const getStreak = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StreakInfo> => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("user_streaks")
      .select("current_streak, best_streak, last_active_date")
      .eq("user_id", userId)
      .maybeSingle();

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let current = row?.current_streak ?? 0;
    const best = row?.best_streak ?? 0;
    const last = row?.last_active_date ?? null;
    if (last && last !== todayStr && last !== yesterdayStr) current = 0;

    // Calendar week: Sunday -> Saturday
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const { data: recent } = await supabase
      .from("user_attempts")
      .select("completed_at")
      .eq("user_id", userId)
      .gte("completed_at", weekStart.toISOString())
      .not("completed_at", "is", null);
    const activeDays = new Set(
      ((recent || []) as any[]).map((r) => (r.completed_at as string).slice(0, 10))
    );

    const weekActivity: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      weekActivity.push(activeDays.has(d.toISOString().slice(0, 10)));
    }

    // Streak start date
    let streakStartDate: string | null = null;
    if (current > 0 && last) {
      const start = new Date(last);
      start.setDate(start.getDate() - (current - 1));
      streakStartDate = start.toISOString().slice(0, 10);
    }

    return {
      current_streak: current,
      best_streak: best,
      last_active_date: last,
      week_activity: weekActivity,
      streak_start_date: streakStartDate,
    };
  });

export const touchStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const { data: row } = await supabase
      .from("user_streaks")
      .select("current_streak, best_streak, last_active_date")
      .eq("user_id", userId)
      .maybeSingle();

    let current = 1;
    let best = row?.best_streak ?? 0;
    if (row) {
      if (row.last_active_date === todayStr) {
        current = row.current_streak;
      } else if (row.last_active_date === yesterdayStr) {
        current = (row.current_streak ?? 0) + 1;
      } else {
        current = 1;
      }
    }
    if (current > best) best = current;

    await supabase
      .from("user_streaks")
      .upsert({
        user_id: userId,
        current_streak: current,
        best_streak: best,
        last_active_date: todayStr,
      });
    return { current_streak: current, best_streak: best };
  });

// ---------- Exam-day readiness ----------

import { calculateReadiness, type ReadinessResult } from "./readiness";

const PASS_MARK = 70;
const PSEUDO_TOPICS = new Set(["mixed", "final-exam-practice"]);

export const getReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { category: string }) => data)
  .handler(async ({ data, context }): Promise<ReadinessResult> => {
    const { supabase, userId } = context;
    const category = data.category;

    // Last 8 completed attempts, then reverse to OLDEST -> NEWEST.
    const { data: attempts } = await supabase
      .from("user_attempts")
      .select("score, total, completed_at, exams!inner(category)")
      .eq("user_id", userId)
      .eq("exams.category", category as any)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(8);

    const recentExams = ((attempts || []) as any[])
      .filter((a) => a.total > 0 && a.score !== null)
      .map((a) => ({ score: (a.score / a.total) * 100 }))
      .reverse();

    // Per-topic accuracy.
    const { data: answerRows } = await supabase
      .from("user_answers")
      .select(
        "is_correct, questions!inner(exam_id, exams!inner(category, exam_tags(tag)))"
      )
      .eq("questions.exams.category", category as any);

    const topicAgg = new Map<string, { correct: number; total: number }>();
    for (const r of (answerRows || []) as any[]) {
      const tags: string[] = (r.questions?.exams?.exam_tags || []).map((t: any) => t.tag);
      for (const tag of tags) {
        if (PSEUDO_TOPICS.has(tag)) continue;
        const s = topicAgg.get(tag) ?? { correct: 0, total: 0 };
        s.total += 1;
        if (r.is_correct) s.correct += 1;
        topicAgg.set(tag, s);
      }
    }

    const topicDefs = getTopicsForCategory(category).filter((t) => !PSEUDO_TOPICS.has(t.slug));
    const totalTopics = Math.max(1, topicDefs.length);
    const topics = topicDefs
      .map((t) => {
        const s = topicAgg.get(t.slug);
        if (!s || s.total < 5) return null;
        return { name: t.label, score: (s.correct / s.total) * 100 };
      })
      .filter(Boolean) as { name: string; score: number }[];

    return calculateReadiness({
      passMark: PASS_MARK,
      totalTopics,
      recentExams,
      topics,
    });
  });



