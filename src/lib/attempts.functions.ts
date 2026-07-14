import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ResumeState = {
  attemptId: string;
  startedAt: string;
  resumed: boolean;
  answers: Array<{ question_id: string; answer_id: string; is_correct: boolean }>;
};

export const startOrResumeAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { examId: string; total: number }) => data)
  .handler(async ({ data, context }): Promise<ResumeState> => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("user_attempts")
      .select("id, started_at")
      .eq("user_id", userId)
      .eq("exam_id", data.examId)
      .eq("attempt_type", "exam")
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { data: rows } = await supabase
        .from("user_answers")
        .select("question_id, answer_id, is_correct")
        .eq("attempt_id", existing.id);
      return {
        attemptId: existing.id,
        startedAt: existing.started_at,
        resumed: true,
        answers: (rows || []) as any,
      };
    }

    const { data: created, error } = await supabase
      .from("user_attempts")
      .insert({
        user_id: userId,
        exam_id: data.examId,
        total: data.total,
        attempt_type: "exam",
        started_at: new Date().toISOString(),
      })
      .select("id, started_at")
      .single();
    if (error) throw error;
    return { attemptId: created.id, startedAt: created.started_at, resumed: false, answers: [] };
  });

export const saveAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { attemptId: string; questionId: string; answerId: string }) => data
  )
  .handler(async ({ data, context }): Promise<{ is_correct: boolean }> => {
    const { supabase, userId } = context;

    // Verify attempt ownership.
    const { data: attempt, error: aErr } = await supabase
      .from("user_attempts")
      .select("id, user_id")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!attempt || attempt.user_id !== userId) throw new Error("Attempt not found");

    // Look up correctness server-side. Uses admin client because answers
    // RLS restricts direct reads to sample exams only.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ans, error: ansErr } = await supabaseAdmin
      .from("answers")
      .select("id, is_correct, question_id")
      .eq("id", data.answerId)
      .maybeSingle();
    if (ansErr) throw ansErr;
    if (!ans || ans.question_id !== data.questionId) throw new Error("Invalid answer");

    const isCorrect = !!ans.is_correct;
    const { error } = await supabase
      .from("user_answers")
      .upsert(
        {
          attempt_id: data.attemptId,
          question_id: data.questionId,
          answer_id: data.answerId,
          is_correct: isCorrect,
          answered_at: new Date().toISOString(),
        },
        { onConflict: "attempt_id,question_id" }
      );
    if (error) throw error;
    return { is_correct: isCorrect };
  });

export const finalizeAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { attemptId: string; total: number }) => data)
  .handler(async ({ data, context }): Promise<{ score: number; total: number }> => {
    const { supabase, userId } = context;

    const { data: attempt, error: aErr } = await supabase
      .from("user_attempts")
      .select("id, user_id, completed_at, started_at, exam_id, exams(is_timed_final, time_limit_minutes)")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!attempt || attempt.user_id !== userId) throw new Error("Attempt not found");

    // For timed finals, cap elapsed at the time limit so a client that
    // submits late still gets a valid deadline-based score (no bonus time).
    const exam = (attempt as any).exams as { is_timed_final?: boolean; time_limit_minutes?: number | null } | null;
    const isTimed = !!exam?.is_timed_final && !!exam?.time_limit_minutes;

    const { data: rows, error: rErr } = await supabase
      .from("user_answers")
      .select("is_correct, answered_at")
      .eq("attempt_id", data.attemptId);
    if (rErr) throw rErr;

    let gradedRows = (rows || []) as any[];
    if (isTimed) {
      const startedAt = new Date((attempt as any).started_at).getTime();
      const deadline = startedAt + (exam!.time_limit_minutes as number) * 60_000;
      gradedRows = gradedRows.filter((r) => new Date(r.answered_at).getTime() <= deadline);
    }
    const score = gradedRows.filter((r) => r.is_correct).length;

    const { error: uErr } = await supabase
      .from("user_attempts")
      .update({
        score,
        total: data.total,
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.attemptId);
    if (uErr) throw uErr;

    // Best-effort streak update.
    try {
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
        if (row.last_active_date === todayStr) current = row.current_streak;
        else if (row.last_active_date === yesterdayStr) current = (row.current_streak ?? 0) + 1;
        else current = 1;
      }
      if (current > best) best = current;
      await supabase.from("user_streaks").upsert({
        user_id: userId,
        current_streak: current,
        best_streak: best,
        last_active_date: todayStr,
      });
    } catch {
      /* ignore streak errors */
    }

    return { score, total: data.total };
  });

export const abandonAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { attemptId: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_attempts")
      .delete()
      .eq("id", data.attemptId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
