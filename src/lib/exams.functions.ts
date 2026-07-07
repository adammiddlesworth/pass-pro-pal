import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

// Category → Paddle product id map (single source of truth).
export const CATEGORY_PRODUCT_IDS: Record<string, string> = {
  real_estate: "real_estate_exam",
  life_health_insurance: "life_health_exam",
};


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
      .select("*, exam_tags(tag)")
      .eq("slug", data.slug)
      .eq("status", "published")
      .single();
    if (error) throw error;
    if (!exam) throw new Error("Exam not found");
    const tags = ((exam as any).exam_tags || []).map((t: any) => t.tag) as string[];
    return { ...(exam as any), tags } as typeof exam & { tags: string[] };
  });


export const getExamQuestions = createServerFn({ method: "GET" })
  .inputValidator((data: { examId: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up the exam to determine whether it is a free sample.
    const { data: exam, error: examErr } = await supabaseAdmin
      .from("exams")
      .select("id, is_sample, category, status")
      .eq("id", data.examId)
      .maybeSingle();
    if (examErr) throw examErr;
    if (!exam || exam.status !== "published") throw new Error("Exam not found");

    // Non-sample exams require an authenticated user with a matching purchase (or admin).
    if (!exam.is_sample) {
      const authHeader =
        getRequestHeader("authorization") ?? getRequestHeader("Authorization" as any);
      const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
      if (!token) throw new Error("Authentication required to view this exam");

      const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (userErr || !userRes.user) throw new Error("Authentication required to view this exam");
      const userId = userRes.user.id;

      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) {
        const productId = CATEGORY_PRODUCT_IDS[exam.category];
        if (!productId) throw new Error("Purchase required to view this exam");
        const { data: purchases, error: pErr } = await supabaseAdmin
          .from("purchases")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .eq("product_id", productId)
          .limit(1);
        if (pErr) throw pErr;
        if (!purchases || purchases.length === 0) {
          throw new Error("Purchase required to view this exam");
        }
      }
    }

    const { data: questions, error } = await supabaseAdmin
      .from("questions")
      .select("*, answers(*)")
      .eq("exam_id", data.examId)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return questions || [];
  });

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

// Returns which categories the current user has purchased access to.
export const getUserCategoryAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("purchases")
      .select("product_id")
      .eq("user_id", context.userId)
      .eq("status", "completed");
    if (error) throw error;
    const ownedProducts = new Set((data || []).map((p) => p.product_id));
    const access: Record<string, boolean> = {};
    for (const [category, productId] of Object.entries(CATEGORY_PRODUCT_IDS)) {
      access[category] = ownedProducts.has(productId);
    }
    return access;
  });

export const createAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      examId: string | null;
      total: number;
      attemptType?: "exam" | "review";
    }) => data
  )
  .handler(async ({ data, context }) => {
    const { data: attempt, error } = await context.supabase
      .from("user_attempts")
      .insert({
        user_id: context.userId,
        exam_id: data.examId,
        total: data.total,
        attempt_type: data.attemptType ?? "exam",
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

    // Update daily streak (best-effort — never fail the submit on streak errors).
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    try {
      const { data: row } = await context.supabase
        .from("user_streaks")
        .select("current_streak, best_streak, last_active_date")
        .eq("user_id", context.userId)
        .maybeSingle();
      let current = 1;
      let best = row?.best_streak ?? 0;
      if (row) {
        if (row.last_active_date === todayStr) current = row.current_streak;
        else if (row.last_active_date === yesterdayStr) current = (row.current_streak ?? 0) + 1;
        else current = 1;
      }
      if (current > best) best = current;
      await context.supabase.from("user_streaks").upsert({
        user_id: context.userId,
        current_streak: current,
        best_streak: best,
        last_active_date: todayStr,
      });
    } catch (e) {
      console.warn("streak update failed", e);
    }
  });
