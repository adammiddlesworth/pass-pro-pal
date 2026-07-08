import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook, createStripeClient } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const userId: string | undefined = session.metadata?.userId;
  const productId: string | undefined = session.metadata?.productId;
  const priceId: string | undefined = session.metadata?.priceId;
  const transactionId: string =
    session.payment_intent || session.id;

  if (!userId || !productId || !priceId) {
    console.warn("Skipping checkout.session: missing metadata", {
      sessionId: session.id,
      userId,
      productId,
      priceId,
    });
    return;
  }

  const supabase = getSupabase();
  const row = {
    user_id: userId,
    product_id: productId,
    price_id: priceId,
    transaction_id: transactionId,
    environment: env,
    status: "completed",
    utm_source: session.metadata?.utm_source ?? null,
    utm_medium: session.metadata?.utm_medium ?? null,
    utm_campaign: session.metadata?.utm_campaign ?? null,
    ref: session.metadata?.ref ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase.from("purchases") as any).upsert(row, {
    onConflict: "user_id,product_id,environment",
  });
  if (error) console.error("purchases upsert error", error);

  // Best-effort GHL sync — mark as customer.
  try {
    const { data: userRes } = await supabase.auth.admin.getUserById(userId);
    const email = (userRes as any)?.user?.email as string | undefined;
    if (email) {
      const { syncToGhl } = await import("@/lib/ghl.server");
      await syncToGhl({
        email,
        tags: ["customer", `purchased-${productId}`],
        customFields: {
          passpal_last_activity_at: new Date().toISOString(),
        },
        source: "PassPal purchase",
      });
    }
  } catch (e) {
    console.error("[ghl] purchase sync error", e);
  }
}

async function handleChargeRefunded(charge: any, env: StripeEnv) {
  // Full or partial refund on the underlying charge. Revoke access if the
  // charge is fully refunded.
  if (!charge.refunded && (charge.amount_refunded ?? 0) < (charge.amount ?? 0)) {
    return;
  }
  const paymentIntentId: string | undefined = charge.payment_intent;
  if (!paymentIntentId) return;

  const supabase = getSupabase();
  const { error } = await supabase
    .from("purchases")
    .delete()
    .eq("transaction_id", paymentIntentId)
    .eq("environment", env);
  if (error) console.error("purchases revoke error", error);
}

async function handleChargeDisputeClosed(dispute: any, env: StripeEnv) {
  // Revoke access when a chargeback is lost.
  if (dispute.status !== "lost") return;
  const chargeId: string | undefined = dispute.charge;
  if (!chargeId) return;

  try {
    const stripe = createStripeClient(env);
    const charge = await stripe.charges.retrieve(chargeId);
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!paymentIntentId) return;

    const supabase = getSupabase();
    const { error } = await supabase
      .from("purchases")
      .delete()
      .eq("transaction_id", paymentIntentId)
      .eq("environment", env);
    if (error) console.error("purchases dispute revoke error", error);
  } catch (e) {
    console.error("dispute lookup error", e);
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object, env);
      break;
    case "charge.dispute.closed":
      await handleChargeDisputeClosed(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook missing/invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
