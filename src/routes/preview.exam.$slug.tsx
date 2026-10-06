import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { getPreviewExam } from "@/lib/preview.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const searchSchema = z.object({ token: z.string().default("") });

export const Route = createFileRoute("/preview/exam/$slug")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ params, deps }) =>
    getPreviewExam({ data: { slug: params.slug, token: deps.token } }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="mt-2 text-muted-foreground">
        This preview link is invalid or missing a token.
      </p>
      <Link to="/" className="mt-6 inline-block">
        <Button variant="outline">Go home</Button>
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
    </div>
  ),
  component: PreviewQuiz,
});

type PreviewAnswer = { id: string; text: string; is_correct: boolean };
type PreviewQuestion = { id: string; text: string; explanation: string | null; answers: PreviewAnswer[] };

function PreviewQuiz() {

  const { exam, questions: rawQuestions } = Route.useLoaderData();
  const questions = rawQuestions as unknown as PreviewQuestion[];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">No questions</h1>
        <p className="mt-2 text-muted-foreground">This exam has no questions yet.</p>
      </div>
    );
  }

  const total = questions.length;
  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + (submitted ? 1 : 0)) / total) * 100;

  const selectAnswer = (answerId: string) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentQuestion.id]: answerId }));
  };

  const banner = (
    <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      Preview mode — nothing is saved. All {total} questions unlocked.
    </div>
  );

  if (submitted) {
    const score = questions.reduce((acc, q) => {
      const selected = selectedAnswers[q.id];
      const correct = q.answers.find((a) => a.is_correct)?.id;
      return selected === correct ? acc + 1 : acc;
    }, 0);

    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        {banner}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Preview Complete</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            You scored {score} out of {total}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => { setSubmitted(false); setCurrentIndex(0); setSelectedAnswers({}); }}>
            Restart Preview
          </Button>
        </div>

        <div className="space-y-6">
          {questions.map((q) => {
            const selected = selectedAnswers[q.id];
            const correctAnswer = q.answers.find((a) => a.is_correct);
            const isCorrect = selected === correctAnswer?.id;
            return (
              <Card key={q.id}>
                <CardContent className="p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant={isCorrect ? "default" : "destructive"}>
                      {isCorrect ? "Correct" : selected ? "Incorrect" : "Skipped"}
                    </Badge>
                  </div>
                  <p className="mb-4 font-medium">{q.text}</p>
                  <div className="space-y-2">
                    {q.answers.map((a, i) => {
                      const isSelected = selected === a.id;
                      let borderClass = "border-muted";
                      if (a.is_correct) borderClass = "border-green-500 bg-green-50 text-green-900 dark:bg-green-500/15 dark:text-green-300";
                      else if (isSelected) borderClass = "border-red-500 bg-red-50 text-red-900 dark:bg-red-500/15 dark:text-red-300";
                      return (
                        <div key={a.id} className={`rounded-md border px-4 py-2 text-sm ${borderClass}`}>
                          <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                          {a.text}
                          {a.is_correct && <span className="ml-2 text-xs text-green-700">(Correct)</span>}
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
      {banner}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {total}
        </span>
        <span className="text-sm font-medium">{exam.title}</span>
      </div>
      <Progress value={progress} className="mb-8" />

      <Card>
        <CardContent className="p-6">
          <p className="mb-6 text-lg font-medium">{currentQuestion.text}</p>
          <div className="space-y-3">
            {currentQuestion.answers.map((a, i) => {
              const selectedId = selectedAnswers[currentQuestion.id];
              const answered = !!selectedId;
              const isSelected = selectedId === a.id;
              const correctId = currentQuestion.answers.find((x) => x.is_correct)?.id;
              let stateClass = "border-muted hover:bg-primary hover:text-white hover:border-primary";
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
        <Button variant="outline" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0}>
          Previous
        </Button>
        {currentIndex === total - 1 ? (
          <Button onClick={() => setSubmitted(true)} disabled={!selectedAnswers[currentQuestion.id]}>
            Finish Preview
          </Button>
        ) : (
          <Button onClick={() => setCurrentIndex((i) => i + 1)} disabled={!selectedAnswers[currentQuestion.id]}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
