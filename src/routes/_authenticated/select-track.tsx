import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, HeartPulse } from "lucide-react";
import { getActiveTrack, setActiveTrack, type TrackId } from "@/lib/track.functions";

export const Route = createFileRoute("/_authenticated/select-track")({
  component: SelectTrackPage,
});

const TRACKS = [
  {
    id: "real_estate" as TrackId,
    label: "Real Estate",
    blurb: "Practice exams for your real estate licensing test.",
    icon: Building2,
    accent: "from-primary/20 to-primary/5",
  },
  {
    id: "life_health_insurance" as TrackId,
    label: "Life & Health Insurance",
    blurb: "Practice exams for your life & health insurance licensing test.",
    icon: HeartPulse,
    accent: "from-secondary/20 to-secondary/5",
  },
];

function SelectTrackPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: current } = useQuery({
    queryKey: ["active-track"],
    queryFn: () => getActiveTrack(),
  });

  const mutate = useMutation({
    mutationFn: (track: TrackId) => setActiveTrack({ data: { track } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["active-track"] });
      navigate({ to: "/dashboard" });
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">Which exam are you preparing for?</h1>
      <p className="mt-2 text-muted-foreground">
        Pick your track to personalize your dashboard. You can switch later from your profile.
      </p>
      {current?.locked && (
        <p className="mt-4 rounded-md border bg-muted p-3 text-sm">
          You already own a track — it's set to <strong>{current.track === "real_estate" ? "Real Estate" : "Life & Health Insurance"}</strong>.
        </p>
      )}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {TRACKS.map((t) => {
          const Icon = t.icon;
          const isCurrent = current?.track === t.id;
          return (
            <button
              key={t.id}
              onClick={() => mutate.mutate(t.id)}
              disabled={mutate.isPending || current?.locked}
              className={`group text-left overflow-hidden rounded-lg border bg-gradient-to-br ${t.accent} p-6 transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Icon className="h-10 w-10 text-primary" />
              <h2 className="mt-4 text-xl font-semibold">{t.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.blurb}</p>
              <div className="mt-4 text-sm font-medium text-primary">
                {isCurrent ? "Current track" : "Choose this track →"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
