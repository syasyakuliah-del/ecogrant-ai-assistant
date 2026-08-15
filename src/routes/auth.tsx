import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Masuk atau Daftar — EcoGrant AI" },
      {
        name: "description",
        content:
          "Halaman autentikasi EcoGrant AI untuk pengelola program hibah kehutanan dan lingkungan.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:site_name", content: "EcoGrant AI" },
      { property: "og:title", content: "Masuk atau Daftar — EcoGrant AI" },
      {
        property: "og:description",
        content: "Akses ruang kerja penyusunan proposal hibah EcoGrant AI.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ecogrant.ai/auth" },
      { property: "og:image", content: "https://ecogrant.ai/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Masuk atau Daftar — EcoGrant AI" },
      { name: "twitter:description", content: "Akses ruang kerja penyusunan proposal hibah EcoGrant AI." },
      { name: "twitter:image", content: "https://ecogrant.ai/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://ecogrant.ai/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const { user, loading, isAdmin } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const redirectTarget = search.redirect && search.redirect !== "/dashboard"
        ? search.redirect
        : (isAdmin ? "/admin" : "/dashboard");
      void navigate({ to: redirectTarget, replace: true });
    }
  }, [user, loading, navigate, search.redirect, isAdmin]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Leaf className="size-8 animate-pulse text-primary" />
          <p className="text-sm">Mengalihkan ke ruang kerja…</p>
        </div>
      </div>
    );
  }

  async function handleGoogleLogin() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    
    if (error) {
      setBusy(false);
      toast.error(error.message || "Gagal masuk dengan Google.");
      return;
    }
    // The user will be redirected to Google for authentication,
    // so we don't need to do anything else here.
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Leaf className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">EcoGrant AI</span>
        </div>
        <div className="max-w-md space-y-5">
          <h1 className="font-display text-4xl leading-tight font-semibold">
            Menerjemahkan ide lapangan menjadi proposal hibah yang siap diajukan.
          </h1>
          <p className="text-sm leading-relaxed opacity-80">
            Narasi formal, Logical Framework Matrix, validasi Standar Biaya Masukan dan Standar
            Biaya Umum, serta Rencana Anggaran Biaya terintegrasi dalam satu sumber data.
          </p>
          <ul className="space-y-2 text-sm opacity-80">
            <li>Wizard sepuluh langkah dengan penyimpanan otomatis</li>
            <li>Pencocokan lembaga donor beserta skor kesesuaian</li>
            <li>Ekspor dokumen PDF, DOCX, dan XLSX</li>
          </ul>
        </div>
        <p className="text-xs opacity-60">Versi 1.0 — Bahasa Indonesia formal</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">EcoGrant AI</span>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Masuk ke EcoGrant AI
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Lanjutkan dengan akun Google Anda untuk mengakses ruang kerja.
              </p>
            </div>

            <Button 
              type="button" 
              className="w-full h-11" 
              variant="outline" 
              onClick={handleGoogleLogin} 
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <svg className="mr-2 size-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Lanjutkan dengan Google
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
