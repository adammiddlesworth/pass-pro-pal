import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Lock, ArrowRight } from "lucide-react";
import {
  getCurrentWeeklyMix,
  getWeeklyMixStatus,
} from "@/lib/weekly.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTrackCheckout } from "@/hooks/use-track-checkout";

export function WeeklyChallengeCard({
  compact = false,
  category,
}: {
  compact?: boolean;
  category?: string;
}) {
  const { openCheckout, checkingOut } = useTrackCheckout(category);
  const { data: mix } = useQuery({
    queryKey: ["weekly-mix"],
    queryFn: () => getCurrentWeeklyMix(),
  });
  const { data: status } = useQuery({
    queryKey: ["weekly-status"],
    queryFn: () => getWeeklyMixStatus(),
  });

  const questionCount = mix?.questions.length ?? 30;
  const weekNumber = mix?.weekNumber;
  const unlocked = !!status?.hasAccess;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardContent className={compact ? "p-5" : "p-6"}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {unlocked ? <Sparkles className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                Weekly Challenge
                {weekNumber && <span className="text-muted-foreground">· Week #{weekNumber}</span>}
              </div>
              <p className="mt-1 text-base font-semibold leading-tight">
                {questionCount} questions from what learners miss most
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {unlocked
                  ? status?.bestScore !== null && status?.bestScore !== undefined
                    ? `Your best this week: ${status.bestScore}% · New set every Monday`
                    : "Fresh mix every Monday. Retake as many times as you like."
                  : "Unlock any exam pack to take on this week's challenge."}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {unlocked ? (
              <Link to="/weekly">
                <Button>
                  {status && status.attemptsThisWeek > 0 ? "Retake" : "Start"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : category ? (
              <Button variant="outline" onClick={() => openCheckout()} disabled={checkingOut}>
                {checkingOut ? "Loading…" : "Unlock"}
              </Button>
            ) : (
              <Link to="/exams" search={{ q: "" }}>
                <Button variant="outline">Unlock</Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
