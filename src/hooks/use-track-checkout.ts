import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORY_PRODUCT_IDS } from "@/lib/exams.functions";
import { toast } from "sonner";

type OpenOptions = {
  redirectToAuth?: boolean;
  productId?: string;
};

/**
 * Navigates to /checkout/resume which mounts the Stripe Embedded Checkout inline.
 * Signed-out users are sent to /auth first (if `redirectToAuth` is set).
 */
export function useTrackCheckout(category: string | undefined | null) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const openCheckout = async (opts: OpenOptions = {}) => {
    const productId =
      opts.productId ?? (category ? CATEGORY_PRODUCT_IDS[category] : undefined);
    if (!productId) {
      toast.error("Choose a track first.");
      return;
    }
    if (!user) {
      if (opts.redirectToAuth) {
        const redirect = `/checkout/resume?product=${encodeURIComponent(productId)}`;
        navigate({ to: "/auth", search: { mode: "signup", redirect } as any });
      }
      return;
    }
    navigate({
      to: "/checkout/resume",
      search: { product: productId } as any,
    });
  };

  return { openCheckout, checkingOut: false };
}
