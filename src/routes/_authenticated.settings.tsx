import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan Akun — EcoGrant AI" },
      { name: "description", content: "Ubah kata sandi, preferensi tampilan, dan tinjau riwayat masuk akun Anda." },
      { property: "og:title", content: "Pengaturan Akun — EcoGrant AI" },
      { property: "og:description", content: "Kelola keamanan dan preferensi akun EcoGrant AI." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["login-histories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_histories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  function validatePassword(v: string) {
    if (v.length < 10) return "Kata sandi minimal 10 karakter.";
    if (!/[A-Z]/.test(v)) return "Kata sandi harus mengandung huruf besar.";
    if (!/[a-z]/.test(v)) return "Kata sandi harus mengandung huruf kecil.";
    if (!/[0-9]/.test(v)) return "Kata sandi harus mengandung angka.";
    if (!/[^A-Za-z0-9]/.test(v)) return "Kata sandi harus mengandung karakter khusus.";
    return null;
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const err = validatePassword(pw);
    if (err) {
      toast.error(err);
      return;
    }
    if (pw !== pw2) {
      toast.error("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error("Kata sandi gagal diubah.");
      return;
    }
    await logAudit({ action: "password.update", entityType: "auth" });
    setPw("");
    setPw2("");
    toast.success("Kata sandi berhasil diperbarui.");
  }

  async function deactivate() {
    if (!user) return;
    if (!window.confirm("Nonaktifkan akun ini? Anda akan keluar dari ruang kerja.")) return;
    await supabase.from("profiles").update({ status: "nonaktif" }).eq("id", user.id);
    await logAudit({ action: "account.deactivate", entityType: "profile", entityId: user.id });
    await signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Pengaturan Akun" description="Keamanan, preferensi tampilan, dan riwayat aktivitas masuk." />

      <section className="surface-panel space-y-4 p-6">
        <h2 className="font-display text-base font-semibold">Ubah Kata Sandi</h2>
        <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pw">Kata Sandi Baru</Label>
            <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">Konfirmasi Kata Sandi</Label>
            <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Minimal 10 karakter dengan huruf besar, huruf kecil, angka, dan karakter khusus.
          </p>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Perbarui Kata Sandi
            </Button>
          </div>
        </form>
      </section>

      <section className="surface-panel flex items-center justify-between p-6">
        <div>
          <h2 className="font-display text-base font-semibold">Mode Tampilan</h2>
          <p className="text-sm text-muted-foreground">Saat ini menggunakan mode {theme === "dark" ? "gelap" : "terang"}.</p>
        </div>
        <Button variant="outline" onClick={toggle}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          Ubah Mode
        </Button>
      </section>

      <section className="surface-panel space-y-3 p-6">
        <h2 className="font-display text-base font-semibold">Riwayat Masuk</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada riwayat masuk yang tercatat.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                <span className="text-muted-foreground">{formatDateTime(h.created_at)}</span>
                <span className="max-w-[60%] truncate text-xs text-muted-foreground">{h.user_agent ?? "-"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-panel space-y-3 border-destructive/40 p-6">
        <h2 className="font-display text-base font-semibold text-destructive">Nonaktifkan Akun</h2>
        <p className="text-sm text-muted-foreground">
          Akun akan ditandai nonaktif dan sesi diakhiri. Hubungi administrator untuk mengaktifkan kembali.
        </p>
        <Button variant="destructive" onClick={deactivate}>
          Nonaktifkan Akun
        </Button>
      </section>
    </div>
  );
}