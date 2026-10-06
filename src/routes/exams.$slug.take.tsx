import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getExamBySlug,
  getExamQuestions,
  getUserCategoryAccess,
} from "@/lib/exams.functions";
import {
  startOrResumeAttempt,
  saveAnswer,
  finalizeAttempt,
  abandonAttempt,
} from "@/lib/attempts.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Lock, Youtube, ChevronDown, RotateCcw, Timer, AlertCircle } from "lucide-react";
import { useTrackCheckout } from "@/hooks/use-track-checkout";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { toast } from "sonner";
import { getReadiness } from "@/lib/dashboard.functions";
import { FINAL_UNLOCK_READINESS } from "@/lib/readiness";


export const Route = createFileRoute("/exams/$slug/take")({
  loader: async ({ params, context }) => {
    const exam = await context.queryClient.ensureQueryData({
      queryKey: ["exam", params.slug],
      queryFn: () => getExamBySlug({ data: { slug: params.slug } }),
    });
    return { exam };
  },
  component: QuizPage,
});

function QuizPage() {
  const { exam } = Route.useLoaderData();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { openCheckout, checkingOut } = useTrackCheckout(exam.category);
  
  const [videoOpen, setVideoOpen] = useState(true);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [resumedBanner, setResumedBanner] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [timedGateOpen, setTimedGateOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const initRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  const isTimedFinal = !!(exam as any).is_timed_final;
  const timeLimitMin = (exam as any).time_limit_minutes as number | null | undefined;

  const { data: access } = useQuery({
    queryKey: ["category-access"],
    queryFn: () => getUserCategoryAccess(),
    enabled: !!user,
  });
  const purchased = !!access?.[exam.category];
  const isSample = !!(exam as any).is_sample;
  const hasAccess = purchased || isSample;

  // Timed finals stay locked until readiness reaches the pre-final max.
  const { data: readinessData, isLoading: readinessLoading } = useQuery({
    queryKey: ["readiness", exam.category],
    queryFn: () => getReadiness({ data: { category: exam.category } }),
    enabled: isTimedFinal && !!user && hasAccess,
  });
  const finalLocked =
    isTimedFinal &&
    !!readinessData &&
    !readinessData.passedTimedFinal &&
    readinessData.readiness < FINAL_UNLOCK_READINESS;
  const readinessPending = isTimedFinal && !!user && hasAccess && readinessLoading;

  // Only fetch questions once we know the user has access (sample or purchased).
  // For anonymous or paywalled visitors we render the paywall instead.
  const { data: questions = [] } = useQuery({
    queryKey: ["exam-questions", exam.id],
    queryFn: () => getExamQuestions({ data: { examId: exam.id } }),
    enabled: (isSample || (!!user && hasAccess)) && !finalLocked && !readinessPending,
  });

  const effectiveTotal = questions.length;
  const currentQuestion = questions[currentIndex];
  const paywalled = !!user && !hasAccess;
  const progress = effectiveTotal > 0
    ? ((Math.min(currentIndex, effectiveTotal) + (submitted ? 1 : 0)) / effectiveTotal) * 100
    : 0;

  // Start or resume an attempt for authenticated + full-access users.
  useEffect(() => {
    if (initRef.current) return;
    if (!user || !hasAccess) return;
    if (questions.length === 0) return;
    initRef.current = true;
    (async () => {
      try {
        const state = await startOrResumeAttempt({
          data: { examId: exam.id, total: questions.length },
        });
        setAttemptId(state.attemptId);
        setStartedAt(state.startedAt);
        if (state.answers.length > 0) {
          const hydrated: Record<string, string> = {};
          for (const a of state.answers) hydrated[a.question_id] = a.answer_id;
          setSelectedAnswers(hydrated);
          // Jump to first unanswered question.
          const firstUnanswered = questions.findIndex((q: any) => !hydrated[q.id]);
          setCurrentIndex(firstUnanswered === -1 ? questions.length - 1 : firstUnanswered);
          if (state.resumed) {
            setResumedBanner(
              `Resumed — ${state.answers.length} of ${questions.length} answered`
            );
          }
        } else if (isTimedFinal && timeLimitMin) {
          // Fresh timed-final attempt — show the pre-start gate.
          setTimedGateOpen(true);
        }
      } catch (e) {
        console.error("Failed to start/resume attempt", e);
      }
    })();
  }, [user, hasAccess, exam.id, questions, isTimedFinal, timeLimitMin]);

  // Countdown ticker for timed final exams.
  useEffect(() => {
    if (!isTimedFinal || !startedAt || !timeLimitMin || submitted || timedGateOpen) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isTimedFinal, startedAt, timeLimitMin, submitted, timedGateOpen]);

  const deadlineMs =
    isTimedFinal && startedAt && timeLimitMin
      ? new Date(startedAt).getTime() + timeLimitMin * 60_000
      : null;
  const msLeft = deadlineMs ? Math.max(0, deadlineMs - now) : null;
  const timeExpired = msLeft !== null && msLeft <= 0;

  const selectAnswer = async (answerId: string) => {
    if (submitted) return;
    const qId = currentQuestion.id;
    // Optimistic UI.
    setSelectedAnswers((prev) => ({ ...prev, [qId]: answerId }));
    if (attemptId && hasAccess) {
      try {
        await saveAnswer({
          data: { attemptId, questionId: qId, answerId },
        });
      } catch (e) {
        console.error("Auto-save failed", e);
        toast.error("Couldn't save your answer — check your connection.");
      }
    }
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleStartOver = async () => {
    if (!attemptId) return;
    if (!confirm("Start over? Your saved progress on this attempt will be deleted.")) return;
    try {
      await abandonAttempt({ data: { attemptId } });
    } catch (e) {
      console.error(e);
    }
    setAttemptId(null);
    setSelectedAnswers({});
    setCurrentIndex(0);
    setResumedBanner(null);
    initRef.current = false;
    // Trigger re-init.
    setTimeout(() => {
      initRef.current = false;
    }, 0);
    window.location.reload();
  };

  const handleUnlock = () => openCheckout();

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const gradeable = questions.slice(0, effectiveTotal);
      if (attemptId && hasAccess) {
        const result = await finalizeAttempt({
          data: { attemptId, total: gradeable.length },
        });
        setFinalScore(result.score);
      } else {
        // Freemium / unauth: compute locally without persisting.
        const localScore = gradeable.reduce((acc: number, q: any) => {
          const selected = selectedAnswers[q.id];
          const correct = q.answers.find((a: any) => a.is_correct)?.id;
          return selected === correct ? acc + 1 : acc;
        }, 0);
        setFinalScore(localScore);
      }
    } catch (e) {
      console.error("Failed to submit", e);
      toast.error("Couldn't submit — try again.");
    } finally {
      setSaving(false);
      setSubmitted(true);
    }
  };

  // Auto-submit when the timer runs out.
  useEffect(() => {
    if (!timeExpired || submitted || autoSubmittedRef.current || !attemptId) return;
    autoSubmittedRef.current = true;
    toast.warning("Time's up — submitting your exam.");
    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeExpired, submitted, attemptId]);

  const formatTime = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  // Paywall — user is signed in but doesn't own this track and this isn't the free sample.
  if (paywalled && !submitted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">This exam is locked</h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Unlock full access to this exam and every other exam in this track.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={handleUnlock} disabled={checkingOut}>
                {checkingOut ? "Loading..." : "Unlock Full Access"}
              </Button>
              <Link to="/exams">
                <Button size="lg" variant="outline">Back to Exams</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Timed final locked until the user's readiness hits the threshold.
  if (finalLocked && readinessData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">The timed final is locked</h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Reach a readiness score of {FINAL_UNLOCK_READINESS}% to unlock the final exam.
              You're currently at {readinessData.readiness}%.
            </p>
            <Progress
              value={(readinessData.readiness / FINAL_UNLOCK_READINESS) * 100}
              className="mx-auto mt-5 max-w-sm"
            />
            <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
              {readinessData.reason}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/dashboard">
                <Button size="lg">View my readiness</Button>
              </Link>
              <Link to="/exams">
                <Button size="lg" variant="outline">Back to Exams</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Anonymous visitor on a non-sample exam — nudge to sign in.
  if (!user && !isSample) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Sign in to take this exam</h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              This exam is part of a paid track. Sign in and unlock full access to start.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/auth">
                <Button size="lg">Sign in</Button>
              </Link>
              <Link to="/exams">
                <Button size="lg" variant="outline">Back to Exams</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Questions still loading.
  if (questions.length === 0 || !currentQuestion) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">
        Loading exam…
      </div>
    );
  }

  if (submitted) {
    const gradeable = questions.slice(0, effectiveTotal);
    const score = finalScore ?? gradeable.reduce((acc: number, q: typeof questions[0]) => {
      const selected = selectedAnswers[q.id];
      const correct = q.answers.find((a: any) => a.is_correct)?.id;
      return selected === correct ? acc + 1 : acc;
    }, 0);

    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Quiz Complete</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            You scored {score} out of {gradeable.length}
          </p>
          {isSample && !purchased && (
            <div className="mt-4">
              <Button onClick={handleUnlock} disabled={checkingOut}>
                {checkingOut ? "Loading..." : "Unlock Full Access"}
              </Button>
            </div>
          )}
          <div className="mt-4">
            <Link to="/exams">
              <Button variant="outline">Back to Exams</Button>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {gradeable.map((q: typeof questions[0]) => {
            const selected = selectedAnswers[q.id];
            const correctAnswer = q.answers.find((a: any) => a.is_correct);
            const isCorrect = selected === correctAnswer?.id;

            return (
              <Card key={q.id}>
                <CardContent className="p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant={isCorrect ? "default" : "destructive"}>
                      {isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                  <p className="mb-4 font-medium">{q.text}</p>
                  <div className="space-y-2">
                    {q.answers.map((a: any, i: number) => {
                      const isSelected = selected === a.id;
                      const isCorrectAnswer = a.is_correct;
                      let borderClass = "border-muted";
                      if (isCorrectAnswer) borderClass = "border-green-500 bg-green-50 text-green-900 dark:bg-green-500/15 dark:text-green-300";
                      else if (isSelected && !isCorrectAnswer)
                        borderClass = "border-red-500 bg-red-50 text-red-900 dark:bg-red-500/15 dark:text-red-300";

                      return (
                        <div
                          key={a.id}
                          className={`rounded-md border px-4 py-2 text-sm ${borderClass}`}
                        >
                          <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                          {a.text}
                          {isCorrectAnswer && (
                            <span className="ml-2 text-xs text-green-700">(Correct)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                      {q.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Pre-start gate for timed final exams.
  if (isTimedFinal && timedGateOpen && !submitted) {
    const minutes = timeLimitMin ?? 0;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    const durationLabel =
      hours > 0
        ? `${hours} hour${hours === 1 ? "" : "s"}${remaining ? ` ${remaining} min` : ""}`
        : `${minutes} minutes`;
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Timer className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Timed Final Exam
            </div>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              You have <span className="font-semibold text-foreground">{durationLabel}</span> to
              complete {effectiveTotal} questions. The clock starts as soon as you begin
              and can't be paused. Pass with 70% or higher to prove you're ready.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => setTimedGateOpen(false)}>
                Start Timed Exam
              </Button>
              <Link to="/exams">
                <Button size="lg" variant="outline">Back to Exams</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timerCritical = msLeft !== null && msLeft < 5 * 60_000;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {effectiveTotal}
          {isSample && !purchased && (
            <span className="ml-2 text-xs uppercase tracking-wide text-primary">
              · Free Sample
            </span>
          )}
          {isTimedFinal && (
            <span className="ml-2 text-xs uppercase tracking-wide text-primary">
              · Timed Final
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
          {isTimedFinal && msLeft !== null && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
                timerCritical
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-primary/10 text-primary"
              }`}
              title="Time remaining"
            >
              {timerCritical ? <AlertCircle className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
              {formatTime(msLeft)}
            </span>
          )}
          <span className="text-sm font-medium">{exam.title}</span>
        </div>
      </div>
      <Progress value={progress} className="mb-4" />


      {resumedBanner && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <span className="text-foreground/90">{resumedBanner}</span>
          <button
            type="button"
            onClick={handleStartOver}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            Start over
          </button>
        </div>
      )}

      {exam.youtube_video_id && (
        <div className="mb-6 overflow-hidden rounded-lg border">
          <button
            type="button"
            onClick={() => setVideoOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 bg-muted/50 px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <span className="inline-flex items-center gap-2">
              <Youtube className="h-4 w-4 text-primary" />
              Watch the video walkthrough
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${videoOpen ? "" : "-rotate-90"}`} />
          </button>
          {videoOpen && (
            <div className="relative aspect-video bg-black">
              <iframe
                src={youtubeEmbedUrl(exam.youtube_video_id)}
                title={`${exam.title} — video walkthrough`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          )}
        </div>
      )}



      <Card>
        <CardContent className="p-6">
          <p className="mb-6 text-lg font-medium">{currentQuestion.text}</p>
          <div className="space-y-3">
            {currentQuestion.answers.map((a: any, i: number) => {
              const selectedId = selectedAnswers[currentQuestion.id];
              const answered = !!selectedId;
              const isSelected = selectedId === a.id;
              const correctId = currentQuestion.answers.find((x: any) => x.is_correct)?.id;
              let stateClass = "border-muted hover:border-green-500 hover:bg-green-500 hover:text-white";
              if (answered) {
                if (a.is_correct) stateClass = "border-green-500 bg-green-50 text-green-900 dark:bg-green-500/15 dark:text-green-300";
                else if (isSelected) stateClass = "border-red-500 bg-red-50 text-red-900 dark:bg-red-500/15 dark:text-red-300";
                else stateClass = "border-muted opacity-70";
              }
              return (
                <button
                  key={a.id}
                  onClick={() => selectAnswer(a.id)}
                  disabled={answered}
                  className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${stateClass} ${answered ? "cursor-default" : ""}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>
                      <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                      {a.text}
                    </span>
                    {answered && a.id === correctId && <span className="text-xs font-semibold text-green-700">Correct</span>}
                    {answered && isSelected && !a.is_correct && <span className="text-xs font-semibold text-red-700">Your answer</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedAnswers[currentQuestion.id] && currentQuestion.explanation && (
            <div className="mt-5 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="mb-1 font-semibold text-primary">Explanation</p>
              <p className="text-foreground/80">{currentQuestion.explanation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0}>
          Previous
        </Button>
        {currentIndex === effectiveTotal - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={!selectedAnswers[currentQuestion.id] || saving}
          >
            {saving ? "Saving..." : "Submit Quiz"}
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={!selectedAnswers[currentQuestion.id]}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
