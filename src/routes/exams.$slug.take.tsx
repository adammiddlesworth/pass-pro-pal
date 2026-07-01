import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  getExamBySlug,
  getExamQuestions,
  createAttempt,
  saveUserAnswer,
  completeAttempt,
} from "@/lib/exams.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/exams/$slug/take")({
  loader: async ({ params, context }) => {
    const exam = await context.queryClient.ensureQueryData({
      queryKey: ["exam", params.slug],
      queryFn: () => getExamBySlug({ data: { slug: params.slug } }),
    });
    const questions = await context.queryClient.ensureQueryData({
      queryKey: ["exam-questions", exam.id],
      queryFn: () => getExamQuestions({ data: { examId: exam.id } }),
    });
    return { exam, questions };
  },
  component: QuizPage,
});

function QuizPage() {
  const { exam, questions } = Route.useLoaderData();
  const { user } = useAuth();
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

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!user) return;

    setSaving(true);
    try {
      let correctCount = 0;
      for (const q of questions) {
        const selected = selectedAnswers[q.id];
        const correct = q.answers.find((a: any) => a.is_correct)?.id;
        if (selected === correct) correctCount++;
      }

      const attempt = await createAttempt({
        data: { examId: exam.id, total: questions.length },
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
        data: {
          attemptId: attempt.id,
          score: correctCount,
          total: questions.length,
        },
      });
    } catch (e) {
      console.error("Failed to save attempt", e);
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    const score = questions.reduce((acc: number, q: typeof questions[0]) => {
      const selected = selectedAnswers[q.id];
      const correct = q.answers.find((a: any) => a.is_correct)?.id;
      return selected === correct ? acc + 1 : acc;
    }, 0);

    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Quiz Complete</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            You scored {score} out of {questions.length}
          </p>
          <div className="mt-4">
            <Link to="/exams">
              <Button>Back to Exams</Button>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((q) => {
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
                          {isCorrectAnswer && (
                            <span className="ml-2 text-xs text-green-700">
                              (Correct)
                            </span>
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
        </span>
        <span className="text-sm font-medium">{exam.title}</span>
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
        <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0}>
          Previous
        </Button>
        {currentIndex === questions.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={!selectedAnswers[currentQuestion.id] || saving}
          >
            {saving ? "Saving..." : "Submit Quiz"}
          </Button>
        ) : (
          <Button onClick={goNext}>Next</Button>
        )}
      </div>
    </div>
  );
}
