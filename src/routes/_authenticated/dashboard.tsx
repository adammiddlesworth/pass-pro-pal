import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import {
  PlayCircle,
  Flame,
  RefreshCw,
  ArrowRight,
  BarChart3,
  Sparkles,
  Target,
  CalendarIcon,
  Clock,
  Lock,
} from "lucide-react";
import { FINAL_UNLOCK_READINESS } from "@/lib/readiness";
import { useAuth } from "@/hooks/use-auth";
import { getActiveTrack } from "@/lib/track.functions";
import {
  getUpNext,
  getStreak,
  getRecentActivity,
  getReadiness,
  getStudyTime,
} from "@/lib/dashboard.functions";
import { updateTestDate } from "@/lib/profile.functions";
import type { DashboardReadiness } from "@/lib/dashboard.functions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatStudyDuration } from "@/lib/utils";
import { WeeklyChallengeCard } from "@/components/WeeklyChallengeCard";
import { DiagnosticCard } from "@/components/DiagnosticCard";
import { useTrackCheckout } from "@/hooks/use-track-checkout";

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

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  return diff;
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

      <ReadinessHero category={cat} />

      {!trackInfo.hasFullAccess && (
        <div className="mt-6">
          <DiagnosticCard category={cat} />
        </div>
      )}

      <div className="mt-6">
        <WeeklyChallengeCard category={cat} />
      </div>

      <div className="mt-6">
        <UpNextCard category={cat} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <StreakCard />
        <StudyTimeCard />
        <PersonalizedReviewCard category={cat} unlocked={!!trackInfo.hasFullAccess} />
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
    return <Card className="h-32 animate-pulse bg-muted/40" />;
  }
  if (!data || data.kind === "none") {
    return (
      <Card className="border-primary/30 bg-primary/5">
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
    data.kind === "resume" ? "Resume" : data.kind === "retake" ? "Retake" : "Start";

  return (
    <Card className="border-primary/30 bg-primary/5">
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

function colorMeta(color: DashboardReadiness["color"]) {
  return color === "green"
    ? { text: "text-emerald-500", stroke: "stroke-emerald-500", pill: "bg-emerald-500/15 text-emerald-500", ring: "ring-emerald-500/30" }
    : color === "amber"
      ? { text: "text-amber-500", stroke: "stroke-amber-500", pill: "bg-amber-500/15 text-amber-500", ring: "ring-amber-500/30" }
      : { text: "text-rose-500", stroke: "stroke-rose-500", pill: "bg-rose-500/15 text-rose-500", ring: "ring-rose-500/30" };
}

function ReadinessHero({ category }: { category: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["readiness", category],
    queryFn: () => getReadiness({ data: { category } }),
  });

  const score = data?.readiness ?? 0;
  const meta = colorMeta(data?.color ?? "red");
  const hasData = !!data && data.breakdown.recent > 0;
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(100, Math.max(0, score)) / 100);

  const bd = data?.breakdown;
  const breakdownTooltip = bd
    ? `Recent ${bd.recent} · Coverage ${bd.coverage} · Weak spots ${bd.weakSpotScore} · Consistency ${bd.consistency}`
    : undefined;

  return (
    <Card>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="h-[180px] animate-pulse rounded bg-muted/40" />
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Ring */}
            <div
              className="relative h-[144px] w-[144px] shrink-0"
              title={breakdownTooltip}
            >
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-muted" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={hasData ? meta.stroke : "stroke-muted"}
                  strokeDasharray={circ}
                  strokeDashoffset={hasData ? offset : circ}
                  style={{ transition: "stroke-dashoffset 600ms ease" }}
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold leading-none ${hasData ? "text-foreground" : "text-muted-foreground"}`}>
                  {hasData ? score : "—"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>

            {/* Right column */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                Exam-Day Readiness
              </div>
              {hasData && data && (
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${meta.pill}`}>
                    <span className={`h-1.5 w-1.5 rounded-full bg-current`} />
                    {data.status}
                  </span>
                </div>
              )}
              <p className="mt-3 text-sm leading-snug text-muted-foreground">
                {data?.reason ?? "Take an exam to get your first readiness score."}
              </p>

              {data?.hasTimedFinal && !data?.passedTimedFinal && data?.timedFinalSlug && (
                score >= FINAL_UNLOCK_READINESS ? (
                  <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <Target className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
                      <div>
                        <p className="font-semibold text-foreground">You're ready for the Timed Final Exam</p>
                        <p className="text-sm text-muted-foreground">Pass it to prove you're exam-ready.</p>
                      </div>
                    </div>
                    <Link to="/exams/$slug/take" params={{ slug: data.timedFinalSlug }} className="mt-3 block">
                      <Button className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600/90">
                        Take the Timed Final Exam
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-border p-4">
                    <div className="flex items-start gap-3">
                      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-semibold text-foreground">Timed Final Exam</p>
                        <p className="text-sm text-muted-foreground">
                          unlocks at {FINAL_UNLOCK_READINESS}% readiness
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${meta.stroke.replace("stroke-", "bg-")}`}
                          style={{ width: `${Math.min(100, (score / FINAL_UNLOCK_READINESS) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {score} / {FINAL_UNLOCK_READINESS}
                      </span>
                    </div>
                  </div>
                )
              )}
              {data && !data.hasTimedFinal && (
                <p className="mt-2 text-xs italic text-muted-foreground">
                  Timed final exam coming soon for this track.
                </p>
              )}

              <div className="mt-4 border-t border-border pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <MiniStat
                    value={data?.recentAvgPct !== null && data?.recentAvgPct !== undefined ? `${data.recentAvgPct}%` : "—"}
                    label="Recent avg"
                    tone={
                      data?.recentAvgPct === null || data?.recentAvgPct === undefined
                        ? "muted"
                        : data.recentAvgPct >= 80
                          ? "emerald"
                          : data.recentAvgPct >= 65
                            ? "amber"
                            : "rose"
                    }
                  />
                  <MiniStat
                    value={data ? `${data.topicsPracticed}/${data.topicsTotal}` : "—"}
                    label="Topics covered"
                    tone={
                      !data
                        ? "muted"
                        : data.topicsPracticed >= data.topicsTotal * 0.8
                          ? "emerald"
                          : data.topicsPracticed >= data.topicsTotal * 0.5
                            ? "amber"
                            : "rose"
                    }
                  />
                  <TestDateStat testDate={data?.testDate ?? null} category={category} />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  value,
  label,
  tone = "default",
}: {
  value: string;
  label: string;
  tone?: "default" | "emerald" | "amber" | "rose" | "muted";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-500"
      : tone === "amber"
        ? "text-amber-500"
        : tone === "rose"
          ? "text-rose-500"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";
  return (
    <div>
      <div className={`text-xl font-bold tabular-nums ${toneClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function TestDateStat({ testDate, category }: { testDate: string | null; category: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const handleSelect = async (d: Date | undefined) => {
    if (!d) return;
    const iso = format(d, "yyyy-MM-dd");
    await updateTestDate({ data: { date: iso } });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["readiness", category] });
  };

  const handleClear = async () => {
    await updateTestDate({ data: { date: null } });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["readiness", category] });
  };

  if (!testDate) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="text-left">
            <div className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              <CalendarIcon className="h-4 w-4" />
              Set date
            </div>
            <div className="text-xs text-muted-foreground">Until test</div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            onSelect={handleSelect}
            initialFocus
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    );
  }

  const days = daysUntil(testDate);
  const tone =
    days <= 7 ? "text-rose-500" : days <= 30 ? "text-amber-500" : "text-foreground";
  const valueLabel =
    days < 0 ? "Passed" : days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-left">
          <div className={`text-xl font-bold tabular-nums ${tone} hover:underline`}>{valueLabel}</div>
          <div className="text-xs text-muted-foreground">Until test · {format(new Date(testDate + "T00:00:00"), "MMM d")}</div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={new Date(testDate + "T00:00:00")}
          onSelect={handleSelect}
          initialFocus
          disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
          className={cn("p-3 pointer-events-auto")}
        />
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full" onClick={handleClear}>
            Clear date
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StreakCard() {
  const { data } = useQuery({ queryKey: ["streak"], queryFn: () => getStreak() });
  const days = data?.week_activity ?? Array(7).fill(false);
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay();

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
                  {isToday ? "T" : active ? "✓" : labels[i]}
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Best streak: {data?.best_streak ?? 0} days · Don't break the chain!
        </p>
      </CardContent>
    </Card>
  );
}

function StudyTimeCard() {
  const { data } = useQuery({ queryKey: ["study-time"], queryFn: () => getStudyTime() });
  const total = data?.total_seconds ?? 0;
  const week = data?.week_seconds ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" />
          Time studied
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold tabular-nums">
          {formatStudyDuration(total)}
        </div>
        <div className="text-xs text-muted-foreground">All time</div>
        <p className="mt-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {formatStudyDuration(week)}
          </span>{" "}
          this week
        </p>
      </CardContent>
    </Card>
  );
}


function PersonalizedReviewCard({ category, unlocked }: { category: string; unlocked: boolean }) {
  const { data } = useQuery({
    queryKey: ["readiness", category],
    queryFn: () => getReadiness({ data: { category } }),
  });
  const weakest = data?.weakestTopics ?? [];
  const { openCheckout, checkingOut } = useTrackCheckout(category);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-primary" />
          Personalized review
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!unlocked ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Unlock full access to auto-generate a review from questions you've missed.
            </p>
            <Button variant="outline" size="sm" onClick={() => openCheckout()} disabled={checkingOut}>
              {checkingOut ? "Loading…" : "Upgrade to unlock"}
            </Button>
          </div>
        ) : weakest.length === 0 ? (
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
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Your review session</p>
                <p className="text-xs text-muted-foreground">Built from your weak spots</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {weakest.map((t) => {
                const tone =
                  t.score >= 80 ? "text-emerald-500" : t.score >= 65 ? "text-amber-500" : "text-rose-500";
                return (
                  <li key={t.slug} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate text-foreground">{t.name}</span>
                    <span className={`font-semibold tabular-nums ${tone}`}>{t.score}%</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4">
              <Link to="/review/$category" params={{ category }}>
                <Button variant="outline" size="sm" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Start review session
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
