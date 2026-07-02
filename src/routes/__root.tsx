import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PassPal - Pass Your Licensing Exam" },
      { name: "description", content: "PassPal helps you pass your real estate licensing exam and life & health insurance exam with realistic practice questions." },
      { name: "author", content: "PassPal" },
      { property: "og:title", content: "PassPal - Pass Your Licensing Exam" },
      { property: "og:description", content: "PassPal helps you pass your real estate licensing exam and life & health insurance exam with realistic practice questions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@passpal" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { checkIsAdmin } from "@/lib/admin.functions";
import { getActiveTrack, setActiveTrack } from "@/lib/track.functions";


function Navbar() {
  const { user, loading } = useAuth();
  const { data: adminCheck } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkIsAdmin(),
    enabled: !!user,
  });
  const queryClient = useQueryClient();
  const { data: activeTrack } = useQuery({
    queryKey: ["active-track"],
    queryFn: () => getActiveTrack(),
    enabled: !!user && !!adminCheck?.isAdmin,
  });
  const switchTrack = useMutation({
    mutationFn: (track: "real_estate" | "life_health_insurance") =>
      setActiveTrack({ data: { track } }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };


  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center" aria-label="PassPal home">
          <Logo variant="light" className="h-8 w-auto" />
        </Link>
        <nav className="flex items-center gap-6">
          {user && (
            <Link
              to="/dashboard"
              className="text-sm font-semibold text-secondary/70 transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              Dashboard
            </Link>
          )}
          {adminCheck?.isAdmin && (
            <Link
              to="/admin/exams"
              className="text-sm font-semibold text-secondary/70 transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              Admin
            </Link>
          )}
          {adminCheck?.isAdmin && (
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5">
              <button
                onClick={() => switchTrack.mutate("real_estate")}
                disabled={switchTrack.isPending}
                className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                  activeTrack?.track === "real_estate"
                    ? "bg-primary text-primary-foreground"
                    : "text-secondary/70 hover:text-primary"
                }`}
                title="Switch to Real Estate (admin)"
              >
                RE
              </button>
              <button
                onClick={() => switchTrack.mutate("life_health_insurance")}
                disabled={switchTrack.isPending}
                className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                  activeTrack?.track === "life_health_insurance"
                    ? "bg-primary text-primary-foreground"
                    : "text-secondary/70 hover:text-primary"
                }`}
                title="Switch to Life & Health Insurance (admin)"
              >
                L&H
              </button>
            </div>
          )}

          {user && (
            <Link
              to="/exams"
              className="text-sm font-semibold text-secondary/70 transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              Exams
            </Link>
          )}
          {loading ? null : user ? (
            <button
              onClick={handleSignOut}
              className="text-sm font-semibold text-secondary/70 transition-colors hover:text-primary"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
            >
              Sign in
            </Link>
          )}
        </nav>

      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-border bg-secondary py-8 text-center text-sm text-secondary-foreground/80">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4">
            <Logo variant="mark-white" className="h-8 w-auto" />
            <p>PassPal &copy; {new Date().getFullYear()}</p>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}
