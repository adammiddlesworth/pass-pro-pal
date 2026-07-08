import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, PlayCircle, Trophy, ArrowRight, Target, ChevronRight, UserPlus } from "lucide-react";
import {
  startDiagnostic,
  completeDiagnostic,
  type DiagnosticPayload,
  type DiagnosticResult,
} from "@/lib/diagnostic.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CATEGORY_LABEL: Record<string, string> = {
  real_estate: "Real Estate",
  life_health_insurance: "Life & Health Insurance",
};

export const Route = createFileRoute("/diagnostic/$category")({
  ssr: false,
  component: DiagnosticPage,
});

function DiagnosticPage() {
  const { category } = Route.useParams();
  const [payload, setPayload] = useState<DiagnosticPayload | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!CATEGORY_LABEL[category]) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-muted-foreground">Unknown track.</p>
      </div>
    );
  }

  if (result) return <ResultView result={result} onRetake={() => { setPayload(null); setResult(null); }} />;
  if (payload) return <QuizView payload={payload} onComplete={(r) => setResult(r)} />;
  return <IntroView category={category} authed={authed} onStart={(p) => setPayload(p)} />;
}

function IntroView({
  category,
  authed,
  onStart,
}: {
  category: string;
  authed: boolean | null;
  onStart: (p: DiagnosticPayload) => void;
}) {
  const [loading, setLoading] = useState(false);
  const handleStart = async () => {
    setLoading(true);
    try {
      const p = await startDiagnostic({ data: { category } });
      onStart(p);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Couldn't start diagnostic");
    } finally {
      setLoading(false);
    }
  };
  const redirectPath = `/diagnostic/${category}`;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Target className="h-3.5 w-3.5" />
            Free Diagnostic · {CATEGORY_LABEL[category]}
          </div>
          <h1 className="mt-2 text-3xl font-bold">Where do you stand?</h1>
          <p className="mt-3 text-muted-foreground">
            A ~20-question sample across every exam topic. Takes about 10 minutes.
            When you finish, we'll show your readiness score and pinpoint the topics
            slowing you down.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 text-primary" />
              Free — no purchase required.
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 text-primary" />
              Covers every topic on the licensing exam.
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 text-primary" />
              Retake with a new sample each week.
            </li>
          </ul>
          {authed === false ? (
            <>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth" search={{ mode: "signup", redirect: redirectPath }}>
                  <Button size="lg">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Create free account to start
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/auth"
                  search={{ mode: "signin", redirect: redirectPath }}
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={handleStart} disabled={loading || authed === null}>
                <PlayCircle className="mr-2 h-5 w-5" />
                {loading ? "Loading…" : "Start diagnostic"}
              </Button>
              <Link to="/dashboard">
                <Button variant="outline" size="lg">Back to dashboard</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function QuizView({ payload, onComplete }: { payload: DiagnosticPayload; onComplete: (r: DiagnosticResult) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const submitRef = useRef(false);
  const questions = payload.questions;

  const complete = useMutation({
    mutationFn: async () => {
      const answers = questions.map((q) => {
        const selId = selected[q.id];
        const correct = q.answers.find((a) => a.is_correct);
        return {
          questionId: q.id,
          answerId: selId,
          isCorrect: selId === correct?.id,
          topicSlug: q.topic_slug,
          topicLabel: q.topic_label,
        };
      });
      return completeDiagnostic({
        data: { attemptId: payload.attemptId, category: payload.category, answers },
      });
    },
    onSuccess: (r) => onComplete(r),
    onError: (e) => {
      console.error(e);
      toast.error("Couldn't submit diagnostic — try again.");
    },
  });

  const current = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const chosen = selected[current.id];

  const handleSubmit = () => {
    if (submitRef.current) return;
    submitRef.current = true;
    complete.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
          <span className="ml-2 text-xs uppercase tracking-wide text-primary">· Diagnostic</span>
        </span>
        {current.topic_label && (
          <Badge variant="secondary" className="text-xs">{current.topic_label}</Badge>
        )}
      </div>
      <Progress value={progress} className="mb-8" />
      <Card>
        <CardContent className="p-6">
          <p className="mb-6 text-lg font-medium">{current.text}</p>
          <div className="space-y-3">
            {current.answers.map((a) => {
              const isSelected = chosen === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected((prev) => ({ ...prev, [current.id]: a.id }))}
                  className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  {a.text}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        {currentIndex === questions.length - 1 ? (
          <Button onClick={handleSubmit} disabled={!chosen || complete.isPending}>
            {complete.isPending ? "Scoring…" : "See my results"}
          </Button>
        ) : (
          <Button onClick={() => setCurrentIndex((i) => i + 1)} disabled={!chosen}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

function ResultView({ result, onRetake }: { result: DiagnosticResult; onRetake: () => void }) {
  const colorClasses =
    result.color === "green"
      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
      : result.color === "amber"
      ? "text-amber-600 bg-amber-500/10 border-amber-500/30"
      : "text-red-600 bg-red-500/10 border-red-500/30";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Trophy className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold">Your diagnostic results</h1>
        <p className="mt-2 text-muted-foreground">
          {CATEGORY_LABEL[result.category]} · {result.correct} / {result.total} correct ({result.scorePct}%)
        </p>
      </div>

      <Card className={`border ${colorClasses}`}>
        <CardContent className="p-8 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider">Readiness score</div>
          <div className="mt-2 flex items-baseline justify-center gap-2">
            <span className="text-6xl font-bold tabular-nums">{result.readiness}</span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <div className="mt-3 text-lg font-semibold">{result.status}</div>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{result.reason}</p>
        </CardContent>
      </Card>

      {result.weakestTopics.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Focus areas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These topics need the most work based on your answers.
            </p>
            <ul className="mt-4 space-y-2">
              {result.weakestTopics.map((t) => (
                <li key={t.slug} className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{t.score}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {result.strongestTopics.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">You're strong on</h2>
            <ul className="mt-4 space-y-2">
              {result.strongestTopics.map((t) => (
                <li key={t.slug} className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-sm tabular-nums text-emerald-600">{t.score}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          {result.hasAccess ? (
            <>
              <h2 className="text-2xl font-bold">Keep the momentum going</h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                You already have full access. Jump into the exams for your weakest topics.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/exams" search={{ q: "" }}>
                  <Button size="lg">
                    Browse exams
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" onClick={onRetake}>
                  Retake diagnostic
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">Ready to close the gap?</h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Unlock every practice exam, weak-spot reviews, and the weekly challenge.
                Learners who practice weekly pass at over 90% on the first try.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/exams" search={{ q: "" }}>
                  <Button size="lg">
                    Unlock full prep
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" onClick={onRetake}>
                  Retake diagnostic
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Prefer to try a full exam first?{" "}
                <Link to="/exams" search={{ q: "" }} className="text-primary hover:underline">
                  Take the free sample exam →
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
