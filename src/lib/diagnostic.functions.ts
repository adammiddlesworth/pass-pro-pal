import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getTopicsForCategory } from "./topics";
import { calculateReadiness } from "./readiness";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

const PSEUDO_TOPICS = new Set(["mixed", "final-exam-practice"]);
const QUESTIONS_PER_TOPIC = 2;
const TARGET_TOTAL = 20;
const PASS_MARK = 70;

function getPublicClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function currentWeekStart(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday-based
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

function hashSort(seed: string, id: string): string {
  return createHash("sha256").update(seed + ":" + id).digest("hex");
}

type DiagnosticQuestion = {
  id: string;
  text: string;
  explanation: string | null;
  topic_slug: string | null;
  topic_label: string | null;
  answers: { id: string; text: string; is_correct: boolean }[];
};

export type DiagnosticPayload = {
  attemptId: string;
  category: string;
  questions: DiagnosticQuestion[];
};

export const startDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { category: string }) => data)
  .handler(async ({ data, context }): Promise<DiagnosticPayload> => {
    const { supabase, userId } = context;
    const category = data.category;
    const topics = getTopicsForCategory(category).filter((t) => !PSEUDO_TOPICS.has(t.slug));
    if (topics.length === 0) throw new Error("No topics configured for this category");

    const weekStart = currentWeekStart();
    const seed = `${userId}:${category}:${weekStart}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Pull all published exams in category with tags.
    const { data: exams, error: examsErr } = await supabaseAdmin
      .from("exams")
      .select("id, exam_tags(tag)")
      .eq("status", "published")
      .eq("category", category as any);
    if (examsErr) throw examsErr;

    const examsByTopic = new Map<string, string[]>();
    for (const e of (exams || []) as any[]) {
      const tags: string[] = (e.exam_tags || []).map((t: any) => t.tag);
      for (const tag of tags) {
        if (PSEUDO_TOPICS.has(tag)) continue;
        const arr = examsByTopic.get(tag) ?? [];
        arr.push(e.id);
        examsByTopic.set(tag, arr);
      }
    }

    const allExamIds = Array.from(new Set(((exams || []) as any[]).map((e) => e.id)));
    if (allExamIds.length === 0) throw new Error("No exams available for this category");

    const { data: allQuestions, error: qErr } = await supabaseAdmin
      .from("questions")
      .select("id, exam_id, text, explanation, answers(id, text, is_correct)")
      .in("exam_id", allExamIds);
    if (qErr) throw qErr;

    // Build topic → question rows.
    const questionsByTopic = new Map<string, any[]>();
    for (const t of topics) {
      const examIds = new Set(examsByTopic.get(t.slug) ?? []);
      if (examIds.size === 0) continue;
      const rows = (allQuestions || []).filter((q: any) => examIds.has(q.exam_id));
      questionsByTopic.set(t.slug, rows);
    }

    // Deterministic pick per topic.
    const picked: DiagnosticQuestion[] = [];
    const usedIds = new Set<string>();
    for (const t of topics) {
      const pool = (questionsByTopic.get(t.slug) ?? []).filter((q: any) => !usedIds.has(q.id));
      if (pool.length === 0) continue;
      pool.sort((a: any, b: any) => hashSort(seed, a.id).localeCompare(hashSort(seed, b.id)));
      for (const q of pool.slice(0, QUESTIONS_PER_TOPIC)) {
        usedIds.add(q.id);
        picked.push({
          id: q.id,
          text: q.text,
          explanation: q.explanation,
          topic_slug: t.slug,
          topic_label: t.label,
          answers: (q.answers || []).map((a: any) => ({
            id: a.id,
            text: a.text,
            is_correct: !!a.is_correct,
          })),
        });
      }
    }

    // Top up to TARGET_TOTAL from any remaining questions in the category.
    if (picked.length < TARGET_TOTAL) {
      const remainder = (allQuestions || []).filter((q: any) => !usedIds.has(q.id));
      remainder.sort((a: any, b: any) => hashSort(seed, a.id).localeCompare(hashSort(seed, b.id)));
      for (const q of remainder) {
        if (picked.length >= TARGET_TOTAL) break;
        usedIds.add(q.id);
        picked.push({
          id: q.id,
          text: q.text,
          explanation: q.explanation,
          topic_slug: null,
          topic_label: null,
          answers: (q.answers || []).map((a: any) => ({
            id: a.id,
            text: a.text,
            is_correct: !!a.is_correct,
          })),
        });
      }
    }

    const finalQuestions = picked.slice(0, TARGET_TOTAL);
    // Stable ordering across the picked set.
    finalQuestions.sort((a, b) => hashSort(seed, a.id).localeCompare(hashSort(seed, b.id)));

    if (finalQuestions.length === 0) throw new Error("No questions available");

    const { data: attempt, error: aErr } = await supabase
      .from("user_attempts")
      .insert({
        user_id: userId,
        exam_id: null,
        total: finalQuestions.length,
        attempt_type: "diagnostic",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (aErr) throw aErr;

    return { attemptId: attempt.id, category, questions: finalQuestions };
  });

export type DiagnosticResult = {
  attemptId: string;
  category: string;
  scorePct: number;
  correct: number;
  total: number;
  readiness: number;
  status: "Ready" | "Almost there" | "Not ready yet";
  color: "green" | "amber" | "red";
  reason: string;
  weakestTopics: { slug: string; name: string; score: number }[];
  strongestTopics: { slug: string; name: string; score: number }[];
  hasAccess: boolean;
};

export const completeDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      attemptId: string;
      category: string;
      answers: { questionId: string; answerId: string; isCorrect: boolean; topicSlug: string | null; topicLabel: string | null }[];
    }) => data
  )
  .handler(async ({ data, context }): Promise<DiagnosticResult> => {
    const { supabase, userId } = context;
    const total = data.answers.length;
    const correct = data.answers.filter((a) => a.isCorrect).length;
    const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Save answers (best effort).
    if (total > 0) {
      const now = new Date().toISOString();
      await supabase.from("user_answers").insert(
        data.answers.map((a) => ({
          attempt_id: data.attemptId,
          question_id: a.questionId,
          answer_id: a.answerId,
          is_correct: a.isCorrect,
          answered_at: now,
        }))
      );
    }

    await supabase
      .from("user_attempts")
      .update({ score: correct, total, completed_at: new Date().toISOString() })
      .eq("id", data.attemptId);

    // Per-topic accuracy.
    const topicAgg = new Map<string, { name: string; correct: number; total: number }>();
    for (const a of data.answers) {
      if (!a.topicSlug || !a.topicLabel) continue;
      const s = topicAgg.get(a.topicSlug) ?? { name: a.topicLabel, correct: 0, total: 0 };
      s.total += 1;
      if (a.isCorrect) s.correct += 1;
      topicAgg.set(a.topicSlug, s);
    }
    const topicScores = Array.from(topicAgg.entries()).map(([slug, s]) => ({
      slug,
      name: s.name,
      score: Math.round((s.correct / s.total) * 100),
    }));

    const totalTopics = Math.max(
      1,
      getTopicsForCategory(data.category).filter((t) => !PSEUDO_TOPICS.has(t.slug)).length
    );

    const readiness = calculateReadiness({
      passMark: PASS_MARK,
      totalTopics,
      recentExams: [{ score: scorePct }],
      topics: topicScores.map((t) => ({ name: t.name, score: t.score })),
    });

    const weakestTopics = [...topicScores].sort((a, b) => a.score - b.score).slice(0, 3);
    const strongestTopics = [...topicScores].sort((a, b) => b.score - a.score).slice(0, 3);

    // Check purchase status for CTA copy.
    const { data: purchases } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .limit(1);
    const hasAccess = (purchases?.length ?? 0) > 0;

    // Best-effort GHL sync — never fails the request.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { syncToGhl } = await import("./ghl.server");
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
      const email = userRes?.user?.email;
      if (email) {
        await syncToGhl({
          email,
          tags: [
            "diagnostic-completed",
            `readiness-${readiness.color}`,
            `track-${data.category}`,
          ],
          customFields: {
            passpal_track: data.category,
            passpal_readiness_score: readiness.readiness,
            passpal_diagnostic_status: readiness.status,
            passpal_weak_topics: weakestTopics.map((t) => t.name).join(", "),
            passpal_last_activity_at: new Date().toISOString(),
          },
          source: "PassPal diagnostic",
        });
      }
    } catch (e) {
      console.error("[ghl] diagnostic sync error", e);
    }

    return {
      attemptId: data.attemptId,
      category: data.category,
      scorePct,
      correct,
      total,
      readiness: readiness.readiness,
      status: readiness.status,
      color: readiness.color,
      reason: readiness.reason,
      weakestTopics,
      strongestTopics,
      hasAccess,
    };
  });

export type DiagnosticStatus = {
  hasTakenThisWeek: boolean;
  lastScorePct: number | null;
  lastReadiness: number | null;
  lastCompletedAt: string | null;
};

export const getDiagnosticStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { category: string }) => data)
  .handler(async ({ data, context }): Promise<DiagnosticStatus> => {
    const { supabase, userId } = context;
    const weekStart = currentWeekStart();
    const weekStartIso = new Date(weekStart + "T00:00:00Z").toISOString();

    const { data: rows } = await supabase
      .from("user_attempts")
      .select("score, total, completed_at")
      .eq("user_id", userId)
      .eq("attempt_type", "diagnostic")
      .not("completed_at", "is", null)
      .gte("completed_at", weekStartIso)
      .order("completed_at", { ascending: false })
      .limit(1);

    const last = (rows || [])[0];
    if (!last) {
      return { hasTakenThisWeek: false, lastScorePct: null, lastReadiness: null, lastCompletedAt: null };
    }
    const pct = last.total ? Math.round(((last.score ?? 0) / last.total) * 100) : 0;
    return {
      hasTakenThisWeek: true,
      lastScorePct: pct,
      lastReadiness: null,
      lastCompletedAt: last.completed_at,
    };
  });
