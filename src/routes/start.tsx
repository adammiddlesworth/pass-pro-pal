import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  attributionSearchSchema,
  buildAttributionSearch,
  isGhlAttribution,
  sanitizeAttribution,
  storeAttribution,
} from "@/lib/attribution";

const searchSchema = z.object({
  email: z.string().email().optional(),
  redirect: z.string().optional(),
  ...attributionSearchSchema.shape,
});

export const Route = createFileRoute("/start")({
  validateSearch: zodValidator(searchSchema),
  component: StartPage,
});

function isSafeRedirect(path: string | undefined): path is string {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}

function StartPage() {
  const { email, redirect, ...rawAttribution } = Route.useSearch();
  const attribution = sanitizeAttribution(rawAttribution);
  const returnPath = isSafeRedirect(redirect) ? redirect : "/exams";
  const fromGhl = isGhlAttribution(attribution);

  useEffect(() => {
    storeAttribution(attribution);
  }, [attribution]);

  const authSearch = {
    email,
    redirect: returnPath,
    ...buildAttributionSearch(attribution),
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {fromGhl ? "Welcome to PassPal" : "Get started with PassPal"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {fromGhl
              ? "You're one step away from realistic practice exams that help you pass your licensing test."
              : "Create your account to start practicing with exam-style questions."}
          </p>
          {email && (
            <p className="text-sm text-muted-foreground">
              We'll use <span className="font-medium text-foreground">{email}</span> to set up your account.
            </p>
          )}
          <Link to="/auth" search={authSearch}>
            <Button size="lg" className="w-full">
              Create your account
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth" search={authSearch} className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
