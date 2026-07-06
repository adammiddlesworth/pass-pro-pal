import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getActiveTrack } from "@/lib/track.functions";
import {
  attributionSearchSchema,
  buildAttributionSearch,
  isGhlAttribution,
  sanitizeAttribution,
} from "@/lib/attribution";

const searchSchema = attributionSearchSchema;

export const Route = createFileRoute("/checkout/success")({
  validateSearch: zodValidator(searchSchema),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const attribution = sanitizeAttribution(useSearch({ from: Route.id }));
  const fromGhl = isGhlAttribution(attribution);

  const { data: trackInfo, isLoading: trackLoading } = useQuery({
    queryKey: ["active-track"],
    queryFn: () => getActiveTrack(),
    enabled: !!user,
  });

  const isNewUser = !trackInfo?.track;
  const loading = authLoading || (trackLoading && !!user);

  useEffect(() => {
    if (authLoading || user) return;
    const authSearch = {
      email: user?.email,
      redirect: "/checkout/success",
      ...buildAttributionSearch(attribution),
    };
    navigate({ to: "/auth", search: authSearch });
  }, [authLoading, user, navigate, attribution]);

  const ctaSearch = buildAttributionSearch(attribution);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Purchase Successful</CardTitle>
          {fromGhl && (
            <p className="text-sm text-muted-foreground">
              Welcome from GHL — your account is ready.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign in to access your purchase.
              </p>
              <Link to="/auth" search={{ redirect: "/checkout/success", ...ctaSearch }}>
                <Button className="w-full">Sign in</Button>
              </Link>
            </div>
          ) : isNewUser ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Welcome to PassPal! Choose your exam track to get started.
              </p>
              <Link to="/select-track" search={ctaSearch}>
                <Button className="w-full">
                  Choose your track
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You're all set! Start studying for your exam.
              </p>
              <Link to="/dashboard" search={ctaSearch}>
                <Button className="w-full">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
