import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin role required");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw error;
    return { isAdmin: !!data };
  });

export const listAllExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("exams")
      .select("*, exam_tags(tag)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((e: any) => ({
      ...e,
      tags: (e.exam_tags || []).map((t: any) => t.tag) as string[],
    }));
  });

export const getExamForEdit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: exam, error } = await context.supabase
      .from("exams")
      .select("*, exam_tags(tag)")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return {
      ...(exam as any),
      tags: ((exam as any).exam_tags || []).map((t: any) => t.tag) as string[],
    };
  });

const examInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  category: z.enum(["real_estate", "life_health_insurance"]),
  status: z.enum(["draft", "published", "archived"]),
  description: z.string().max(2000).nullable().optional(),
  is_sample: z.boolean(),
  exam_number: z.number().int().nullable().optional(),
  youtube_url: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
  youtube_video_id: z.string().max(20).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const saveExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => examInputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { id, tags, ...fields } = data;
    const payload = {
      ...fields,
      description: fields.description || null,
      youtube_url: fields.youtube_url || null,
      youtube_video_id: fields.youtube_video_id || null,
      exam_number: fields.exam_number ?? null,
    };

    let examId = id;
    if (examId) {
      const { error } = await context.supabase
        .from("exams")
        .update(payload)
        .eq("id", examId);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await context.supabase
        .from("exams")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      examId = inserted.id;
    }

    // Replace tags.
    await context.supabase.from("exam_tags").delete().eq("exam_id", examId);
    const uniqueTags = Array.from(new Set(tags.map((t) => t.toLowerCase())));
    if (uniqueTags.length > 0) {
      const { error } = await context.supabase
        .from("exam_tags")
        .insert(uniqueTags.map((tag) => ({ exam_id: examId, tag })));
      if (error) throw error;
    }

    return { id: examId };
  });

export const deleteExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("exams").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Questions ----------

export const listExamQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: questions, error } = await context.supabase
      .from("questions")
      .select("id, text, explanation, order_index, answers(id, text, is_correct, order_index)")
      .eq("exam_id", data.examId)
      .order("order_index", { ascending: true });
    if (error) throw error;
    return (questions || []).map((q: any) => ({
      id: q.id as string,
      text: q.text as string,
      explanation: (q.explanation ?? null) as string | null,
      order_index: q.order_index as number,
      answers: [...(q.answers || [])]
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((a: any) => ({
          id: a.id as string,
          text: a.text as string,
          is_correct: !!a.is_correct,
          order_index: a.order_index as number,
        })),
    }));
  });

const choiceSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  is_correct: z.boolean(),
});

const rowSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  explanation: z.string().trim().max(4000).nullable().optional(),
  choices: z.array(choiceSchema).min(2).max(6),
});

const importSchema = z.object({
  examId: z.string().uuid(),
  mode: z.enum(["replace", "append"]),
  rows: z.array(rowSchema).min(1).max(500),
});

export const importExamQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => importSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { examId, mode, rows } = data;

    for (const [i, row] of rows.entries()) {
      if (!row.choices.some((c) => c.is_correct)) {
        throw new Error(`Row ${i + 1}: no correct answer marked`);
      }
    }

    let startIndex = 0;
    if (mode === "replace") {
      const { error } = await context.supabase.from("questions").delete().eq("exam_id", examId);
      if (error) throw error;
    } else {
      const { data: max } = await context.supabase
        .from("questions")
        .select("order_index")
        .eq("exam_id", examId)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();
      startIndex = ((max as any)?.order_index ?? -1) + 1;
    }

    const questionRows = rows.map((r, i) => ({
      exam_id: examId,
      text: r.prompt,
      explanation: r.explanation || null,
      order_index: startIndex + i,
    }));
    const { data: inserted, error: qErr } = await context.supabase
      .from("questions")
      .insert(questionRows)
      .select("id, order_index");
    if (qErr) throw qErr;

    const byOrder = new Map<number, string>();
    (inserted || []).forEach((q: any) => byOrder.set(q.order_index, q.id));

    const answerRows: any[] = [];
    rows.forEach((r, i) => {
      const qid = byOrder.get(startIndex + i);
      if (!qid) return;
      r.choices.forEach((c, j) => {
        answerRows.push({
          question_id: qid,
          text: c.text,
          is_correct: c.is_correct,
          order_index: j,
        });
      });
    });
    if (answerRows.length > 0) {
      const { error: aErr } = await context.supabase.from("answers").insert(answerRows);
      if (aErr) throw aErr;
    }

    return { inserted: rows.length };
  });

const upsertQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  examId: z.string().uuid(),
  prompt: z.string().trim().min(1).max(2000),
  explanation: z.string().trim().max(4000).nullable().optional(),
  choices: z.array(choiceSchema).min(2).max(6),
});

export const upsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => upsertQuestionSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.choices.some((c) => c.is_correct)) {
      throw new Error("At least one choice must be marked correct");
    }
    let questionId = data.id;
    if (questionId) {
      const { error } = await context.supabase
        .from("questions")
        .update({ text: data.prompt, explanation: data.explanation || null })
        .eq("id", questionId);
      if (error) throw error;
      const { error: dErr } = await context.supabase
        .from("answers")
        .delete()
        .eq("question_id", questionId);
      if (dErr) throw dErr;
    } else {
      const { data: max } = await context.supabase
        .from("questions")
        .select("order_index")
        .eq("exam_id", data.examId)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextIndex = ((max as any)?.order_index ?? -1) + 1;
      const { data: inserted, error } = await context.supabase
        .from("questions")
        .insert({
          exam_id: data.examId,
          text: data.prompt,
          explanation: data.explanation || null,
          order_index: nextIndex,
        })
        .select("id")
        .single();
      if (error) throw error;
      questionId = (inserted as any).id;
    }

    const answerRows = data.choices.map((c, i) => ({
      question_id: questionId,
      text: c.text,
      is_correct: c.is_correct,
      order_index: i,
    }));
    const { error: aErr } = await context.supabase.from("answers").insert(answerRows);
    if (aErr) throw aErr;
    return { id: questionId };
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("questions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const duplicateExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: src, error: e1 } = await context.supabase
      .from("exams")
      .select("*, exam_tags(tag), questions(id, text, explanation, order_index, answers(text, is_correct, order_index))")
      .eq("id", data.id)
      .single();
    if (e1) throw e1;
    const original: any = src;

    const baseSlug = `${original.slug}-copy`;
    let slug = baseSlug;
    for (let n = 2; n < 50; n++) {
      const { data: exists } = await context.supabase
        .from("exams")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!exists) break;
      slug = `${baseSlug}-${n}`;
    }

    const { data: newExam, error: e2 } = await context.supabase
      .from("exams")
      .insert({
        title: `${original.title} (copy)`,
        slug,
        category: original.category,
        status: "draft",
        description: original.description,
        is_sample: false,
        exam_number: null,
        youtube_url: original.youtube_url,
        youtube_video_id: original.youtube_video_id,
      })
      .select("id")
      .single();
    if (e2) throw e2;
    const newId = (newExam as any).id;

    const tags = (original.exam_tags || []).map((t: any) => ({ exam_id: newId, tag: t.tag }));
    if (tags.length > 0) {
      await context.supabase.from("exam_tags").insert(tags);
    }

    const sortedQs = [...(original.questions || [])].sort(
      (a: any, b: any) => a.order_index - b.order_index,
    );
    for (const q of sortedQs) {
      const { data: newQ, error: qe } = await context.supabase
        .from("questions")
        .insert({
          exam_id: newId,
          text: q.text,
          explanation: q.explanation,
          order_index: q.order_index,
        })
        .select("id")
        .single();
      if (qe) throw qe;
      const answers = (q.answers || []).map((a: any) => ({
        question_id: (newQ as any).id,
        text: a.text,
        is_correct: a.is_correct,
        order_index: a.order_index,
      }));
      if (answers.length > 0) {
        await context.supabase.from("answers").insert(answers);
      }
    }

    return { id: newId };
  });
