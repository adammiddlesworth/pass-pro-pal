import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  getProfile,
  updateProfile,
  updateTestDate,
} from "@/lib/profile.functions";
import { getStudyTime } from "@/lib/dashboard.functions";
import { formatStudyDuration } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PassPal" },
      { name: "description", content: "Manage your PassPal account details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
  });
  const { data: studyTime } = useQuery({
    queryKey: ["study-time"],
    queryFn: () => getStudyTime(),
  });

  const [displayName, setDisplayName] = useState("");
  const [track, setTrack] = useState<
    "real_estate" | "life_health_insurance" | ""
  >("");
  const [testDate, setTestDate] = useState<Date | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setTrack(profile.active_track ?? "");
    setTestDate(profile.test_date ? parseISO(profile.test_date) : undefined);
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: () =>
      updateProfile({
        data: {
          display_name: displayName,
          active_track: track === "" ? null : track,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["active-track"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update profile"),
  });

  const saveTestDate = useMutation({
    mutationFn: (date: string | null) => updateTestDate({ data: { date } }),
    onSuccess: () => {
      toast.success("Test date saved");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save test date"),
  });

  const [changingPw, setChangingPw] = useState(false);
  const handleChangePassword = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      setPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update password");
    } finally {
      setChangingPw(false);
    }
  };

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and study preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name and email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email ?? ""} disabled />
          </div>
          <div className="space-y-1">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
            />
          </div>
          <div>
            <Button
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending || !displayName.trim()}
            >
              {saveProfile.isPending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Study preferences</CardTitle>
          <CardDescription>
            Set your track and target test date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Active track</Label>
            <Select
              value={track || undefined}
              onValueChange={(v) =>
                setTrack(v as "real_estate" | "life_health_insurance")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="real_estate">Real Estate</SelectItem>
                <SelectItem value="life_health_insurance">
                  Life &amp; Health Insurance
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Save profile below to apply track changes.
            </p>
          </div>

          <div className="space-y-1">
            <Label>Test date</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !testDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {testDate ? format(testDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={testDate}
                    onSelect={(d) => {
                      setTestDate(d ?? undefined);
                      if (d) {
                        saveTestDate.mutate(format(d, "yyyy-MM-dd"));
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {testDate && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setTestDate(undefined);
                    saveTestDate.mutate(null);
                  }}
                  disabled={saveTestDate.isPending}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Study time</CardTitle>
          <CardDescription>Time spent on exams and reviews.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-2xl font-bold tabular-nums">
                {formatStudyDuration(studyTime?.total_seconds ?? 0)}
              </div>
              <div className="text-xs text-muted-foreground">All time</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">
                {formatStudyDuration(studyTime?.week_seconds ?? 0)}
              </div>
              <div className="text-xs text-muted-foreground">This week</div>
            </div>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Change password or sign out.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleChangePassword}
              disabled={changingPw || !password || !confirmPassword}
            >
              {changingPw ? "Updating…" : "Update password"}
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
