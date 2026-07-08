import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { useAuth } from "@/hooks/use-auth";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ALLOWED_PRODUCTS: Record<string, string> = {
  real_estate_exam: "real_estate_exam_price",
  life_health_exam: "life_health_exam_price",
};

const searchSchema = z.object({
  product: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/checkout/resume")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Checkout — PassPal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutResumePage,
});

function CheckoutResumePage() {
  const { user, loading } = useAuth();
  const { product } = useSearch({ from: Route.id });

  const productId = product && ALLOWED_PRODUCTS[product] ? product : null;
  const priceId = productId ? ALLOWED_PRODUCTS[productId] : null;

  if (!productId || !priceId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>No product selected</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Pick a plan to continue.</p>
            <Link to="/pricing">
              <Button className="w-full">See plans</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-sm text-muted-foreground">
        Loading checkout…
      </div>
    );
  }

  const returnUrl = `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Complete your purchase</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Secure checkout powered by Stripe.
        </p>
      </div>
      <StripeEmbeddedCheckout
        priceId={priceId}
        productId={productId}
        userId={user.id}
        customerEmail={user.email ?? undefined}
        returnUrl={returnUrl}
      />
      <div className="mt-6 text-center">
        <Link to="/pricing" className="text-sm text-primary underline">
          Back to pricing
        </Link>
      </div>
    </div>
  );
}
