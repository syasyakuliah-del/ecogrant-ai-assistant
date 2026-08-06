import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Leaf } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoGrant AI — Masuk ke Ruang Kerja Proposal" },
      {
        name: "description",
        content:
          "Masuk ke EcoGrant AI untuk menyusun proposal hibah kehutanan dan lingkungan dengan bantuan kecerdasan buatan.",
      },
      { property: "og:title", content: "EcoGrant AI — Masuk ke Ruang Kerja Proposal" },
      {
        property: "og:description",
        content: "Ruang kerja penyusunan proposal hibah dengan Logical Framework, SBM, SBU, dan RAB terintegrasi.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    void navigate({ to: user ? "/dashboard" : "/auth", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Leaf className="size-8 animate-pulse text-primary" />
        <p className="text-sm">Memuat EcoGrant AI…</p>
      </div>
    </div>
  );
}
