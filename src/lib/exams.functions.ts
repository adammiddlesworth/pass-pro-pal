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
