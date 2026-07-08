/**
 * GoHighLevel (LeadConnector) sync — server-only.
 *
 * Uses a Private Integration Token (PIT) scoped to one sub-account (location).
 * Requires env: GHL_PIT, GHL_LOCATION_ID.
 *
 * All calls are best-effort — they log on failure and never throw into the
 * caller's request path. CRM sync must never break signup, checkout, or
 * diagnostic completion.
 */

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

function creds() {
  const token = process.env.GHL_PIT;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) return null;
  return { token, locationId };
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export type GhlUpsertInput = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  phone?: string | null;
  tags?: string[];
  /** Map of custom-field key -> value. Fields must exist in GHL first. */
  customFields?: Record<string, string | number | null | undefined>;
  source?: string;
};

export type GhlResult = { ok: true; contactId: string } | { ok: false; error: string };

async function safeFetch(url: string, init: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, init);
  } catch (e) {
    console.error("[ghl] network error", url, e);
    return null;
  }
}

/**
 * Upsert a contact by email in the configured location. Idempotent.
 * See: https://highlevel.stoplight.io/docs/integrations/9f5f3f6f6f6f6-upsert-contact
 */
export async function upsertContact(input: GhlUpsertInput): Promise<GhlResult> {
  const c = creds();
  if (!c) {
    console.warn("[ghl] GHL_PIT / GHL_LOCATION_ID not set — skipping sync");
    return { ok: false, error: "not_configured" };
  }
  if (!input.email) return { ok: false, error: "missing_email" };

  const customFields = input.customFields
    ? Object.entries(input.customFields)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([key, value]) => ({ key, field_value: String(value) }))
    : undefined;

  const body: Record<string, unknown> = {
    locationId: c.locationId,
    email: input.email,
    source: input.source ?? "PassPal",
  };
  if (input.firstName) body.firstName = input.firstName;
  if (input.lastName) body.lastName = input.lastName;
  if (input.name) body.name = input.name;
  if (input.phone) body.phone = input.phone;
  if (input.tags && input.tags.length > 0) body.tags = input.tags;
  if (customFields && customFields.length > 0) body.customFields = customFields;

  const res = await safeFetch(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers: headers(c.token),
    body: JSON.stringify(body),
  });
  if (!res) return { ok: false, error: "network" };

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[ghl] upsertContact ${res.status}: ${text}`);
    return { ok: false, error: `${res.status}: ${text.slice(0, 200)}` };
  }

  const json = (await res.json().catch(() => ({}))) as any;
  const contactId = json?.contact?.id ?? json?.id;
  if (!contactId) {
    console.error("[ghl] upsertContact: no contact id in response", json);
    return { ok: false, error: "no_contact_id" };
  }
  return { ok: true, contactId };
}

/** Add extra tags to an existing contact (upsert already accepts tags too). */
export async function addContactTags(contactId: string, tags: string[]): Promise<boolean> {
  const c = creds();
  if (!c || tags.length === 0) return false;
  const res = await safeFetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: headers(c.token),
    body: JSON.stringify({ tags }),
  });
  if (!res || !res.ok) {
    console.error("[ghl] addContactTags failed", res?.status, await res?.text().catch(() => ""));
    return false;
  }
  return true;
}

/** Fire-and-forget wrapper: never throws, never blocks the caller on errors. */
export function syncToGhl(input: GhlUpsertInput): Promise<GhlResult> {
  return upsertContact(input).catch((e) => {
    console.error("[ghl] syncToGhl threw", e);
    return { ok: false, error: "threw" };
  });
}
