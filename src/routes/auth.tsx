import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import {
  attributionSearchSchema,
  buildAttributionSearch,
  isGhlAttribution,
  mergeAttribution,
  storeAttribution,
} from "@/lib/attribution";

const searchSchema = z.object({
  redirect: z.string().optional(),
  email: z.string().optional(),
  ...attributionSearchSchema.shape,
});

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(searchSchema),
  component: AuthPage,
});

function isSafeRedirect(path: string | undefined): path is string {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, email: prefilledEmail, ...rawAttribution } = Route.useSearch();
  const attribution = mergeAttribution(rawAttribution);
  const fromGhl = isGhlAttribution(attribution);
  const returnUrl = isSafeRedirect(redirect) ? redirect : "/dashboard";
  const returnSearch = buildAttributionSearch(attribution);

  useEffect(() => {
    storeAttribution(attribution);
  }, [attribution]);

  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");

  const handleGoogleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.redirected) return;
    if (result.error) {
      console.error("Sign in error:", result.error);
      setError("Google sign in failed. Try email/password below.");
    }
  };

  const handleEmailAuth = async (tabMode: "signin" | "signup") => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (tabMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // If auto-confirm is enabled, a session may be returned immediately.
        if (data.session) {
          navigate({ to: returnUrl });
        } else {
          setInfo("Check your email to confirm your account, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: returnUrl });
      }
    } catch (e: any) {
      setError(e.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setInfo("Password reset link sent. Check your email.");
    } catch (e: any) {
      setError(e.message ?? "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Welcome to PassPal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGoogleSignIn} variant="outline" className="w-full">
            Continue with Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {mode === "forgot" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send you a reset link.
              </p>
              <div className="space-y-1">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <Button
                onClick={handleForgotPassword}
                disabled={loading || !email}
                className="w-full"
              >
                Send reset link
              </Button>
              <button
                type="button"
                onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
                className="w-full text-center text-sm text-primary hover:underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <Tabs
              value={mode}
              onValueChange={(v) => { setMode(v as "signin" | "signup"); setError(null); }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              {(["signin", "signup"] as const).map((tabMode) => (
                <TabsContent key={tabMode} value={tabMode} className="space-y-3 pt-3">
                  <div className="space-y-1">
                    <Label htmlFor={`${tabMode}-email`}>Email</Label>
                    <Input
                      id={`${tabMode}-email`}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${tabMode}-password`}>Password</Label>
                    <Input
                      id={`${tabMode}-password`}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={tabMode === "signin" ? "current-password" : "new-password"
                      }
                    />
                  </div>
                  {tabMode === "signin" && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => { setMode("forgot"); setError(null); setInfo(null); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                  <Button
                    onClick={() => handleEmailAuth(tabMode)}
                    disabled={loading || !email || !password}
                    className="w-full"
                  >
                    {tabMode === "signin" ? "Sign in" : "Create account"}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-muted-foreground">{info}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
