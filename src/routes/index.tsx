import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  attributionSearchSchema,
  hasAttribution,
} from "@/lib/attribution";

const searchSchema = attributionSearchSchema;

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  component: IndexPage,
});

function IndexPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const attribution = useSearch({ from: Route.id });

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate({ to: "/dashboard" });
    } else if (hasAttribution(attribution)) {
      navigate({ to: "/start", search: attribution });
    } else {
      navigate({ to: "/auth" });
    }
  }, [user, loading, navigate, attribution]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
