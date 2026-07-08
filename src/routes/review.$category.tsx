import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getWeakSpotsReview } from "@/lib/review.functions";
import {
  createAttempt,
  saveUserAnswer,
  completeAttempt,
} from "@/lib/exams.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useTrackCheckout } from "@/hooks/use-track-checkout";

const CATEGORY_LABELS: Record<string, string> = {
  real_estate: "Real Estate Licensing",
  life_health_insurance: "Life & Health Insurance",
};

export const Route = createFileRoute("/review/$category")({
  component: ReviewPage,
});

function ReviewPage() {
  const { category } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, checkingOut } = useTrackCheckout(category);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["weak-spots", category],
    queryFn: () => getWeakSpotsReview({ data: { category } }),
    enabled: !!user,
  });

  if (!user || isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-12 text-center text-muted-foreground">Loading review...</div>;
  }
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-destructive">Couldn't load your review session.</p>
      </div>
    );
  }
  if (!data) return null;

  const label = CATEGORY_LABELS[category] ?? category;

  if (!data.ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Weak Spots Review — {label}</h1>
            {data.reason === "no_access" ? (
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Weak Spots Review is a premium feature. Unlock full access to this track to start
                targeting your most-missed questions.
              </p>
            ) : (
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Answer at least {data.needed} questions in this track to unlock your personalized
                review. You've answered {data.answered} so far.
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {data.reason === "no_access" ? (
                <Button onClick={() => openCheckout()} disabled={checkingOut}>
                  {checkingOut ? "Loading…" : "Unlock Full Access"}
                </Button>
              ) : null}
              <Link to="/exams">
                <Button variant={data.reason === "no_access" ? "outline" : "default"}>
                  Back to Exams
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ReviewQuiz questions={data.questions} category={category} label={label} />;
}

function ReviewQuiz({
  questions,
  category,
  label,
}: {
  questions: any[];
  category: string;
  label: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const selectAnswer = (answerId: string) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentQuestion.id]: answerId }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    setSaving(true);
    try {
      let correctCount = 0;
      for (const q of questions) {
        const selected = selectedAnswers[q.id];
        const correct = q.answers.find((a: any) => a.is_correct)?.id;
        if (selected === correct) correctCount++;
      }
      const attempt = await createAttempt({
        data: { examId: null, total: questions.length, attemptType: "review" },
      });
      for (const q of questions) {
        const selected = selectedAnswers[q.id];
        const correctAnswer = q.answers.find((a: any) => a.is_correct);
        if (selected) {
          await saveUserAnswer({
            data: {
              attemptId: attempt.id,
              questionId: q.id,
              answerId: selected,
              isCorrect: selected === correctAnswer?.id,
            },
          });
        }
      }
      await completeAttempt({
        data: { attemptId: attempt.id, score: correctCount, total: questions.length },
      });
    } catch (e) {
      console.error("Failed to save review", e);
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    const score = questions.reduce((acc: number, q: any) => {
      const selected = selectedAnswers[q.id];
      const correct = q.answers.find((a: any) => a.is_correct)?.id;
      return selected === correct ? acc + 1 : acc;
    }, 0);
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Review Complete</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            You scored {score} out of {questions.length} on your weak spots.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link to="/review/$category" params={{ category }}>
              <Button onClick={() => window.location.reload()}>New Review</Button>
            </Link>
            <Link to="/exams">
              <Button variant="outline">Back to Exams</Button>
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
                      const isCorrectAnswer = a.is_correct;
                      let borderClass = "border-muted";
                      if (isCorrectAnswer) borderClass = "border-green-500 bg-green-50";
                      else if (isSelected && !isCorrectAnswer)
                        borderClass = "border-red-500 bg-red-50";
                      return (
                        <div
                          key={a.id}
                          className={`rounded-md border px-4 py-2 text-sm ${borderClass}`}
                        >
                          {a.text}
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
            · Weak Spots Review
          </span>
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Progress value={progress} className="mb-8" />
      <Card>
        <CardContent className="p-6">
          <p className="mb-6 text-lg font-medium">{currentQuestion.text}</p>
          <div className="space-y-3">
            {currentQuestion.answers.map((a: any) => {
              const isSelected = selectedAnswers[currentQuestion.id] === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => selectAnswer(a.id)}
                  className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:bg-accent"
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
          <Button
            onClick={handleSubmit}
            disabled={!selectedAnswers[currentQuestion.id] || saving}
          >
            {saving ? "Saving..." : "Submit Review"}
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
