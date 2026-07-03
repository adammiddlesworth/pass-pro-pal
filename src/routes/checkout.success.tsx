import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getActiveTrack } from "@/lib/track.functions";

export const Route = createFileRoute("/checkout/success")({
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: trackInfo, isLoading: trackLoading } = useQuery({
    queryKey: ["active-track"],
    queryFn: () => getActiveTrack(),
    enabled: !!user,
  });

  const isNewUser = !trackInfo?.track;
  const loading = authLoading || (trackLoading && !!user);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Purchase Successful</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign in to access your purchase.
              </p>
              <Link to="/auth">
                <Button className="w-full">Sign in</Button>
              </Link>
            </div>
          ) : isNewUser ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Welcome to PassPal! Choose your exam track to get started.
              </p>
              <Link to="/select-track">
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
              <Link to="/dashboard">
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
