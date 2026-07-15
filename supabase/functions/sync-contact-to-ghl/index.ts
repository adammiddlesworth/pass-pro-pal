// Edge Function: sync-contact-to-ghl
// Upserts a contact row to GoHighLevel via the LeadConnector v2 API and
// writes ghl_sync_status / ghl_contact_id / ghl_last_error back to the row.

const GHL_URL = "https://services.leadconnectorhq.com/contacts/upsert";
const GHL_LOCATION_ID = "9uWBAvTwPwKSyhRDtnmh";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = Deno.env.get("GHL_API_TOKEN");
  if (!token) return json({ error: "GHL_API_TOKEN not configured" }, 500);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Missing Authorization" }, 401);

  // Identify the caller (RLS-scoped read).
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${jwt}`, apikey: serviceKey },
  });
  if (!userRes.ok) return json({ error: "Invalid session" }, 401);
  const user = await userRes.json();
  const userId: string | undefined = user?.id;
  if (!userId) return json({ error: "Invalid session" }, 401);

  let payload: { contactId?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const contactId = payload.contactId;
  if (!contactId) return json({ error: "contactId is required" }, 400);

  // Load contact via service role and verify ownership.
  const admin = (path: string, init?: RequestInit) =>
    fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(init?.headers ?? {}),
      },
    });

  const loadRes = await admin(
    `contacts?id=eq.${contactId}&select=id,user_id,first_name,last_name,email,phone`,
  );
  if (!loadRes.ok) return json({ error: "Failed to load contact" }, 500);
  const rows = (await loadRes.json()) as Array<{
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  }>;
  const contact = rows[0];
  if (!contact) return json({ error: "Contact not found" }, 404);
  if (contact.user_id !== userId) return json({ error: "Forbidden" }, 403);

  const body = {
    locationId: GHL_LOCATION_ID,
    firstName: contact.first_name ?? undefined,
    lastName: contact.last_name ?? undefined,
    email: contact.email ?? undefined,
    phone: contact.phone ?? undefined,
    tags: ["lovable-sync"],
    source: "Lovable App",
  };

  const ghlRes = await fetch(GHL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const ghlText = await ghlRes.text();
  let ghlJson: any = null;
  try {
    ghlJson = ghlText ? JSON.parse(ghlText) : null;
  } catch {
    /* non-JSON */
  }

  if (!ghlRes.ok) {
    let userMessage = `GHL ${ghlRes.status}: ${ghlText.slice(0, 500)}`;
    if (ghlRes.status === 401) {
      userMessage =
        "401 — GHL token is invalid or missing required scopes (contacts.readonly, contacts.write).";
    } else if (ghlRes.status === 422) {
      const msg =
        ghlJson?.message ??
        (Array.isArray(ghlJson?.errors)
          ? ghlJson.errors
              .map((e: any) => `${e.path ?? e.field ?? "field"}: ${e.message ?? JSON.stringify(e)}`)
              .join("; ")
          : ghlText);
      userMessage = `422 — validation failed: ${msg}`;
    }
    await admin(`contacts?id=eq.${contactId}`, {
      method: "PATCH",
      body: JSON.stringify({
        ghl_sync_status: "failed",
        ghl_last_error: userMessage,
        ghl_last_synced_at: new Date().toISOString(),
      }),
    });
    return json(
      { ok: false, status: ghlRes.status, error: userMessage, raw: ghlJson ?? ghlText },
      ghlRes.status === 401 || ghlRes.status === 422 ? ghlRes.status : 502,
    );
  }

  const ghlContactId: string | null =
    ghlJson?.contact?.id ?? ghlJson?.id ?? null;

  await admin(`contacts?id=eq.${contactId}`, {
    method: "PATCH",
    body: JSON.stringify({
      ghl_sync_status: "synced",
      ghl_contact_id: ghlContactId,
      ghl_last_error: null,
      ghl_last_synced_at: new Date().toISOString(),
    }),
  });

  return json({ ok: true, contactId, ghlContactId });
});
