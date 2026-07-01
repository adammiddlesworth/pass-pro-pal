import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getExamBySlug,
  getExamQuestions,
  getUserPurchases,
} from "@/lib/exams.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { initializePaddle, getPaddleEnvironment } from "@/lib/paddle";
import { resolvePaddlePrice } from "@/utils/payments.functions";

export const Route = createFileRoute("/exams/$slug")({
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
  component: ExamDetailPage,
});

function ExamDetailPage() {
  const { exam } = Route.useLoaderData();
  const { user } = useAuth();
  const [checkingOut, setCheckingOut] = useState(false);

  const { data: purchases } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => getUserPurchases(),
    enabled: !!user && !exam.is_sample,
  });

  const hasPurchased =
    exam.is_sample ||
    (purchases ?? []).some(
      (p) => p.product_id === exam.product_id && p.status === "completed"
    );

  const handleBuy = async () => {
    if (!exam.product_id) return;
    setCheckingOut(true);
    try {
      await initializePaddle();
      const env = getPaddleEnvironment();
      const internalPriceId = await resolvePaddlePrice({
        data: { priceId: `${exam.product_id}_price`, environment: env },
      });
      (window as any).Paddle.Checkout.open({
        items: [{ priceId: internalPriceId, quantity: 1 }],
      });
    } catch (e) {
      console.error(e);
      alert("Checkout failed. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6">
        <Link
          to="/exams"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Exams
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{exam.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          {exam.is_sample ? (
            <Badge variant="secondary">Free Sample</Badge>
          ) : (
            <Badge variant="default">Full Exam</Badge>
          )}
          <span className="text-sm text-muted-foreground">
            {exam.question_count} questions
          </span>
        </div>
        {exam.description && (
          <p className="mt-4 text-muted-foreground">{exam.description}</p>
        )}
      </div>

      <Separator className="mb-8" />

      <Card>
        <CardHeader>
          <CardTitle>Ready to practice?</CardTitle>
        </CardHeader>
        <CardContent>
          {exam.is_sample ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This free sample quiz includes {exam.question_count} questions.
                No account required.
              </p>
              <Link to="/exams/$slug/take" params={{ slug: exam.slug }}>
                <Button size="lg">Start Free Quiz</Button>
              </Link>
            </div>
          ) : hasPurchased ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You have access to this full exam.
              </p>
              <Link to="/exams/$slug/take" params={{ slug: exam.slug }}>
                <Button size="lg">Start Full Exam</Button>
              </Link>
            </div>
          ) : user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Unlock the full {exam.question_count}-question exam for just{" "}
                ${((exam.price_cents ?? 0) / 100).toFixed(2)}.
              </p>
              <Button size="lg" onClick={handleBuy} disabled={checkingOut}>
                {checkingOut ? "Loading..." : "Buy Now"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign in to purchase and take this full exam.
              </p>
              <Link to="/auth">
                <Button size="lg">Sign In to Purchase</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
