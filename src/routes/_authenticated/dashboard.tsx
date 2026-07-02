import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PlayCircle,
  ClipboardCheck,
  BarChart3,
  Target,
  Flame,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getActiveTrack } from "@/lib/track.functions";
import { getUserCategoryAccess } from "@/lib/exams.functions";
import {
  getDashboardStats,
  getUpNext,
  getStreak,
  getRecentActivity,
} from "@/lib/dashboard.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  real_estate: "Real Estate",
  life_health_insurance: "Life & Health Insurance",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const { user } = useAuth();
  const { data: trackInfo, isLoading: trackLoading } = useQuery({
    queryKey: ["active-track"],
    queryFn: () => getActiveTrack(),
  });

  if (trackLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!trackInfo?.track) {
    return <Navigate to="/select-track" />;
  }

  const cat = trackInfo.track;
  const displayName =
    (user?.user_metadata as any)?.display_name ||
    (user?.user_metadata as any)?.full_name ||
    (user?.email?.split("@")[0] ?? "friend");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {greeting()}, <span className="font-medium text-foreground">{displayName}</span> 👋
          </p>
          <h1 className="text-3xl font-bold">Your dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track: <span className="font-medium text-foreground">{CATEGORY_LABEL[cat]}</span>
            {!trackInfo.locked && (
              <>
                {" · "}
                <Link to="/select-track" className="text-primary hover:underline">
                  switch
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <UpNextCard category={cat} />
      <StatsRow category={cat} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StreakCard />
        <WeaknessCard category={cat} unlocked={!!trackInfo.locked} />
      </div>

      <div className="mt-6">
        <RecentCard category={cat} />
      </div>
    </div>
  );
}

function UpNextCard({ category }: { category: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["up-next", category],
    queryFn: () => getUpNext({ data: { category } }),
  });

  if (isLoading) {
    return <Card className="mb-6 h-32 animate-pulse bg-muted/40" />;
  }
  if (!data || data.kind === "none") {
    return (
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Up next</p>
            <p className="mt-1 text-lg font-semibold">No exams available yet</p>
            <p className="text-sm text-muted-foreground">Check the exams library.</p>
          </div>
          <Link to="/exams" search={{ q: "" }}>
            <Button>Browse exams</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const label =
    data.kind === "resume" ? "Resume" : data.kind === "retake" ? "Retake" : "Start exam";

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ArrowRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Up next</p>
            <p className="mt-1 text-lg font-semibold leading-tight">
              {data.topic_label ? `${data.topic_label} — ` : ""}
              {data.exam_number ? `Practice Exam ${data.exam_number}` : data.exam_title}
            </p>
            <p className="text-sm text-muted-foreground">
              {data.question_count} questions · ~{data.estimated_minutes} min
              {data.kind === "retake" && " · Lowest score — worth a retake"}
            </p>
          </div>
        </div>
        <Link to="/exams/$slug" params={{ slug: data.exam_slug }}>
          <Button size="lg">
            <PlayCircle className="mr-2 h-5 w-5" />
            {label}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function StatsRow({ category }: { category: string }) {
  const { data } = useQuery({
    queryKey: ["dashboard-stats", category],
    queryFn: () => getDashboardStats({ data: { category } }),
  });
  const stats = data ?? {
    exams_taken: 0,
    exams_taken_week: 0,
    avg_score_pct: null,
    avg_score_delta_pct: null,
    questions_answered: 0,
    questions_total: 0,
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        icon={ClipboardCheck}
        label="Exams taken"
        value={String(stats.exams_taken)}
        sub={
          stats.exams_taken_week > 0
            ? { text: `${stats.exams_taken_week} this week`, positive: true }
            : { text: "None this week", positive: false }
        }
      />
      <StatCard
        icon={BarChart3}
        label="Avg score"
        value={stats.avg_score_pct !== null ? `${stats.avg_score_pct}%` : "—"}
        sub={
          stats.avg_score_delta_pct !== null
            ? {
                text: `${stats.avg_score_delta_pct >= 0 ? "Up" : "Down"} ${Math.abs(
                  stats.avg_score_delta_pct
                )}% this month`,
                positive: stats.avg_score_delta_pct >= 0,
              }
            : null
        }
      />
      <StatCard
        icon={Target}
        label="Questions answered"
        value={String(stats.questions_answered)}
        sub={{ text: `of ${stats.questions_total} total`, positive: null }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string;
  sub: { text: string; positive: boolean | null } | null;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <div className="mt-2 text-4xl font-bold tracking-tight">{value}</div>
        {sub && (
          <div
            className={`mt-2 flex items-center gap-1 text-xs ${
              sub.positive === true
                ? "text-emerald-500"
                : sub.positive === false
                  ? "text-muted-foreground"
                  : "text-muted-foreground"
            }`}
          >
            {sub.positive === true && <TrendingUp className="h-3 w-3" />}
            {sub.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StreakCard() {
  const { data } = useQuery({ queryKey: ["streak"], queryFn: () => getStreak() });
  const days = data?.week_activity ?? Array(7).fill(false);
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay(); // 0 = Sunday

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="h-5 w-5 text-orange-500" />
          Daily streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-6">
          <div>
            <div className="text-4xl font-bold">{data?.current_streak ?? 0}</div>
            <div className="text-xs text-muted-foreground">days in a row</div>
          </div>
          <div className="flex flex-1 gap-1.5">
            {days.map((active: boolean, i: number) => {
              const isToday = i === today;
              return (
                <div
                  key={i}
                  className={`flex h-10 flex-1 flex-col items-center justify-center rounded-md border text-xs font-medium ${
                    isToday
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                        : "border-border bg-muted/40 text-muted-foreground"
                  }`}
                  title={isToday ? "Today" : labels[i]}
                >
                  {isToday ? "Today" : active ? "✓" : labels[i]}
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Best streak: {data?.best_streak ?? 0} days
          {data?.streak_start_date ? ` · Started ${data.streak_start_date}` : ""}.
        </p>
      </CardContent>
    </Card>
  );
}

function WeaknessCard({ category, unlocked }: { category: string; unlocked: boolean }) {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", category],
    queryFn: () => getDashboardStats({ data: { category } }),
  });
  const avg = stats?.avg_score_pct ?? null;
  const pass = 70;
  const needsWork = avg !== null && avg < pass;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
          Weakness exam
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!unlocked ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Unlock full access to auto-generate a review from questions you've missed.
            </p>
            <Link to="/exams" search={{ q: "" }}>
              <Button variant="outline" size="sm">
                Upgrade to unlock
              </Button>
            </Link>
          </div>
        ) : avg === null ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Complete a few exams and we'll surface the areas that need the most attention.
            </p>
            <Link to="/exams" search={{ q: "" }}>
              <Button variant="outline" size="sm">
                Start an exam
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">Your avg: {avg}%</span>
              <span className="text-muted-foreground">Pass mark: {pass}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${needsWork ? "bg-rose-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(100, avg)}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {needsWork
                ? "You're below the pass mark — retake weak questions to close the gap."
                : "You're above the pass mark. A weakness review keeps you sharp."}
            </p>
            <div className="mt-4">
              <Link to="/review/$category" params={{ category }}>
                <Button variant="outline" size="sm" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retake weakness exam
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentCard({ category }: { category: string }) {
  const { data } = useQuery({
    queryKey: ["recent-activity", category],
    queryFn: () => getRecentActivity({ data: { category } }),
  });
  const recent = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent exams</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet — take an exam to see it here.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((r) => {
              const pct = r.total > 0 && r.score !== null ? Math.round((r.score / r.total) * 100) : null;
              const color =
                pct === null
                  ? "text-muted-foreground"
                  : pct >= 80
                    ? "text-emerald-500"
                    : pct >= 65
                      ? "text-amber-500"
                      : "text-rose-500";
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.exam_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.started_at).toLocaleDateString()}
                      {r.completed_at ? "" : " · in progress"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${color}`}>{pct !== null ? `${pct}%` : "—"}</span>
                    {r.exam_slug && (
                      <Link to="/exams/$slug" params={{ slug: r.exam_slug }}>
                        <Button size="sm" variant="ghost">
                          {r.completed_at ? "Retake" : "Resume"}
                        </Button>
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
