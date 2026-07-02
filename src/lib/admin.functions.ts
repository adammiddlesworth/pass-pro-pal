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
