import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — PassPal" },
      {
        name: "description",
        content: "PassPal offers a 30-day money-back guarantee on all purchases.",
      },
      { property: "og:title", content: "Refund Policy — PassPal" },
      {
        property: "og:description",
        content: "30-day money-back guarantee. Full refund within 30 days of purchase.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Refund Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

        <h2>30-day money-back guarantee</h2>
        <p>
          <strong>Pass Pal</strong> offers a 30-day money-back guarantee on all purchases of the
          PassPal Service. If you are not satisfied with your purchase, you may request a full
          refund within thirty (30) days of your order date, for any reason.
        </p>

        <h2>How to request a refund</h2>
        <p>
          To request a refund, contact Pass Pal through the support channels in the app with the
          email address you used at checkout. We'll issue the refund through our payment
          processor, Stripe.
        </p>
        <p>
          Refunds are returned to the original payment method. Processing time depends on your
          bank or card issuer and is typically 5–10 business days after the refund is issued.
        </p>

        <h2>After 30 days</h2>
        <p>
          After the 30-day window, refunds are considered on a case-by-case basis (for example,
          if you were unable to access the Service due to a technical issue on our side).
        </p>

        <h2>Questions</h2>
        <p>
          If you have any questions about this policy, contact Pass Pal through the app.
        </p>
      </article>
    </div>
  );
}
