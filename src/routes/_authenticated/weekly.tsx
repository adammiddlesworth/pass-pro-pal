import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sparkles, Lock, PlayCircle, Trophy } from "lucide-react";
import {
  getCurrentWeeklyMix,
  getWeeklyMixStatus,
  startWeeklyAttempt,
} from "@/lib/weekly.functions";
import { saveUserAnswer, completeAttempt } from "@/lib/exams.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/weekly")({
  component: WeeklyPage,
});

function WeeklyPage() {
  const { data: mix, isLoading: mixLoading } = useQuery({
    queryKey: ["weekly-mix"],
    queryFn: () => getCurrentWeeklyMix(),
  });
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["weekly-status"],
    queryFn: () => getWeeklyMixStatus(),
  });
  const [started, setStarted] = useState(false);

  if (mixLoading || statusLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!mix || mix.questions.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Intro
          title="Weekly Challenge"
          body="This week's challenge is being built. Check back in a moment."
        />
      </div>
    );
  }

  if (!status?.hasAccess) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Weekly Challenge</h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              A fresh {mix.questions.length}-question exam every Monday, built from the questions
              learners across the platform miss most. Unlock any exam pack to take it.
            </p>
            <div className="mt-6">
              <Link to="/exams" search={{ q: "" }}>
                <Button>Browse exam packs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Week of {format(new Date(mix.weekStart + "T00:00:00"), "MMM d, yyyy")} · Week #{mix.weekNumber}
            </div>
            <h1 className="mt-2 text-3xl font-bold">Weekly Challenge</h1>
            <p className="mt-3 text-muted-foreground">
              {mix.questions.length} mixed questions pulled from the ones learners across the
              platform are getting wrong the most this month. Same set for everyone. New set every Monday.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat label="Questions" value={String(mix.questions.length)} />
              <Stat
                label="Your best this week"
                value={status.bestScore !== null ? `${status.bestScore}%` : "—"}
              />
              <Stat
                label="Attempts this week"
                value={String(status.attemptsThisWeek)}
              />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setStarted(true)}>
                <PlayCircle className="mr-2 h-5 w-5" />
                {status.attemptsThisWeek > 0 ? "Retake challenge" : "Start challenge"}
              </Button>
              <Link to="/exams" search={{ q: "" }}>
                <Button variant="outline" size="lg">
                  Back to exams
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <WeeklyQuiz questions={mix.questions} weekNumber={mix.weekNumber} />;
}

function Intro({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{body}</p>
        <div className="mt-6">
          <Link to="/exams" search={{ q: "" }}>
            <Button variant="outline">Back to exams</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function WeeklyQuiz({ questions, weekNumber }: { questions: any[]; weekNumber: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      try {
        const res = await startWeeklyAttempt();
        setAttemptId(res.attemptId);
      } catch (e) {
        console.error("Failed to start weekly attempt", e);
        toast.error("Couldn't start the challenge. Try again.");
      }
    })();
  }, []);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100;

  const selectAnswer = async (answerId: string) => {
    if (submitted) return;
    const qId = currentQuestion.id;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: answerId }));
    if (!attemptId) return;
    const correctId = currentQuestion.answers.find((a: any) => a.is_correct)?.id;
    try {
      await saveUserAnswer({
        data: {
          attemptId,
          questionId: qId,
          answerId,
          isCorrect: answerId === correctId,
        },
      });
    } catch (e) {
      console.error("Auto-save failed", e);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const score = questions.reduce((acc: number, q: any) => {
        const selected = selectedAnswers[q.id];
        const correct = q.answers.find((a: any) => a.is_correct)?.id;
        return selected === correct ? acc + 1 : acc;
      }, 0);
      setFinalScore(score);
      if (attemptId) {
        await completeAttempt({
          data: { attemptId, score, total: questions.length },
        });
      }
    } catch (e) {
      console.error("Failed to submit weekly", e);
      toast.error("Couldn't submit — try again.");
    } finally {
      setSaving(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    const score =
      finalScore ??
      questions.reduce((acc: number, q: any) => {
        const selected = selectedAnswers[q.id];
        const correct = q.answers.find((a: any) => a.is_correct)?.id;
        return selected === correct ? acc + 1 : acc;
      }, 0);
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold">Weekly Challenge Complete</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            You scored {score} / {questions.length} ({pct}%) on week #{weekNumber}.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Retake</Button>
            <Link to="/dashboard">
              <Button variant="outline">Back to dashboard</Button>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((q: any) => {
            const selected = selectedAnswers[q.id];
            const correctAnswer = q.answers.find((a: any) => a.is_correct);
            const isCorrect = selected === correctAnswer?.id;
            return (
              <Card key={q.id}>
                <CardContent className="p-6">
                  <div className="mb-2">
                    <Badge variant={isCorrect ? "default" : "destructive"}>
                      {isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                  <p className="mb-4 font-medium">{q.text}</p>
                  <div className="space-y-2">
                    {q.answers.map((a: any) => {
                      const isSelected = selected === a.id;
                      let borderClass = "border-muted";
                      if (a.is_correct) borderClass = "border-green-500 bg-green-50";
                      else if (isSelected) borderClass = "border-red-500 bg-red-50";
                      return (
                        <div
                          key={a.id}
                          className={`rounded-md border px-4 py-2 text-sm ${borderClass}`}
                        >
                          {a.text}
                          {a.is_correct && (
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
          <span className="ml-2 text-xs uppercase tracking-wide text-primary">
            · Weekly Challenge
          </span>
        </span>
        <span className="text-sm font-medium">Week #{weekNumber}</span>
      </div>
      <Progress value={progress} className="mb-8" />
      <Card>
        <CardContent className="p-6">
          <p className="mb-6 text-lg font-medium">{currentQuestion.text}</p>
          <div className="space-y-3">
            {currentQuestion.answers.map((a: any) => {
              const selectedId = selectedAnswers[currentQuestion.id];
              const answered = !!selectedId;
              const isSelected = selectedId === a.id;
              const correctId = currentQuestion.answers.find((x: any) => x.is_correct)?.id;
              let stateClass =
                "border-muted hover:border-primary hover:bg-primary/5";
              if (answered) {
                if (a.is_correct) stateClass = "border-green-500 bg-green-50 text-green-900";
                else if (isSelected) stateClass = "border-red-500 bg-red-50 text-red-900";
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
                    <span>{a.text}</span>
                    {answered && a.id === correctId && (
                      <span className="text-xs font-semibold text-green-700">Correct</span>
                    )}
                    {answered && isSelected && !a.is_correct && (
                      <span className="text-xs font-semibold text-red-700">Your answer</span>
                    )}
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
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        {currentIndex === questions.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={!selectedAnswers[currentQuestion.id] || saving}
          >
            {saving ? "Saving..." : "Submit Challenge"}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentIndex((i) => i + 1)}
            disabled={!selectedAnswers[currentQuestion.id]}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
