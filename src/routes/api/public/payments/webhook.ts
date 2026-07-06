import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

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

// A purchase of the bundle unlocks both individual exam products.
const BUNDLE_PRODUCT_ID = "exam_bundle";
const BUNDLE_UNLOCKS = ["real_estate_exam", "life_health_exam"];

function productsToGrant(productId: string): string[] {
  if (productId === BUNDLE_PRODUCT_ID) return [BUNDLE_PRODUCT_ID, ...BUNDLE_UNLOCKS];
  return [productId];
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const userId: string | undefined = data.customData?.userId;
  const productId: string | undefined = data.customData?.productId;
  const priceId: string | undefined = data.customData?.priceId;
  const transactionId: string = data.id;
  const utmSource: string | undefined = data.customData?.utm_source;
  const utmMedium: string | undefined = data.customData?.utm_medium;
  const utmCampaign: string | undefined = data.customData?.utm_campaign;
  const ref: string | undefined = data.customData?.ref;

  if (!userId || !productId || !priceId) {
    console.warn("Skipping transaction: missing customData", { transactionId });
    return;
  }

  const supabase = getSupabase();
  const rows = productsToGrant(productId).map((pid) => ({
    user_id: userId,
    product_id: pid,
    price_id: pid === productId ? priceId : `${pid}_price`,
    transaction_id: transactionId,
    environment: env,
    status: "completed",
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    ref: ref,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await (supabase.from("purchases") as any)
    .upsert(rows, { onConflict: "user_id,product_id,environment" });
  if (error) console.error("purchases upsert error", error);
}

async function handleTransactionRefunded(data: any, env: PaddleEnv) {
  // On refund or payment failure, revoke access for all products granted by
  // this transaction.
  const transactionId: string = data.id;
  const supabase = getSupabase();
  const { error } = await supabase
    .from("purchases")
    .delete()
    .eq("transaction_id", transactionId)
    .eq("environment", env);
  if (error) console.error("purchases revoke error", error);
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data, env);
      break;
    case EventName.TransactionPaymentFailed:
      await handleTransactionRefunded(event.data, env);
      break;
    default:
      console.log("Unhandled event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
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
