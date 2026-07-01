import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

function getPublicClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const getExams = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
});

export const getExamBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { data: exam, error } = await supabase
      .from("exams")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .single();
    if (error) throw error;
    if (!exam) throw new Error("Exam not found");
    return exam;
  });

export const getExamQuestions = createServerFn({ method: "GET" })
  .inputValidator((data: { examId: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { data: questions, error } = await supabase
      .from("questions")
      .select("*, answers(*)")
      .eq("exam_id", data.examId)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return questions || [];
  });

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getUserPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("purchases")
      .select("*")
      .eq("user_id", context.userId)
      .eq("status", "completed");
    if (error) throw error;
    return data || [];
  });

export const createAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { examId: string; total: number }) => data)
  .handler(async ({ data, context }) => {
    const { data: attempt, error } = await context.supabase
      .from("user_attempts")
      .insert({
        user_id: context.userId,
        exam_id: data.examId,
        total: data.total,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return attempt;
  });

export const saveUserAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      attemptId: string;
      questionId: string;
      answerId: string;
      isCorrect: boolean;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_answers").insert({
      attempt_id: data.attemptId,
      question_id: data.questionId,
      answer_id: data.answerId,
      is_correct: data.isCorrect,
      answered_at: new Date().toISOString(),
    });
    if (error) throw error;
  });

export const completeAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { attemptId: string; score: number; total: number }) => data
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_attempts")
      .update({
        score: data.score,
        total: data.total,
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.attemptId);
    if (error) throw error;
  });
