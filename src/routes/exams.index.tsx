import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { getExams, getUserCategoryAccess, FREEMIUM_PREVIEW_COUNT } from "@/lib/exams.functions";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/exams/")({
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData({
      queryKey: ["exams"],
      queryFn: () => getExams(),
    });
  },
  component: ExamsPage,
});

function ExamsPage() {
  const { user } = useAuth();
  const { data: exams } = useSuspenseQuery({
    queryKey: ["exams"],
    queryFn: () => getExams(),
  });
  const { data: access } = useQuery({
    queryKey: ["category-access"],
    queryFn: () => getUserCategoryAccess(),
    enabled: !!user,
  });

  const realEstate = exams.filter((e) => e.category === "real_estate");
  const lifeHealth = exams.filter((e) => e.category === "life_health_insurance");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Practice Exams</h1>

      <div className="space-y-12">
        <TrackSection
          title="Real Estate Licensing"
          category="real_estate"
          exams={realEstate}
          hasAccess={!!access?.real_estate}
        />
        <TrackSection
          title="Life & Health Insurance"
          category="life_health_insurance"
          exams={lifeHealth}
          hasAccess={!!access?.life_health_insurance}
        />
      </div>
    </div>
  );
}

function TrackSection({
  title,
  category,
  exams,
  hasAccess,
}: {
  title: string;
  category: string;
  exams: Awaited<ReturnType<typeof getExams>>;
  hasAccess: boolean;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {hasAccess && (
          <Link to="/review/$category" params={{ category }}>
            <Button variant="secondary" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              Review My Weak Spots
            </Button>
          </Link>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {exams.map((exam) => (
          <ExamCard key={exam.id} exam={exam} hasAccess={hasAccess} />
        ))}
      </div>
    </section>
  );
}

function ExamCard({
  exam,
  hasAccess,
}: {
  exam: Awaited<ReturnType<typeof getExams>>[number];
  hasAccess: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{exam.title}</CardTitle>
          {hasAccess ? (
            <Badge variant="default">Unlocked</Badge>
          ) : (
            <Badge variant="secondary">Free preview</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {exam.question_count} questions
          {!hasAccess && ` · first ${FREEMIUM_PREVIEW_COUNT} free`}
        </p>
        <div className="mt-4">
          <Link to="/exams/$slug" params={{ slug: exam.slug }}>
            <Button size="sm">
              {hasAccess ? "Start Exam" : "Start Free Preview"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
