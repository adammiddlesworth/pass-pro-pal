import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { checkIsAdmin } from "@/lib/admin.functions";
import { listUsers } from "@/lib/admin-users.functions";
import { runGhlSyncNow } from "@/lib/ghl-sync.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users/")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { data: adminCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkIsAdmin(),
  });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => listUsers({ data: { page, perPage: 50, search } }),
    enabled: !!adminCheck?.isAdmin,
  });

  const ghlSync = useMutation({
    mutationFn: () => runGhlSyncNow(),
    onSuccess: (s: any) =>
      toast.success(
        `GHL sync: ${s.succeeded}/${s.processed} succeeded (${s.failed} failed) in ${Math.round(s.durationMs / 1000)}s`,
      ),
    onError: (e: any) => toast.error(e?.message ?? "GHL sync failed"),
  });

  if (checkingAdmin) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!adminCheck?.isAdmin) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-bold">Not authorized</h1>
        <p className="mt-2 text-muted-foreground">
          You need the admin role to view users.
        </p>
      </div>
    );
  }

  const rows = data?.users || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/admin/exams" className="inline-flex items-center hover:text-foreground">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Admin
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View accounts and drill into their progress.
          </p>
        </div>
        <Link to="/admin/exams">
          <Button variant="outline">Manage Exams</Button>
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Track</th>
                    <th className="px-4 py-3 text-right">Attempts</th>
                    <th className="px-4 py-3 text-right">Completed</th>
                    <th className="px-4 py-3 text-right">Avg Score</th>
                    <th className="px-4 py-3 text-right">Purchases</th>
                    <th className="px-4 py-3">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr
                      key={u.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                      onClick={() =>
                        navigate({
                          to: "/admin/users/$userId",
                          params: { userId: u.id },
                        })
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {u.display_name || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {u.email || u.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.active_track || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{u.attempts_total}</td>
                      <td className="px-4 py-3 text-right">
                        {u.attempts_completed}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.avg_score_pct != null
                          ? `${u.avg_score_pct.toFixed(0)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{u.purchases_count}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.last_active_at
                          ? new Date(u.last_active_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <div>Page {page}</div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length < 50}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
