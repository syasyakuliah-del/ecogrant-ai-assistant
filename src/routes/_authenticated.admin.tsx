import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile && !isAdmin) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, loading, profile, navigate]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <ShieldAlert className="size-8" />
        <p className="text-sm">Memeriksa hak akses administrasi…</p>
      </div>
    );
  }

  return <Outlet />;
}