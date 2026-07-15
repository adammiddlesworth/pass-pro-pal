import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { checkIsAdmin } from "@/lib/admin.functions";
import {
  listGhlSyncRuns,
  runGhlSyncNow,
  type GhlSyncRunRow,
} from "@/lib/ghl-sync.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/ghl-sync")({
  component: AdminGhlSyncPage,
});

function AdminGhlSyncPage() {
  const qc = useQueryClient();
  const { data: adminCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkIsAdmin(),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ghl-sync-runs"],
    queryFn: () => listGhlSyncRuns(),
    enabled: !!adminCheck?.isAdmin,
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const ghlSync = useMutation({
    mutationFn: () => runGhlSyncNow(),
    onSuccess: (s: any) => {
      toast.success(
        `Sync complete: ${s.succeeded}/${s.processed} succeeded (${s.failed} failed)`,
      );
      qc.invalidateQueries({ queryKey: ["ghl-sync-runs"] });
    },
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
      </div>
    );
  }

  const runs = data?.runs ?? [];

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              to="/admin/users"
              className="inline-flex items-center hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Users
            </Link>
          </div>
          <h1 className="text-3xl font-bold">GHL sync history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recent nightly and manual runs. Expand a row to see per-contact
            errors returned by GoHighLevel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button onClick={() => ghlSync.mutate()} disabled={ghlSync.isPending}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${ghlSync.isPending ? "animate-spin" : ""}`}
            />
            {ghlSync.isPending ? "Syncing…" : "Run now"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sync runs recorded yet. Click "Run now" to trigger one.
        </p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-8 px-4 py-3"></th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3">Trigger</th>
                    <th className="px-4 py-3 text-right">Processed</th>
                    <th className="px-4 py-3 text-right">Succeeded</th>
                    <th className="px-4 py-3 text-right">Failed</th>
                    <th className="px-4 py-3 text-right">Skipped</th>
                    <th className="px-4 py-3 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <RunRows
                      key={run.id}
                      run={run}
                      expanded={expanded.has(run.id)}
                      onToggle={() => toggle(run.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RunRows({
  run,
  expanded,
  onToggle,
}: {
  run: GhlSyncRunRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasErrors = run.errors && run.errors.length > 0;
  return (
    <>
      <tr
        className={`border-b ${hasErrors ? "cursor-pointer hover:bg-muted/40" : ""}`}
        onClick={hasErrors ? onToggle : undefined}
      >
        <td className="px-4 py-3 text-muted-foreground">
          {hasErrors ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : null}
        </td>
        <td className="px-4 py-3">
          {new Date(run.started_at).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <Badge variant={run.trigger === "manual" ? "default" : "secondary"}>
            {run.trigger}
          </Badge>
        </td>
        <td className="px-4 py-3 text-right">{run.processed}</td>
        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
          {run.succeeded}
        </td>
        <td
          className={`px-4 py-3 text-right ${run.failed > 0 ? "text-destructive font-medium" : ""}`}
        >
          {run.failed}
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground">
          {run.skipped}
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground">
          {(run.duration_ms / 1000).toFixed(1)}s
        </td>
      </tr>
      {expanded && hasErrors && (
        <tr className="border-b bg-muted/20">
          <td colSpan={8} className="px-4 py-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {run.errors.length} error{run.errors.length === 1 ? "" : "s"}
              {run.truncated && " (truncated to first 100)"}
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              {run.errors.map((err, i) => (
                <div
                  key={`${err.user_id}-${i}`}
                  className="flex flex-col gap-0.5 rounded border bg-background px-3 py-2 sm:flex-row sm:items-start sm:gap-3"
                >
                  <span className="min-w-[220px] font-sans font-medium">
                    {err.email ?? err.user_id.slice(0, 8)}
                  </span>
                  <span className="text-destructive break-all">
                    {err.error}
                  </span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
