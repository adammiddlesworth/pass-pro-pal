import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState, useEffect, useMemo } from "react";
import { Search, Sparkles, Youtube, PlayCircle, BookOpen } from "lucide-react";
import { searchExams, getTopicCounts } from "@/lib/dashboard.functions";
import { getActiveTrack } from "@/lib/track.functions";
import { getUserCategoryAccess } from "@/lib/exams.functions";
import { getTopicsForCategory, getTopicLabel } from "@/lib/topics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { WeeklyChallengeCard } from "@/components/WeeklyChallengeCard";

const search = z.object({
  topic: z.string().optional().catch(undefined),
  q: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/exams/")({
  validateSearch: zodValidator(search),
  component: ExamsBrowser,
});

const CATEGORY_LABEL: Record<string, string> = {
  real_estate: "Real Estate",
  life_health_insurance: "Life & Health Insurance",
};

function ExamsBrowser() {
  const { topic, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [localQ, setLocalQ] = useState(q);

  useEffect(() => {
    const t = setTimeout(() => {
      if (localQ !== q) navigate({ search: (prev: any) => ({ ...prev, q: localQ }) });
    }, 250);
    return () => clearTimeout(t);
  }, [localQ, q, navigate]);

  useEffect(() => setLocalQ(q), [q]);

  const { data: trackInfo, isLoading: trackLoading } = useQuery({
    queryKey: ["active-track"],
    queryFn: () => getActiveTrack(),
  });
  const { data: access } = useQuery({
    queryKey: ["category-access"],
    queryFn: () => getUserCategoryAccess(),
  });

  if (trackLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">Loading…</div>;
  }

  const cat = trackInfo?.track;
  if (!cat) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-sm text-muted-foreground">Choose a track to see exams.</p>
        <Link to="/select-track" className="mt-4 inline-block text-primary underline">
          Pick your track
        </Link>
      </div>
    );
  }

  const unlocked = !!access?.[cat];
  const catLabel = CATEGORY_LABEL[cat];

  // Topic grid
  if (!topic) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-6">
          <WeeklyChallengeCard />
        </div>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{catLabel} exams</h1>
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/exams" search={{ q: "" }} className="hover:text-foreground">
          {catLabel} topics
        </Link>
        <span>/</span>
        <span className="text-foreground">{getTopicLabel(cat, topic) ?? topic}</span>
      </div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{getTopicLabel(cat, topic) ?? topic}</h1>
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
          placeholder="Search exams by title or topic…"
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
            to="/exams"
            search={{ topic: t.slug, q: "" }}
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

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading exams…</p>;
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {q ? <>No exams match “{q}”.</> : <>No exams here yet. Check back soon.</>}
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
              {unlocked ? <Badge>Unlocked</Badge> : <Badge variant="secondary">Free preview</Badge>}
            </div>
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
