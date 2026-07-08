import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, ArrowRight, ChevronRight, Home, Heart } from "lucide-react";

const TRACKS: { slug: string; label: string; blurb: string; Icon: typeof Home }[] = [
  {
    slug: "real_estate",
    label: "Real Estate",
    blurb: "A ~20-question sample across every real estate exam topic.",
    Icon: Home,
  },
  {
    slug: "life_health_insurance",
    label: "Life & Health Insurance",
    blurb: "A ~20-question sample across every life & health insurance topic.",
    Icon: Heart,
  },
];

export const Route = createFileRoute("/diagnostic/")({
  head: () => ({
    meta: [
      { title: "Free licensing exam diagnostic — PassPal" },
      {
        name: "description",
        content:
          "Take a free 10-minute diagnostic to see where you stand on your licensing exam. Personalized report with your weak spots — no card required.",
      },
      { property: "og:title", content: "Free licensing exam diagnostic — PassPal" },
      {
        property: "og:description",
        content:
          "See your readiness score in 10 minutes. Free, personalized report — no card required.",
      },
    ],
  }),
  component: DiagnosticIndexPage,
});

function DiagnosticIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <Target className="h-3.5 w-3.5" />
          Free diagnostic
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          See where you stand in 10 minutes.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          A short sample across every topic on your licensing exam. When you
          finish, we'll show your readiness score and pinpoint the topics
          slowing you down. Free — no card required.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {TRACKS.map(({ slug, label, blurb, Icon }) => (
          <Card key={slug} className="transition-colors hover:border-primary/60">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold">{label}</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{blurb}</p>
              <Link
                to="/diagnostic/$category"
                params={{ category: slug }}
                className="mt-6 block"
              >
                <Button className="w-full">
                  Start diagnostic
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <ul className="mx-auto mt-10 max-w-lg space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <ChevronRight className="mt-0.5 h-4 w-4 text-primary" />
          Free — no purchase required.
        </li>
        <li className="flex items-start gap-2">
          <ChevronRight className="mt-0.5 h-4 w-4 text-primary" />
          Covers every topic on the licensing exam.
        </li>
        <li className="flex items-start gap-2">
          <ChevronRight className="mt-0.5 h-4 w-4 text-primary" />
          One-time diagnostic — personalized report saved to your account.
        </li>
      </ul>
    </div>
  );
}
