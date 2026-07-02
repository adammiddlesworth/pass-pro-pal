import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Search, Sparkles, Youtube, Building2, HeartPulse, PlayCircle, BookOpen } from "lucide-react";
import { searchExams, getRecentActivity, getTopicCounts } from "@/lib/dashboard.functions";
import { getUserCategoryAccess } from "@/lib/exams.functions";
import { getTopicsForCategory, getTopicLabel } from "@/lib/topics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";

const CATEGORIES = [
  {
    id: "real_estate",
    label: "Real Estate",
    blurb: "Practice exams for your real estate licensing test.",
    icon: Building2,
    accent: "from-primary/20 to-primary/5",
  },
  {
    id: "life_health_insurance",
    label: "Life & Health Insurance",
    blurb: "Practice exams for your life & health insurance licensing test.",
    icon: HeartPulse,
    accent: "from-secondary/20 to-secondary/5",
  },
] as const;

const dashboardSearch = z.object({
  cat: z.enum(["real_estate", "life_health_insurance"]).optional().catch(undefined),
  topic: z.string().optional().catch(undefined),
  q: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: zodValidator(dashboardSearch),
  component: DashboardPage,
});

function DashboardPage() {
  const { cat, topic, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard" });
  const [localQ, setLocalQ] = useState(q);

  useEffect(() => {
    const t = setTimeout(() => {
      if (localQ !== q) {
        navigate({ search: (prev: any) => ({ ...prev, q: localQ }) });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [localQ, q, navigate]);

  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  const { data: access } = useQuery({
    queryKey: ["category-access"],
    queryFn: () => getUserCategoryAccess(),
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: () => getRecentActivity(),
  });

  // View 1: no category picked → track chooser
  if (!cat) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="mt-2 text-muted-foreground">Pick a track to start practicing.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const unlocked = !!access?.[c.id];
            return (
              <Link
                key={c.id}
                to="/dashboard"
                search={{ cat: c.id, q: "" }}
                className={`group relative overflow-hidden rounded-lg border bg-gradient-to-br ${c.accent} p-6 transition-shadow hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <Icon className="h-10 w-10 text-primary" />
                  {unlocked && <Badge>Unlocked</Badge>}
                </div>
                <h2 className="mt-4 text-xl font-semibold">{c.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
                <div className="mt-4 text-sm font-medium text-primary">Browse exams &rarr;</div>
              </Link>
            );
          })}
        </div>

        {recent && recent.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-semibold">Recent activity</h2>
            <RecentList recent={recent} />
          </section>
        )}
      </div>
    );
  }

  const categoryMeta = CATEGORIES.find((c) => c.id === cat)!;
  const unlocked = !!access?.[cat];
  const topics = getTopicsForCategory(cat);
  const hasTopics = topics.length > 0;

  // View 2: category picked, has topics defined, no topic selected → topic grid
  if (hasTopics && !topic) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-2">
          <Link to="/dashboard" search={{ cat: undefined, q: "" }} className="text-sm text-muted-foreground hover:text-foreground">
            &larr; All tracks
          </Link>
        </div>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{categoryMeta.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose a topic to see practice exams.</p>
          </div>
          {unlocked && (
            <Link to="/review/$category" params={{ category: cat }}>
              <Button variant="secondary">
                <Sparkles className="mr-2 h-4 w-4" />
                Review My Weak Spots
              </Button>
            </Link>
          )}
        </div>

        <div className="relative mb-8">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Filter topics…"
            className="pl-9"
          />
        </div>

        <TopicGrid category={cat} q={q} />
      </div>
    );
  }

  // View 3: category (+ optional topic) → exam results
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard" search={{ cat: undefined, q: "" }} className="hover:text-foreground">
          All tracks
        </Link>
        <span>/</span>
        {hasTopics ? (
          <>
            <Link to="/dashboard" search={{ cat, q: "" }} className="hover:text-foreground">
              {categoryMeta.label}
            </Link>
            {topic && (
              <>
                <span>/</span>
                <span className="text-foreground">{getTopicLabel(cat, topic) ?? topic}</span>
              </>
            )}
          </>
        ) : (
          <span className="text-foreground">{categoryMeta.label}</span>
        )}
      </div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {topic ? getTopicLabel(cat, topic) ?? topic : categoryMeta.label}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{categoryMeta.blurb}</p>
        </div>
        {unlocked && (
          <Link to="/review/$category" params={{ category: cat }}>
            <Button variant="secondary">
              <Sparkles className="mr-2 h-4 w-4" />
              Review My Weak Spots
            </Button>
          </Link>
        )}
      </div>

      <div className="relative mb-8">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder={`Search exams by title or topic…`}
          className="pl-9"
        />
      </div>

      <ExamResults category={cat} q={q} topic={topic} unlocked={unlocked} />
    </div>
  );
}

function TopicGrid({ category, q }: { category: string; q: string }) {
  const topics = getTopicsForCategory(category);
  const { data: counts } = useQuery({
    queryKey: ["topic-counts", category],
    queryFn: () => getTopicCounts({ data: { category } }),
  });
  const countMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of counts ?? []) m.set(c.tag, c.count);
    return m;
  }, [counts]);

  const filtered = q.trim()
    ? topics.filter((t) => t.label.toLowerCase().includes(q.trim().toLowerCase()))
    : topics;

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No topics match “{q}”.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((t) => {
        const count = countMap.get(t.slug) ?? 0;
        return (
          <Link
            key={t.slug}
            to="/dashboard"
            search={{ cat: category as any, topic: t.slug, q: "" }}
            className="group flex h-full flex-col justify-between rounded-lg border bg-card p-4 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="font-medium leading-snug">{t.label}</span>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {count === 0 ? "Coming soon" : `${count} exam${count === 1 ? "" : "s"}`}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ExamResults({
  category,
  q,
  topic,
  unlocked,
}: {
  category: string;
  q: string;
  topic: string | undefined;
  unlocked: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["search-exams", category, q, topic ?? ""],
    queryFn: () => searchExams({ data: { category, q, topic } }),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading exams…</p>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {q ? <>No exams match “{q}”. Try a different keyword.</> : <>No exams here yet. Check back soon.</>}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((exam) => (
        <Card key={exam.id} className="flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg leading-tight">
                {exam.exam_number ? `#${exam.exam_number} · ` : ""}
                {exam.title}
              </CardTitle>
              {unlocked ? (
                <Badge>Unlocked</Badge>
              ) : (
                <Badge variant="secondary">Free preview</Badge>
              )}
            </div>
            {exam.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {exam.tags.slice(0, 4).map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px] font-normal">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="mt-auto space-y-3">
            <p className="text-sm text-muted-foreground">
              {exam.question_count} questions
              {exam.youtube_video_id && (
                <span className="ml-2 inline-flex items-center gap-1 text-primary">
                  <Youtube className="h-3.5 w-3.5" /> Video
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/exams/$slug" params={{ slug: exam.slug }}>
                <Button size="sm">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {unlocked ? "Start" : "Free preview"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecentList({ recent }: { recent: NonNullable<Awaited<ReturnType<typeof getRecentActivity>>> }) {
  return (
    <div className="space-y-2">
      {recent.map((r) => {
        const done = !!r.completed_at;
        const scoreLine = done && r.score !== null ? `${r.score} / ${r.total}` : "In progress";
        return (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{r.exam_title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.started_at).toLocaleString()} · {scoreLine}
              </p>
            </div>
            {r.exam_slug ? (
              <Link to="/exams/$slug" params={{ slug: r.exam_slug }}>
                <Button size="sm" variant="outline">
                  {done ? "Retake" : "Resume"}
                </Button>
              </Link>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
