import logoLight from "@/assets/logo-full-light.png.asset.json";
import logoDark from "@/assets/logo-full-dark.png.asset.json";
import logoGreen from "@/assets/logo-full-green.png.asset.json";
import logoMarkWhite from "@/assets/logo-mark-white.png.asset.json";

type Variant = "light" | "dark" | "green" | "mark-white";

const sources: Record<Variant, string> = {
  light: logoLight.url,
  dark: logoDark.url,
  green: logoGreen.url,
  "mark-white": logoMarkWhite.url,
};

export function Logo({
  variant = "light",
  className = "",
  alt = "PassPal",
}: {
  variant?: Variant;
  className?: string;
  alt?: string;
}) {
  return <img src={sources[variant]} alt={alt} className={className} />;
}
