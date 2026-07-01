import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Award, BarChart3, Youtube } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            Pass Your Licensing Exam with Confidence
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Realistic practice exams for Real Estate Licensing and Life & Health
            Insurance. Study smarter, pass faster.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/exams">
              <Button size="lg">Browse Exams</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Exam Categories */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold">Choose Your Exam</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Real Estate Licensing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Comprehensive practice exams covering property ownership, land use,
                contracts, finance, and agency law.
              </p>
              <div className="mt-4">
                <Link to="/exams/real-estate-sample">
                  <Button variant="outline" size="sm">
                    Try Free Sample
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Life & Health Insurance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Master life insurance policies, health coverage, annuities, and state
                regulations with realistic practice questions.
              </p>
              <div className="mt-4">
                <Link to="/exams/life-health-sample">
                  <Button variant="outline" size="sm">
                    Try Free Sample
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-8 text-center text-2xl font-bold">Why PassPal?</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold">Track Progress</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                See your scores improve over time and identify weak areas.
              </p>
            </div>
            <div className="text-center">
              <BookOpen className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold">Detailed Explanations</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Every question includes a thorough explanation to help you learn.
              </p>
            </div>
            <div className="text-center">
              <Youtube className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold">YouTube Integration</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Practice exams from our YouTube channel link directly to the app.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
