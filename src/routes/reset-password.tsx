import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Supabase auto-processes recovery tokens from the URL hash.
    // Check for an active session to confirm the link is valid.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsRecovery(true);
      }
    });
  }, []);

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Reset Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isRecovery ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Invalid or expired reset link.
              </p>
              <Link to="/auth" className="inline-block text-sm text-primary hover:underline">
                Go to sign in
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Your password has been updated.
              </p>
              <Link to="/auth">
                <Button className="w-full">Sign in</Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Enter your new password below.
              </p>
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
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={loading || !password || !confirmPassword}
                className="w-full"
              >
                Update password
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
