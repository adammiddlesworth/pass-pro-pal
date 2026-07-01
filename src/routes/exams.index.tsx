import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getExams } from "@/lib/exams.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const { data: exams } = useSuspenseQuery({
    queryKey: ["exams"],
    queryFn: () => getExams(),
  });

  const realEstate = exams.filter((e) => e.category === "real_estate");
  const lifeHealth = exams.filter((e) => e.category === "life_health_insurance");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Practice Exams</h1>

      <div className="space-y-10">
        <section>
          <h2 className="mb-4 text-xl font-semibold">Real Estate Licensing</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {realEstate.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Life & Health Insurance</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {lifeHealth.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ExamCard({ exam }: { exam: Awaited<ReturnType<typeof getExams>>[number] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{exam.title}</CardTitle>
          {exam.is_sample ? (
            <Badge variant="secondary">Free Sample</Badge>
          ) : (
            <Badge variant="default">Full Exam</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {exam.question_count} questions
        </p>
        <div className="mt-4">
          <Link to="/exams/$slug" params={{ slug: exam.slug }}>
            <Button size="sm">
              {exam.is_sample ? "Start Free Quiz" : "View Details"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
