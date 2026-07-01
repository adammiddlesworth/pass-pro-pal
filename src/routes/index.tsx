import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BookOpen, Award, BarChart3, Youtube, CheckCircle2, ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section
        className="relative overflow-hidden py-20 md:py-28"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 opacity-10 md:right-8 md:top-8 md:opacity-15"
        >
          <Logo variant="mark-white" className="h-64 w-auto md:h-80" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center text-primary-foreground">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            Pass Your Licensing Exam with Confidence
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/90">
            Realistic practice exams for Real Estate Licensing and Life & Health
            Insurance. Study smarter, pass faster.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/exams">
              <Button size="lg" variant="secondary" className="font-semibold">
                Browse Exams <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Exam Categories — visually separated tracks */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="mb-2 text-center text-3xl font-bold text-secondary">
          Choose Your Track
        </h2>
        <p className="mb-10 text-center text-muted-foreground">
          Pick the exam you're studying for. Each track has its own practice bank.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Real Estate — green accent */}
          <div className="group relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-primary" />
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-secondary">Real Estate Licensing</h3>
            <p className="mt-2 text-muted-foreground">
              Property ownership, land use, contracts, finance, and agency law.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-secondary/80">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> First 10 questions of every exam free
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Unlock the full track with one purchase
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Detailed answer explanations
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/exams">
                <Button>Browse Real Estate Exams</Button>
              </Link>
            </div>
          </div>

          {/* Life & Health — navy accent */}
          <div className="group relative overflow-hidden rounded-2xl border-2 border-secondary/20 bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-secondary hover:shadow-lg">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-secondary" />
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-secondary">Life & Health Insurance</h3>
            <p className="mt-2 text-muted-foreground">
              Life policies, health coverage, annuities, and state regulations.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-secondary/80">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" /> First 10 questions of every exam free
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" /> Unlock the full track with one purchase
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" /> Detailed answer explanations
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/exams">
                <Button variant="secondary">Browse Life & Health Exams</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/60 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-10 text-center text-3xl font-bold text-secondary">Why PassPal?</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Feature icon={<BarChart3 className="h-6 w-6" />} title="Track Progress">
              See your scores improve over time and identify weak areas.
            </Feature>
            <Feature icon={<BookOpen className="h-6 w-6" />} title="Detailed Explanations">
              Every question includes a thorough explanation to help you learn.
            </Feature>
            <Feature icon={<Youtube className="h-6 w-6" />} title="YouTube Integration">
              Practice exams from our YouTube channel link directly to the app.
            </Feature>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-card p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-secondary">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
