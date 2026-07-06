import { createFileRoute, Link, useLocation, useSearch } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getExamBySlug,
  getExamQuestions,
  getUserCategoryAccess,
  CATEGORY_PRODUCT_IDS,
  FREEMIUM_PREVIEW_COUNT,
} from "@/lib/exams.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { initializePaddle, getPaddleEnvironment } from "@/lib/paddle";
import { resolvePaddlePrice } from "@/utils/payments.functions";
import { youtubeEmbedUrl } from "@/lib/youtube";
import {
  attributionSearchSchema,
  buildAttributionSearch,
  mergeAttribution,
} from "@/lib/attribution";

const searchSchema = attributionSearchSchema;

export const Route = createFileRoute("/exams/$slug/")({
  validateSearch: zodValidator(searchSchema),
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
  const location = useLocation();
  const urlAttribution = useSearch({ from: Route.id });
  const attribution = mergeAttribution(urlAttribution);
  const [checkingOut, setCheckingOut] = useState(false);

  const { data: access } = useQuery({
    queryKey: ["category-access"],
    queryFn: () => getUserCategoryAccess(),
    enabled: !!user,
  });

  const productId = CATEGORY_PRODUCT_IDS[exam.category];
  const hasAccess = !!access?.[exam.category];

  const handleBuy = async () => {
    if (!productId) return;
    setCheckingOut(true);
    try {
      await initializePaddle();
      const env = getPaddleEnvironment();
      const internalPriceId = await resolvePaddlePrice({
        data: { priceId: `${productId}_price`, environment: env },
      });
      const successUrl = new URL("/checkout/success", window.location.origin);
      for (const [key, value] of Object.entries(buildAttributionSearch(attribution))) {
        successUrl.searchParams.set(key, value);
      }
      (window as any).Paddle.Checkout.open({
        items: [{ priceId: internalPriceId, quantity: 1 }],
        customer: user?.email ? { email: user.email } : undefined,
        customData: {
          userId: user?.id ?? "",
          productId,
          priceId: `${productId}_price`,
          ...attribution,
        },
        settings: {
          successUrl: successUrl.toString(),
        },
      });
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
        <h1 className="text-3xl font-bold">
          {exam.exam_number ? `#${exam.exam_number} · ` : ""}
          {exam.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={hasAccess ? "default" : "secondary"}>
            {hasAccess ? "Full Access" : `Free preview: ${FREEMIUM_PREVIEW_COUNT} questions`}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {exam.question_count} questions total
          </span>
        </div>
        {(exam as any).tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(exam as any).tags.map((t: string) => (
              <Badge key={t} variant="outline" className="text-[11px] font-normal">
                {t}
              </Badge>
            ))}
          </div>
        )}
        {exam.description && (
          <p className="mt-4 text-muted-foreground">{exam.description}</p>
        )}
      </div>

      {exam.youtube_video_id && (
        <div className="mb-8 overflow-hidden rounded-lg border bg-black">
          <div className="relative aspect-video">
            <iframe
              src={youtubeEmbedUrl(exam.youtube_video_id)}
              title={`${exam.title} — video walkthrough`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      )}

      <Separator className="mb-8" />


      <Card>
        <CardHeader>
          <CardTitle>Ready to practice?</CardTitle>
        </CardHeader>
        <CardContent>
          {!user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign in to start the free {FREEMIUM_PREVIEW_COUNT}-question preview.
              </p>
          <Link to="/auth" search={{ redirect: location.pathname, ...buildAttributionSearch(attribution) }}>
              <Button size="lg">Sign In to Start</Button>
            </Link>
            </div>
          ) : hasAccess ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You have full access to every exam in this track.
              </p>
              <Link to="/exams/$slug/take" params={{ slug: exam.slug }}>
                <Button size="lg">Start Full Exam</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Start with the first {FREEMIUM_PREVIEW_COUNT} questions free. Unlock every exam in this
                track for ${((exam.price_cents ?? 0) / 100).toFixed(2)}.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/exams/$slug/take" params={{ slug: exam.slug }}>
                  <Button size="lg">Start Free Preview</Button>
                </Link>
                <Button size="lg" variant="outline" onClick={handleBuy} disabled={checkingOut}>
                  {checkingOut ? "Loading..." : "Unlock Full Access"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
