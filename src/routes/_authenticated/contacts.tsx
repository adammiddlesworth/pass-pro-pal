import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

type Contact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  ghl_sync_status: "pending" | "synced" | "failed" | string;
  ghl_contact_id: string | null;
  ghl_last_error: string | null;
  ghl_last_synced_at: string | null;
  created_at: string;
};

async function invokeSync(contactId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("sync-contact-to-ghl", {
    body: { contactId },
  });
  if (error) {
    // supabase-js surfaces non-2xx as FunctionsHttpError; try to extract the body.
    const anyErr = error as any;
    const ctx = anyErr?.context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        return { ok: false, error: body?.error ?? error.message };
      } catch {
        /* ignore */
      }
    }
    return { ok: false, error: error.message };
  }
  if (data && (data as any).ok === false) {
    return { ok: false, error: (data as any).error ?? "Sync failed" };
  }
  return { ok: true };
}

function ContactsPage() {
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);

  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select(
        "id, first_name, last_name, email, phone, ghl_sync_status, ghl_contact_id, ghl_last_error, ghl_last_synced_at, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Contact[]);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email && !form.phone) {
      toast.error("Provide at least an email or a phone number.");
      return;
    }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      setSaving(false);
      toast.error("Not signed in");
      return;
    }
    const { data: inserted, error } = await supabase
      .from("contacts")
      .insert({
        user_id: userId,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !inserted) {
      toast.error(error?.message ?? "Failed to create contact");
      return;
    }
    setForm({ first_name: "", last_name: "", email: "", phone: "" });
    toast.success("Contact created — syncing to GHL…");
    await refresh();
    // Auto-sync on create.
    const r = await invokeSync(inserted.id);
    if (!r.ok) toast.error(r.error ?? "GHL sync failed");
    else toast.success("Synced to GHL");
    refresh();
  }

  async function syncOne(id: string) {
    setBusyId(id);
    const r = await invokeSync(id);
    setBusyId(null);
    if (!r.ok) toast.error(r.error ?? "GHL sync failed");
    else toast.success("Synced to GHL");
    refresh();
  }

  async function syncAll() {
    if (rows.length === 0) return;
    setBulk({ done: 0, total: rows.length });
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = await invokeSync(rows[i].id);
      if (r.ok) ok += 1;
      else fail += 1;
      setBulk({ done: i + 1, total: rows.length });
      // ~150ms between requests keeps us under 100 req / 10s.
      await new Promise((res) => setTimeout(res, 150));
    }
    setBulk(null);
    toast.success(`Bulk sync complete: ${ok} synced, ${fail} failed`);
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  }

  const summary = useMemo(() => {
    const s = { synced: 0, failed: 0, pending: 0 };
    for (const r of rows) {
      if (r.ghl_sync_status === "synced") s.synced += 1;
      else if (r.ghl_sync_status === "failed") s.failed += 1;
      else s.pending += 1;
    }
    return s;
  }, [rows]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Synced to GoHighLevel. {summary.synced} synced · {summary.failed} failed ·{" "}
            {summary.pending} pending.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={syncAll}
          disabled={bulk !== null || rows.length === 0}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${bulk ? "animate-spin" : ""}`} />
          {bulk ? `Syncing ${bulk.done}/${bulk.total}…` : "Sync All to GHL"}
        </Button>
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Add a contact</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create & sync"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">GHL status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-4 py-6 text-muted-foreground" colSpan={5}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td className="px-4 py-6 text-muted-foreground" colSpan={5}>No contacts yet.</td></tr>
                ) : (
                  rows.map((c) => {
                    const status = c.ghl_sync_status;
                    const badge =
                      status === "synced"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : status === "failed"
                          ? "bg-red-500/15 text-red-600 dark:text-red-400"
                          : "bg-muted text-muted-foreground";
                    return (
                      <tr key={c.id} className="border-b align-top">
                        <td className="px-4 py-3">
                          {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="px-4 py-3">{c.email ?? "—"}</td>
                        <td className="px-4 py-3">{c.phone ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${badge}`}
                            title={
                              c.ghl_last_error
                                ? `Last error: ${c.ghl_last_error}`
                                : c.ghl_last_synced_at
                                  ? `Last synced: ${new Date(c.ghl_last_synced_at).toLocaleString()}`
                                  : "Never synced"
                            }
                          >
                            {status}
                          </span>
                          {c.ghl_contact_id && (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              GHL ID: {c.ghl_contact_id}
                            </div>
                          )}
                          {c.ghl_last_error && (
                            <div className="mt-1 max-w-md truncate text-[11px] text-red-500" title={c.ghl_last_error}>
                              {c.ghl_last_error}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => syncOne(c.id)}
                              disabled={busyId === c.id || bulk !== null}
                            >
                              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busyId === c.id ? "animate-spin" : ""}`} />
                              {status === "failed" ? "Retry" : "Sync"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(c.id)}
                              disabled={busyId === c.id || bulk !== null}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
