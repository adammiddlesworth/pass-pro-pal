import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Database } from "@/integrations/supabase/types";

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

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: exam, error: examErr } = await supabase
      .from("exams")
      .select("*")
      .eq("slug", data.slug)
      .single();
    if (examErr || !exam) throw notFound();

    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("*, answers(*)")
      .eq("exam_id", exam.id)
      .order("order_index", { ascending: true });
    if (qErr) throw qErr;

    return { exam, questions: questions || [] };
  });
