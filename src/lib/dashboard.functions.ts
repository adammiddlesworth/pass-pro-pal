import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

function getPublicClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export type ExamSearchResult = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  question_count: number;
  exam_number: number | null;
  youtube_video_id: string | null;
  tags: string[];
};

export const searchExams = createServerFn({ method: "GET" })
  .inputValidator((data: { category: string; q?: string; topic?: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<ExamSearchResult[]> => {
    const supabase = getPublicClient();
    const limit = Math.min(data.limit ?? 30, 60);
    const q = (data.q ?? "").trim();
    const topic = (data.topic ?? "").trim();

    let topicExamIds: string[] | null = null;
    if (topic) {
      const { data: tagRows, error: tagErr } = await supabase
        .from("exam_tags")
        .select("exam_id")
        .eq("tag", topic);
      if (tagErr) throw tagErr;
      topicExamIds = (tagRows || []).map((r: any) => r.exam_id);
      if (topicExamIds.length === 0) return [];
    }

    let query = supabase
      .from("exams")
      .select(
        "id, slug, title, description, category, question_count, exam_number, youtube_video_id, exam_tags(tag)"
      )
      .eq("status", "published")
      .eq("category", data.category as any)
      .order("exam_number", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (topicExamIds) {
      query = query.in("id", topicExamIds);
    }

    if (q) {
      query = query.or(
        `title.ilike.%${q}%,description.ilike.%${q}%,slug.ilike.%${q}%`
      );
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    let results = (rows || []).map((r: any) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      category: r.category,
      question_count: r.question_count,
      exam_number: r.exam_number,
      youtube_video_id: r.youtube_video_id,
      tags: (r.exam_tags || []).map((t: any) => t.tag),
    }));

    if (q && !topic) {
      const { data: tagged, error: tagErr } = await supabase
        .from("exam_tags")
        .select("exam_id, exams!inner(id, slug, title, description, category, question_count, exam_number, youtube_video_id, status)")
        .ilike("tag", `%${q}%`)
        .eq("exams.status", "published")
        .eq("exams.category", data.category as any)
        .limit(limit);
      if (!tagErr && tagged) {
        const existing = new Set(results.map((r) => r.id));
        for (const row of tagged as any[]) {
          const e = row.exams;
          if (!e || existing.has(e.id)) continue;
          existing.add(e.id);
          results.push({
            id: e.id,
            slug: e.slug,
            title: e.title,
            description: e.description,
            category: e.category,
            question_count: e.question_count,
            exam_number: e.exam_number,
            youtube_video_id: e.youtube_video_id,
            tags: [],
          });
        }
      }
    }

    return results;
  });

export type TopicCount = { tag: string; count: number };

export const getTopicCounts = createServerFn({ method: "GET" })
  .inputValidator((data: { category: string }) => data)
  .handler(async ({ data }): Promise<TopicCount[]> => {
    const supabase = getPublicClient();
    const { data: rows, error } = await supabase
      .from("exam_tags")
      .select("tag, exams!inner(status, category)")
      .eq("exams.status", "published")
      .eq("exams.category", data.category as any);
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const r of (rows || []) as any[]) {
      counts.set(r.tag, (counts.get(r.tag) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([tag, count]) => ({ tag, count }));
  });

export type RecentAttempt = {
  id: string;
  exam_id: string | null;
  exam_slug: string | null;
  exam_title: string;
  attempt_type: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total: number;
};

export const getRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RecentAttempt[]> => {
    const { data, error } = await context.supabase
      .from("user_attempts")
      .select("id, exam_id, attempt_type, started_at, completed_at, score, total, exams(slug, title)")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      exam_id: r.exam_id,
      exam_slug: r.exams?.slug ?? null,
      exam_title: r.exams?.title ?? (r.attempt_type === "review" ? "Weak Spots Review" : "Exam"),
      attempt_type: r.attempt_type,
      started_at: r.started_at,
      completed_at: r.completed_at,
      score: r.score,
      total: r.total,
    }));
  });
