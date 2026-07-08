import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTrackCheckout } from "@/hooks/use-track-checkout";
import { getUserCategoryAccess } from "@/lib/exams.functions";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — PassPal" },
      {
        name: "description",
        content:
          "Simple one-time pricing for PassPal exam prep. Real Estate and Life & Health licensing packs, or save with the bundle.",
      },
      { property: "og:title", content: "Pricing — PassPal" },
      {
        property: "og:description",
        content:
          "One-time payment. Lifetime access to your exam pack, weekly challenges, and detailed reports.",
      },
    ],
  }),
  component: PricingPage,
});

type Plan = {
  name: string;
  price: string;
  tagline: string;
  productId: "real_estate_exam" | "life_health_exam" | "exam_bundle";
  features: string[];
  highlight?: boolean;
};

const plans: Plan[] = [
  {
    name: "Real Estate Exam",
    price: "$19.99",
    tagline: "Everything you need for the real estate licensing exam.",
    productId: "real_estate_exam",
    features: [
      "Full real estate question bank",
      "Timed practice exams",
      "Weekly challenge access",
      "Detailed performance reports",
      "Lifetime access — pay once",
    ],
  },
  {
    name: "Exam Bundle",
    price: "$29.99",
    tagline: "Both licensing tracks. Best value.",
    productId: "exam_bundle",
    highlight: true,
    features: [
      "Real Estate exam pack",
      "Life & Health Insurance exam pack",
      "Weekly challenge access",
      "Detailed performance reports",
      "Lifetime access — pay once",
    ],
  },
  {
    name: "Life & Health Insurance",
    price: "$19.99",
    tagline: "Full prep for the life & health insurance exam.",
    productId: "life_health_exam",
    features: [
      "Full life & health question bank",
      "Timed practice exams",
      "Weekly challenge access",
      "Detailed performance reports",
      "Lifetime access — pay once",
    ],
  },
];

function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, checkingOut } = useTrackCheckout(null);

  const { data: access } = useQuery({
    queryKey: ["category-access"],
    queryFn: () => getUserCategoryAccess(),
    enabled: !!user,
  });

  const hasAnyPurchase =
    !!access && Object.values(access).some((v) => v === true);

  const handleBuy = (productId: Plan["productId"]) => {
    if (!user) {
      const redirect = `/checkout/resume?product=${encodeURIComponent(productId)}`;
      navigate({
        to: "/auth",
        search: { mode: "signup", redirect } as any,
      });
      return;
    }
    void openCheckout({ productId });
  };

  const ownsProduct = (productId: Plan["productId"]) => {
    if (!access) return false;
    if (productId === "real_estate_exam") return access.real_estate === true;
    if (productId === "life_health_exam")
      return access.life_health_insurance === true;
    if (productId === "exam_bundle")
      return access.real_estate === true && access.life_health_insurance === true;
    return false;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Simple, one-time pricing</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Pay once, keep access. No subscriptions, no surprise renewals.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const owned = ownsProduct(plan.productId);
          return (
            <div
              key={plan.productId}
              className={`flex flex-col rounded-xl border p-6 ${
                plan.highlight ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"
              }`}
            >
              {plan.highlight && (
                <div className="mb-3 inline-flex w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                  Best value
                </div>
              )}
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/ one-time</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex-1" />
              {owned ? (
                <Link
                  to="/dashboard"
                  className="mt-6 inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  You own this — Go to Dashboard
                </Link>
              ) : (
                <button
                  onClick={() => handleBuy(plan.productId)}
                  disabled={checkingOut}
                  className={`mt-6 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-input bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  {checkingOut ? "Loading…" : user ? "Buy now" : "Get started"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-16 rounded-xl border border-border bg-card p-6 text-center">
        <h3 className="text-lg font-semibold">30-day money-back guarantee</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Not satisfied? Request a full refund within 30 days. See our{" "}
          <Link to="/refund-policy" className="text-primary underline">
            refund policy
          </Link>{" "}
          for details.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Payments are processed by our reseller Paddle.com, who acts as the Merchant of Record.
          Applicable taxes are calculated at checkout.
        </p>
      </div>

      {!hasAnyPurchase && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Try a{" "}
          <Link to="/diagnostic" className="text-primary underline">
            free diagnostic
          </Link>{" "}
          first to see where you stand.
        </div>
      )}
    </div>
  );
}
