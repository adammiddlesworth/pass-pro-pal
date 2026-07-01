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
    const score = questions.reduce((acc, q) => {
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
          {questions.map((q, idx) => {
            const selected = selectedAnswers[q.id];
            const correctAnswer = q.answers.find((a: any) => a.is_correct);
            const isCorrect = selected === correctAnswer?.id;

            return (
              <Card key={q.id}>
                <CardContent className="p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant={isCorrect ? "default" : "destructive