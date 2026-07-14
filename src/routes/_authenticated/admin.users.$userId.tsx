import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { checkIsAdmin } from "@/lib/admin.functions";
import { getUserDetail } from "@/lib/admin-users.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatStudyDuration } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/users/$userId")({
  component: AdminUserDetailPage,
});

function AdminUserDetailPage() {
  const { userId } = Route.useParams();
  const { data: adminCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkIsAdmin(),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => getUserDetail({ data: { userId } }),
    enabled: !!adminCheck?.isAdmin,
  });

  if (checkingAdmin || isLoading) {
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
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-bold">User not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6">
        <Link
          to="/admin/users"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All Users
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">
            {data.display_name || data.email || "User"}
          </h1>
          {data.roles.map((r) => (
            <Badge key={r} variant="secondary">
              {r}
            </Badge>
          ))}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.email} · Joined {data.created_at ? new Date(data.created_at).toLocaleDateString() : "—"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time studied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold tabular-nums">
              {formatStudyDuration(data.study_seconds_total)}
            </div>
            <div className="text-xs text-muted-foreground">All time</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Track
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {data.active_track || "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              Test date:{" "}
              {data.test_date
                ? new Date(data.test_date).toLocaleDateString()
                : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {data.streak?.current_streak ?? 0} days
            </div>
            <div className="text-xs text-muted-foreground">
              Best: {data.streak?.best_streak ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last sign-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {data.last_sign_in_at
                ? new Date(data.last_sign_in_at).toLocaleString()
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Category progress</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.categoryRollup.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2 text-right">Attempts</th>
                  <th className="px-4 py-2 text-right">Answered</th>
                  <th className="px-4 py-2 text-right">Correct</th>
                  <th className="px-4 py-2 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {data.categoryRollup.map((r) => (
                  <tr key={r.category} className="border-b">
                    <td className="px-4 py-2">{r.category}</td>
                    <td className="px-4 py-2 text-right">{r.attempts}</td>
                    <td className="px-4 py-2 text-right">{r.answered}</td>
                    <td className="px-4 py-2 text-right">{r.correct}</td>
                    <td className="px-4 py-2 text-right">
                      {r.accuracy_pct != null
                        ? `${r.accuracy_pct.toFixed(0)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Attempts ({data.attempts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.attempts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No attempts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Exam / Category</th>
                    <th className="px-4 py-2 text-right">Score</th>
                    <th className="px-4 py-2">Started</th>
                    <th className="px-4 py-2">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attempts.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="px-4 py-2 capitalize">{a.attempt_type}</td>
                      <td className="px-4 py-2">
                        {a.exam_title ||
                          a.category ||
                          a.exam_category ||
                          "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {a.completed_at
                          ? `${a.score ?? 0} / ${a.total}`
                          : "in progress"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(a.started_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {a.completed_at
                          ? new Date(a.completed_at).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Purchases ({data.purchases.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.purchases.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No purchases.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Env</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.purchases.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="px-4 py-2 font-mono text-xs">{p.product_id}</td>
                    <td className="px-4 py-2">
                      <Badge
                        variant={p.status === "completed" ? "default" : "secondary"}
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {p.environment}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
