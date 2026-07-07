import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORY_PRODUCT_IDS } from "./exams.functions";

const REVIEW_SIZE = 20;
const MIN_ANSWERS_TO_UNLOCK = 20;

const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_PRODUCT_IDS));

type ReviewStatus =
  | { ready: true; questions: any[]; category: string }
  | { ready: false; reason: "no_access" | "not_enough_data"; answered: number; needed: number; category: string };

export const getWeakSpotsReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { category: string }) => {
    if (!VALID_CATEGORIES.has(data.category)) {
      throw new Error(`Invalid category: ${data.category}`);
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<ReviewStatus> => {
    const { supabase, userId } = context;
    const category = data.category;
    const productId = CATEGORY_PRODUCT_IDS[category];

    // 1. Verify category access.
    const { data: purchases } = await supabase
      .from("purchases")
      .select("product_id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("status", "completed")
      .limit(1);
    if (!purchases || purchases.length === 0) {
      return { ready: false, reason: "no_access", answered: 0, needed: MIN_ANSWERS_TO_UNLOCK, category };
    }

    // 2. Pull the user's answers scoped to this category.
    //    RLS on user_answers already limits rows to the current user via user_attempts.
    const { data: userAnswers, error } = await supabase
      .from("user_answers")
      .select(
        "question_id, is_correct, answered_at, questions!inner(id, exam_id, exams!inner(category))"
      )
      .eq("questions.exams.category", category as any);
    if (error) throw error;
    const rows = userAnswers as any[] | null;

    // 3. Aggregate per question.
    const stats = new Map<
      string,
      { wrong: number; correct: number; lastMissedAt: number }
    >();
    for (const row of rows || []) {
      const qid = row.question_id as string;
      const s = stats.get(qid) ?? { wrong: 0, correct: 0, lastMissedAt: 0 };
      if (row.is_correct) {
        s.correct += 1;
      } else {
        s.wrong += 1;
        const t = row.answered_at ? new Date(row.answered_at).getTime() : 0;
        if (t > s.lastMissedAt) s.lastMissedAt = t;
      }
      stats.set(qid, s);
    }

    const totalAnswered = rows?.length ?? 0;
    if (totalAnswered < MIN_ANSWERS_TO_UNLOCK) {
      return {
        ready: false,
        reason: "not_enough_data",
        answered: totalAnswered,
        needed: MIN_ANSWERS_TO_UNLOCK,
        category,
      };
    }

    // 4. Rank by weakness score.
    const ranked = Array.from(stats.entries())
      .map(([qid, s]) => ({
        qid,
        score: s.wrong * 2 - s.correct,
        lastMissedAt: s.lastMissedAt,
        wrong: s.wrong,
      }))
      .filter((r) => r.wrong > 0)
      .sort((a, b) => b.score - a.score || b.lastMissedAt - a.lastMissedAt)
      .slice(0, REVIEW_SIZE);

    if (ranked.length === 0) {
      return {
        ready: false,
        reason: "not_enough_data",
        answered: totalAnswered,
        needed: MIN_ANSWERS_TO_UNLOCK,
        category,
      };
    }

    const questionIds = ranked.map((r) => r.qid);

    // 5. Load full question + answer payload. Use admin client because
    // questions/answers RLS now blocks non-sample reads.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: questions, error: qerr } = await supabaseAdmin
      .from("questions")
      .select("*, answers(*)")
      .in("id", questionIds);
    if (qerr) throw qerr;

    // Preserve ranked order.
    const byId = new Map((questions || []).map((q: any) => [q.id, q]));
    const ordered = questionIds
      .map((id) => byId.get(id))
      .filter(Boolean);

    return { ready: true, questions: ordered as any[], category };
  });
