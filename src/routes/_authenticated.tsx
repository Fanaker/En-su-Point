import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PointModalProvider } from "@/components/points/PointModalContext";

export const Route = createFileRoute("/_authenticated")({ component: AuthGate });

function AuthGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell>
      <PointModalProvider>
        <Outlet />
      </PointModalProvider>
    </AppShell>
  );
}
