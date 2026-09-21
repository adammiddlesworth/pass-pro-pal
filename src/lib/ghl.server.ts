/**
 * GoHighLevel (LeadConnector) sync — server-only.
 *
 * Uses a Private Integration Token (PIT) scoped to one sub-account (location).
 * Requires env: GHL_API_TOKEN (or legacy GHL_PIT), GHL_LOCATION_ID.
 *
 * All calls are best-effort — they log on failure and never throw into the
 * caller's request path. CRM sync must never break signup, checkout, or
 * diagnostic completion.
 */

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

function creds() {
  const token = process.env.GHL_API_TOKEN ?? process.env.GHL_PIT;
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

export type GhlUpsertResult =
  | { ok: true; contactId: string }
  | { ok: false; error: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Global outgoing-request pacer. GHL allows 100 requests per rolling 10s per
 * location; we self-limit to 50 per 10s (~5/sec) so bursts never trip it.
 * Every GHL call in this module goes through here, so the limit holds no
 * matter how many users the nightly sync walks in parallel.
 */
const RATE_WINDOW_MS = 10_000;
const RATE_MAX_IN_WINDOW = 50;
const recentCalls: number[] = [];
let gate: Promise<void> = Promise.resolve();

async function acquireSlot(): Promise<void> {
  // Serialise slot acquisition so concurrent callers can't both pass the check.
  const previous = gate;
  let release!: () => void;
  gate = new Promise<void>((res) => {
    release = res;
  });
  await previous;
  try {
    for (;;) {
      const now = Date.now();
      while (recentCalls.length && now - recentCalls[0]! >= RATE_WINDOW_MS) {
        recentCalls.shift();
      }
      if (recentCalls.length < RATE_MAX_IN_WINDOW) {
        recentCalls.push(now);
        return;
      }
      // Wait until the oldest call ages out of the window.
      await sleep(RATE_WINDOW_MS - (now - recentCalls[0]!) + 50);
    }
  } finally {
    release();
  }
}

/**
 * Fetch wrapper that never throws, paces all outgoing calls, and retries on
 * GHL rate limiting (429) or transient 5xx. A 429 means the 10s window is
 * saturated, so we wait a full window before retrying.
 */
async function safeFetch(url: string, init: RequestInit): Promise<Response | null> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await acquireSlot();
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (e) {
      console.error("[ghl] network error", url, e);
      if (attempt === MAX_ATTEMPTS) return null;
      await sleep(500 * 2 ** (attempt - 1));
      continue;
    }

    const retryable = res.status === 429 || res.status === 502 || res.status === 503;
    if (!retryable || attempt === MAX_ATTEMPTS) return res;

    const retryAfter = Number(res.headers.get("retry-after"));
    let waitMs: number;
    if (res.status === 429) {
      // Drain GHL's full rolling window before trying again, and clear our
      // own bookkeeping so we restart the window from scratch.
      recentCalls.length = 0;
      waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 30_000)
          : 11_000;
    } else {
      waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 10_000)
          : 1000 * 2 ** (attempt - 1);
    }
    console.warn(`[ghl] ${res.status} on ${url} — retrying in ${waitMs}ms (attempt ${attempt})`);
    await sleep(waitMs);
  }
  return null;
}



/**
 * Upsert a contact by email in the configured location. Idempotent.
 */
export async function upsertContact(input: GhlUpsertInput): Promise<GhlUpsertResult> {
  const c = creds();
  if (!c) {
    console.warn("[ghl] GHL_API_TOKEN / GHL_LOCATION_ID not set — skipping sync");
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

/** Fetch a contact to read current tags/custom fields. */
export async function getContact(contactId: string): Promise<{ tags: string[] } | null> {
  const c = creds();
  if (!c) return null;
  const res = await safeFetch(`${GHL_BASE}/contacts/${contactId}`, {
    method: "GET",
    headers: headers(c.token),
  });
  if (!res || !res.ok) {
    if (res) {
      const text = await res.text().catch(() => "");
      console.error(`[ghl] getContact ${res.status}: ${text}`);
    }
    return null;
  }
  const json = (await res.json().catch(() => ({}))) as any;
  const tags: string[] = Array.isArray(json?.contact?.tags)
    ? json.contact.tags
    : Array.isArray(json?.tags)
    ? json.tags
    : [];
  return { tags };
}

/** Add tags to an existing contact. */
export async function addContactTags(contactId: string, tags: string[]): Promise<boolean> {
  const c = creds();
  if (!c || tags.length === 0) return false;
  const res = await safeFetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: headers(c.token),
    body: JSON.stringify({ tags }),
  });
  if (!res || !res.ok) {
    const text = await res?.text().catch(() => "");
    console.error("[ghl] addContactTags failed", res?.status, text);
    return false;
  }
  return true;
}

/** Remove tags from an existing contact. */
export async function removeContactTags(contactId: string, tags: string[]): Promise<boolean> {
  const c = creds();
  if (!c || tags.length === 0) return false;
  const res = await safeFetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "DELETE",
    headers: headers(c.token),
    body: JSON.stringify({ tags }),
  });
  if (!res || !res.ok) {
    const text = await res?.text().catch(() => "");
    console.error("[ghl] removeContactTags failed", res?.status, text);
    return false;
  }
  return true;
}

/**
 * Reconcile the `passpal-*` tags on a contact so it exactly matches
 * `desiredPasspalTags`. Non-passpal tags are left untouched. Requires that
 * the upsert has already added the desired tags (idempotent add) — this call
 * only computes and removes stale ones.
 */
export async function reconcilePasspalTags(
  contactId: string,
  desiredPasspalTags: string[],
): Promise<void> {
  const current = await getContact(contactId);
  if (!current) return;
  const desired = new Set(desiredPasspalTags);
  const stale = current.tags.filter(
    (t) => t.startsWith("passpal-") && !desired.has(t),
  );
  if (stale.length > 0) {
    await removeContactTags(contactId, stale);
  }
}

/** Fire-and-forget wrapper: never throws, never blocks the caller on errors. */
export function syncToGhl(input: GhlUpsertInput): Promise<GhlUpsertResult> {
  return upsertContact(input).catch((e) => {
    console.error("[ghl] syncToGhl threw", e);
    return { ok: false, error: "threw" };
  });
}
