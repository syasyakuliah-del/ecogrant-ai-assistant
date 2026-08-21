import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock, Eye, EyeOff, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Atur Ulang Password — EcoGrant AI" },
      { name: "description", content: "Halaman pembuatan password baru akun EcoGrant AI." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (!newPassword) {
      toast.error("Password baru wajib diisi.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password minimal terdiri dari 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok dengan password baru.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setBusy(false);
    if (error) {
      toast.error(error.message || "Gagal memperbarui password. Silakan coba lagi.");
    } else {
      setSuccess(true);
      toast.success("Password Anda telah berhasil diperbarui!");
      setTimeout(() => {
        void navigate({ to: "/dashboard", replace: true });
      }, 2500);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Left Banner */}
      <section className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <img
            src="/logoecograntai.png"
            alt="Logo EcoGrant AI"
            className="h-10 w-auto object-contain rounded-xl"
          />
          <span className="font-display text-lg font-semibold">EcoGrant AI</span>
        </div>
        <div className="max-w-md space-y-5">
          <h2 className="font-display text-4xl leading-tight font-semibold">
            Pembaruan Password Akun EcoGrant AI
          </h2>
          <p className="text-sm leading-relaxed opacity-80">
            Buat password baru yang aman untuk menjaga akses ke ruang kerja dan seluruh data proposal hibah Anda.
          </p>
        </div>
        <p className="text-xs opacity-60">Versi 1.0 — Bahasa Indonesia formal</p>
      </section>

      {/* Right Form Content */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img
              src="/logoecograntai.png"
              alt="Logo EcoGrant AI"
              className="h-10 w-auto object-contain rounded-xl"
            />
            <span className="font-display text-lg font-semibold">EcoGrant AI</span>
          </div>

          {success ? (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-8" />
              </div>
              <div className="space-y-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  Password Berhasil Diperbarui!
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Password baru Anda telah aktif. Anda sedang dialihkan ke ruang kerja EcoGrant AI…
                </p>
              </div>
              <div className="pt-2">
                <Loader2 className="mx-auto size-5 animate-spin text-primary" />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                  <KeyRound className="size-6" />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  Buat Password Baru
                </h1>
                <p className="text-xs text-muted-foreground">
                  Masukkan password baru yang hendak Anda gunakan untuk masuk ke akun Anda.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-xs font-medium">
                    Password Baru
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-9 pr-10 h-11 text-sm"
                      required
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showNewPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs font-medium">
                    Konfirmasi Password Baru
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Ulangi password baru Anda"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 pr-10 h-11 text-sm"
                      required
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Simpan Password Baru
                </Button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
