import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { initializePaddle, getPaddleEnvironment } from "@/lib/paddle";
import { resolvePaddlePrice } from "@/utils/payments.functions";
import { CATEGORY_PRODUCT_IDS } from "@/lib/exams.functions";
import {
  buildAttributionSearch,
  mergeAttribution,
  type AttributionParams,
} from "@/lib/attribution";
import { toast } from "sonner";

type OpenOptions = {
  attribution?: AttributionParams;
  /** If true and user is signed out, navigate to /auth?mode=signup&redirect=... instead of opening checkout. */
  redirectToAuth?: boolean;
  /** Override the product resolved from category (e.g. "exam_bundle"). */
  productId?: string;
};

export function useTrackCheckout(category: string | undefined | null) {
  const { user } = useAuth();
  const [checkingOut, setCheckingOut] = useState(false);

  const openCheckout = async (opts: OpenOptions = {}) => {
    const productId =
      opts.productId ?? (category ? CATEGORY_PRODUCT_IDS[category] : undefined);
    if (!productId) {
      toast.error("Choose a track first.");
      return;
    }
    if (!user) {
      if (opts.redirectToAuth && typeof window !== "undefined") {
        const redirect = window.location.pathname + window.location.search;
        window.location.href = `/auth?mode=signup&redirect=${encodeURIComponent(redirect)}`;
      }
      return;
    }

    setCheckingOut(true);
    try {
      await initializePaddle();
      const env = getPaddleEnvironment();
      const internalPriceId = await resolvePaddlePrice({
        data: { priceId: `${productId}_price`, environment: env },
      });
      const attribution = mergeAttribution(opts.attribution ?? {});
      const successUrl = new URL("/checkout/success", window.location.origin);
      for (const [key, value] of Object.entries(buildAttributionSearch(attribution))) {
        successUrl.searchParams.set(key, value);
      }
      (window as any).Paddle.Checkout.open({
        items: [{ priceId: internalPriceId, quantity: 1 }],
        customer: user.email ? { email: user.email } : undefined,
        customData: {
          userId: user.id,
          productId,
          priceId: `${productId}_price`,
          ...attribution,
        },
        settings: {
          successUrl: successUrl.toString(),
        },
      });
    } catch (e) {
      console.error("Checkout failed", e);
      toast.error("Couldn't open checkout — try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  return { openCheckout, checkingOut };
}

