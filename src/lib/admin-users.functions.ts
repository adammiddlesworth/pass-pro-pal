import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeAttemptSeconds } from "@/lib/utils";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin role required");
}

export type AdminUserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  active_track: string | null;
  test_date: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  attempts_total: number;
  attempts_completed: number;
  avg_score_pct: number | null;
  last_active_at: string | null;
  purchases_count: number;
};

export type AdminUsersPage = {
  users: AdminUserRow[];
  total: number;
  page: number;
  perPage: number;
};

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { search?: string; page?: number; perPage?: number }) => d
  )
  .handler(async ({ data, context }): Promise<AdminUsersPage> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const page = Math.max(1, data.page ?? 1);
    const perPage = Math.min(200, Math.max(10, data.perPage ?? 50));

    const { data: usersRes, error: uErr } =
      await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (uErr) throw uErr;
    const authUsers = usersRes?.users ?? [];
    const search = (data.search ?? "").trim().toLowerCase();

    const ids = authUsers.map((u) => u.id);
    const [profilesRes, attemptsRes, purchasesRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, active_track, test_date")
        .in("id", ids),
      supabaseAdmin
        .from("user_attempts")
        .select("user_id, score, total, completed_at, started_at")
        .in("user_id", ids),
      supabaseAdmin
        .from("purchases")
        .select("user_id, status")
        .in("user_id", ids),
    ]);

    const profileMap = new Map<string, any>(
      (profilesRes.data || []).map((p: any) => [p.id, p])
    );
    const attemptsByUser = new Map<string, any[]>();
    for (const a of attemptsRes.data || []) {
      const arr = attemptsByUser.get((a as any).user_id) || [];
      arr.push(a);
      attemptsByUser.set((a as any).user_id, arr);
    }
    const purchasesByUser = new Map<string, number>();
    for (const p of purchasesRes.data || []) {
      if ((p as any).status !== "completed") continue;
      purchasesByUser.set(
        (p as any).user_id,
        (purchasesByUser.get((p as any).user_id) || 0) + 1
      );
    }

    let rows: AdminUserRow[] = authUsers.map((u) => {
      const prof = profileMap.get(u.id);
      const atts = attemptsByUser.get(u.id) || [];
      const completed = atts.filter((a: any) => a.completed_at);
      const pcts = completed
        .filter((a: any) => a.total > 0)
        .map((a: any) => (a.score / a.total) * 100);
      const avg =
        pcts.length > 0 ? pcts.reduce((s, v) => s + v, 0) / pcts.length : null;
      const lastActive = atts
        .map((a: any) => a.completed_at || a.started_at)
        .filter(Boolean)
        .sort()
        .slice(-1)[0] as string | undefined;
      return {
        id: u.id,
        email: u.email ?? null,
        display_name: prof?.display_name ?? null,
        active_track: prof?.active_track ?? null,
        test_date: prof?.test_date ?? null,
        created_at: u.created_at,
        last_sign_in_at: (u as any).last_sign_in_at ?? null,
        attempts_total: atts.length,
        attempts_completed: completed.length,
        avg_score_pct: avg,
        last_active_at: lastActive ?? null,
        purchases_count: purchasesByUser.get(u.id) || 0,
      };
    });

    if (search) {
      rows = rows.filter(
        (r) =>
          (r.email || "").toLowerCase().includes(search) ||
          (r.display_name || "").toLowerCase().includes(search)
      );
    }

    return {
      users: rows,
      total: (usersRes as any)?.total ?? rows.length,
      page,
      perPage,
    };
  });

export type AdminUserDetail = {
  id: string;
  email: string | null;
  display_name: string | null;
  active_track: string | null;
  test_date: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  streak: {
    current_streak: number;
    best_streak: number;
    last_active_date: string | null;
  } | null;
  purchases: Array<{
    id: string;
    product_id: string;
    price_id: string;
    status: string;
    environment: string;
    created_at: string;
  }>;
  attempts: Array<{
    id: string;
    attempt_type: string;
    exam_id: string | null;
    exam_title: string | null;
    exam_category: string | null;
    category: string | null;
    score: number | null;
    total: number;
    started_at: string;
    completed_at: string | null;
  }>;
  categoryRollup: Array<{
    category: string;
    attempts: number;
    answered: number;
    correct: number;
    accuracy_pct: number | null;
  }>;
};

export const getUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }): Promise<AdminUserDetail> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const [userRes, profileRes, rolesRes, streakRes, purchasesRes, attemptsRes] =
      await Promise.all([
        supabaseAdmin.auth.admin.getUserById(data.userId),
        supabaseAdmin
          .from("profiles")
          .select("display_name, active_track, test_date")
          .eq("id", data.userId)
          .maybeSingle(),
        supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", data.userId),
        supabaseAdmin
          .from("user_streaks")
          .select("current_streak, best_streak, last_active_date")
          .eq("user_id", data.userId)
          .maybeSingle(),
        supabaseAdmin
          .from("purchases")
          .select("id, product_id, price_id, status, environment, created_at")
          .eq("user_id", data.userId)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("user_attempts")
          .select(
            "id, attempt_type, exam_id, category, score, total, started_at, completed_at, exams(title, category)"
          )
          .eq("user_id", data.userId)
          .order("started_at", { ascending: false })
          .limit(200),
      ]);

    const user = userRes.data?.user;
    const attempts = (attemptsRes.data || []).map((a: any) => ({
      id: a.id,
      attempt_type: a.attempt_type,
      exam_id: a.exam_id,
      exam_title: a.exams?.title ?? null,
      exam_category: a.exams?.category ?? null,
      category: a.category ?? null,
      score: a.score,
      total: a.total,
      started_at: a.started_at,
      completed_at: a.completed_at,
    }));

    // Category rollup from answers
    const attemptIds = attempts.map((a) => a.id);
    const rollupMap = new Map<
      string,
      { attempts: number; answered: number; correct: number }
    >();
    for (const a of attempts) {
      const cat = a.category || a.exam_category || "uncategorized";
      const cur = rollupMap.get(cat) || {
        attempts: 0,
        answered: 0,
        correct: 0,
      };
      cur.attempts += 1;
      rollupMap.set(cat, cur);
    }
    if (attemptIds.length > 0) {
      const { data: ans } = await supabaseAdmin
        .from("user_answers")
        .select("attempt_id, is_correct")
        .in("attempt_id", attemptIds);
      const attemptCat = new Map(
        attempts.map((a) => [a.id, a.category || a.exam_category || "uncategorized"])
      );
      for (const row of ans || []) {
        const cat = attemptCat.get((row as any).attempt_id) || "uncategorized";
        const cur = rollupMap.get(cat)!;
        cur.answered += 1;
        if ((row as any).is_correct) cur.correct += 1;
      }
    }
    const categoryRollup = Array.from(rollupMap.entries()).map(([category, v]) => ({
      category,
      attempts: v.attempts,
      answered: v.answered,
      correct: v.correct,
      accuracy_pct: v.answered > 0 ? (v.correct / v.answered) * 100 : null,
    }));

    return {
      id: data.userId,
      email: user?.email ?? null,
      display_name: (profileRes.data as any)?.display_name ?? null,
      active_track: (profileRes.data as any)?.active_track ?? null,
      test_date: (profileRes.data as any)?.test_date ?? null,
      created_at: user?.created_at ?? "",
      last_sign_in_at: (user as any)?.last_sign_in_at ?? null,
      roles: (rolesRes.data || []).map((r: any) => r.role),
      streak: (streakRes.data as any) ?? null,
      purchases: (purchasesRes.data || []) as any,
      attempts,
      categoryRollup,
    };
  });
