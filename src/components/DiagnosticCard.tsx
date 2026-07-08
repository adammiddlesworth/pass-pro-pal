import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Target, ArrowRight } from "lucide-react";
import { getDiagnosticStatus } from "@/lib/diagnostic.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DiagnosticCard({ category }: { category: string }) {
  const { data: status } = useQuery({
    queryKey: ["diagnostic-status", category],
    queryFn: () => getDiagnosticStatus({ data: { category } }),
  });

  const taken = !!status?.hasTaken;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                Free Diagnostic
              </div>
              <p className="mt-1 text-base font-semibold leading-tight">
                {taken
                  ? `You scored ${status?.lastScorePct}% — view your full report`
                  : "See where you stand in ~10 minutes"}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {taken
                  ? "Your diagnostic report is saved to your account."
                  : "A 20-question sample across every topic. Get your readiness score."}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <Link to="/diagnostic/$category" params={{ category }}>
              <Button variant={taken ? "outline" : "default"}>
                {taken ? "View report" : "Take diagnostic"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
