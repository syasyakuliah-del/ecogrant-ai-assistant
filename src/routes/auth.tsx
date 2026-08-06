import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search['redirect'] === "string" ? (search['redirect'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Masuk atau Daftar — EcoGrant AI" },
      {
        name: "description",
        content: "Halaman autentikasi EcoGrant AI untuk pengelola program hibah kehutanan dan lingkungan.",
      },
      { property: "og:title", content: "Masuk atau Daftar — EcoGrant AI" },
      { property: "og:description", content: "Akses ruang kerja penyusunan proposal hibah EcoGrant AI." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regOrg, setRegOrg] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: search.redirect ?? "/dashboard", replace: true });
    }
  }, [user, loading, navigate, search.redirect]);

  function validatePassword(pw: string) {
    if (pw.length < 10) return "Kata sandi minimal 10 karakter.";
    if (!/[A-Z]/.test(pw)) return "Kata sandi harus mengandung huruf besar.";
    if (!/[a-z]/.test(pw)) return "Kata sandi harus mengandung huruf kecil.";
    if (!/[0-9]/.test(pw)) return "Kata sandi harus mengandung angka.";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Kata sandi harus mengandung karakter khusus.";
    return null;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setBusy(false);
    if (error) {
      toast.error("Email atau kata sandi tidak sesuai.");
      return;
    }
    await logAudit({ action: "login.success", entityType: "auth" });
    toast.success("Berhasil masuk.");
    void navigate({ to: search.redirect ?? "/dashboard", replace: true });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const pwError = validatePassword(regPassword);
    if (pwError) {
      toast.error(pwError);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: regEmail.trim(),
      password: regPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: regName.trim(), organization_name: regOrg.trim() },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Email sudah terdaftar. Silakan masuk."
          : "Pendaftaran gagal. Periksa kembali data yang diisi.",
      );
      return;
    }
    toast.success("Akun berhasil dibuat. Silakan lanjutkan ke ruang kerja.");
  }

  async function handleReset() {
    if (!loginEmail.trim()) {
      toast.error("Masukkan email terlebih dahulu.");
      return;
    }
    await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    toast.success("Jika email terdaftar, tautan pengaturan ulang kata sandi telah dikirim.");
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
            Narasi formal, Logical Framework Matrix, validasi Standar Biaya Masukan dan Standar Biaya Umum, serta
            Rencana Anggaran Biaya terintegrasi dalam satu sumber data.
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

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="register">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@organisasi.or.id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Kata Sandi</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Masuk
                </Button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Lupa kata sandi
                </button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Nama Lengkap</Label>
                  <Input id="reg-name" required value={regName} onChange={(e) => setRegName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-org">Organisasi</Label>
                  <Input id="reg-org" required value={regOrg} onChange={(e) => setRegOrg(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Kata Sandi</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimal 10 karakter, mengandung huruf besar, huruf kecil, angka, dan karakter khusus.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Buat Akun
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}