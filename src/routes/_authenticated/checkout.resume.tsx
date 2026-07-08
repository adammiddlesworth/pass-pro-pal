import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTrackCheckout } from "@/hooks/use-track-checkout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ALLOWED_PRODUCTS = new Set([
  "real_estate_exam",
  "life_health_exam",
  "exam_bundle",
]);

const searchSchema = z.object({
  product: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/checkout/resume")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Opening checkout — PassPal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutResumePage,
});

function CheckoutResumePage() {
  const { user, loading } = useAuth();
  const { product } = useSearch({ from: Route.id });
  const { openCheckout, checkingOut } = useTrackCheckout(null);
  const openedRef = useRef(false);

  const productId = product && ALLOWED_PRODUCTS.has(product) ? product : null;

  useEffect(() => {
    if (loading || !user || openedRef.current || !productId) return;
    openedRef.current = true;
    void openCheckout({ productId });
  }, [loading, user, productId, openCheckout]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>
            {productId ? "Opening checkout…" : "No product selected"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {productId ? (
            <>
              <p className="text-sm text-muted-foreground">
                {checkingOut
                  ? "Loading Paddle checkout…"
                  : "If the checkout window didn't open, use the button below."}
              </p>
              <Button
                onClick={() => void openCheckout({ productId })}
                disabled={checkingOut}
                className="w-full"
              >
                {checkingOut ? "Loading…" : "Open checkout"}
              </Button>
              <Link to="/pricing" className="block text-sm text-primary underline">
                Back to pricing
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Pick a plan to continue.
              </p>
              <Link to="/pricing">
                <Button className="w-full">See plans</Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
