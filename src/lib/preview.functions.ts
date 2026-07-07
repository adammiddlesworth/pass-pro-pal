import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";

function tokenMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const getPreviewExam = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; token: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.OWNER_PREVIEW_TOKEN;
    if (!expected || !data.token || !tokenMatches(data.token, expected)) {
      throw notFound();
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: exam, error: examErr } = await supabaseAdmin
      .from("exams")
      .select("*")
      .eq("slug", data.slug)
      .single();
    if (examErr || !exam) throw notFound();

    const { data: questions, error: qErr } = await supabaseAdmin
      .from("questions")
      .select("*, answers(*)")
      .eq("exam_id", exam.id)
      .order("order_index", { ascending: true });
    if (qErr) throw qErr;

    return { exam, questions: questions || [] };
  });
