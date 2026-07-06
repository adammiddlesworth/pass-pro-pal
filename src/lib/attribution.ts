import { z } from "zod";

export const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "ref",
] as const;

export type AttributionParam = (typeof ATTRIBUTION_PARAMS)[number];
export type AttributionParams = Partial<Record<AttributionParam, string>>;

export const attributionSearchSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  ref: z.string().optional(),
});

export const ATTRIBUTION_STORAGE_KEY = "passpal_attribution";

export function sanitizeAttribution(
  params: Record<string, unknown>
): AttributionParams {
  const result: AttributionParams = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const value = params[key];
    if (typeof value === "string" && value.trim()) {
      result[key] = value.trim();
    }
  }
  return result;
}

export function hasAttribution(params: AttributionParams): boolean {
  return Object.values(params).some(Boolean);
}

export function storeAttribution(params: AttributionParams) {
  if (hasAttribution(params)) {
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(params));
  }
}

export function readStoredAttribution(): AttributionParams {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? sanitizeAttribution(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function clearStoredAttribution() {
  sessionStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
}

export function mergeAttribution(
  urlParams: AttributionParams,
  storedParams: AttributionParams = readStoredAttribution()
): AttributionParams {
  const merged: AttributionParams = { ...storedParams };
  for (const key of ATTRIBUTION_PARAMS) {
    if (urlParams[key]) merged[key] = urlParams[key];
  }
  return merged;
}

export function buildAttributionSearch(
  params: AttributionParams
): Record<string, string> {
  const search: Record<string, string> = {};
  for (const key of ATTRIBUTION_PARAMS) {
    if (params[key]) search[key] = params[key]!;
  }
  return search;
}

export function isGhlAttribution(params: AttributionParams): boolean {
  const source = params.utm_source?.toLowerCase();
  return source === "ghl" || source === "gohighlevel";
}
