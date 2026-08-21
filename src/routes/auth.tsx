import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf, Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, KeyRound, UserPlus, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type AuthView = "login" | "register" | "forgot-password" | "forgot-success";

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const { user, loading, isAdmin } = useAuth();
  
  const [view, setView] = useState<AuthView>("login");
  const [busy, setBusy] = useState(false);

  // Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [sentForgotEmail, setSentForgotEmail] = useState("");

  useEffect(() => {
    if (!loading && user) {
      const redirectTarget =
        search.redirect &&
        search.redirect !== "/dashboard" &&
        search.redirect !== "/" &&
        search.redirect !== "/auth"
          ? search.redirect
          : isAdmin
          ? "/admin"
          : "/dashboard";
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

  // Google OAuth Login
  async function handleGoogleLogin() {
    setBusy(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/dashboard`,
      },
    });

    if (error) {
      setBusy(false);
      toast.error(error.message || "Gagal masuk dengan Google.");
    }
  }

  // Email & Password Login
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Alamat email dan password wajib diisi.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    setBusy(false);
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Email atau password yang Anda masukkan salah.");
      } else {
        toast.error(error.message || "Gagal masuk. Silakan coba lagi.");
      }
    } else {
      toast.success("Berhasil masuk! Mengalihkan…");
    }
  }

  // Register New Account
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!regEmail.trim()) {
      toast.error("Alamat email wajib diisi.");
      return;
    }
    if (!regPassword) {
      toast.error("Password wajib diisi.");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Password minimal terdiri dari 6 karakter.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast.error("Konfirmasi password tidak cocok dengan password yang dibuat.");
      return;
    }

    setBusy(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { data, error } = await supabase.auth.signUp({
      email: regEmail.trim(),
      password: regPassword,
      options: {
        emailRedirectTo: `${origin}/dashboard`,
      },
    });

    setBusy(false);
    if (error) {
      toast.error(error.message || "Pendaftaran gagal. Silakan coba lagi.");
      return;
    }

    if (data.user && data.session) {
      toast.success("Akun baru berhasil dibuat! Selamat datang di EcoGrant AI.");
    } else {
      toast.success("Akun berhasil dibuat! Silakan periksa email Anda untuk verifikasi pendaftaran.", {
        duration: 6000,
      });
      setView("login");
      setLoginEmail(regEmail);
    }
  }

  // Forgot Password Notification
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      toast.error("Silakan masukkan alamat email yang terdaftar.");
      return;
    }

    setBusy(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${origin}/reset-password`,
    });

    setBusy(false);
    if (error) {
      toast.error(error.message || "Gagal mengirimkan notifikasi verifikasi reset password.");
    } else {
      setSentForgotEmail(forgotEmail.trim());
      setView("forgot-success");
      toast.success("Notifikasi verifikasi reset password telah dikirim ke email Anda.");
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
            Menerjemahkan ide lapangan menjadi proposal hibah yang siap diajukan.
          </h2>
          <p className="text-sm leading-relaxed opacity-80">
            Narasi formal, Logical Framework Matrix, validasi Standar Biaya Masukan dan Standar
            Biaya Umum, serta Rencana Anggaran Biaya terintegrasi dalam satu sumber data.
          </p>
          <ul className="space-y-2 text-sm opacity-80">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Wizard sepuluh langkah dengan penyimpanan otomatis
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Pencocokan lembaga donor beserta skor kesesuaian
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Ekspor dokumen PDF, DOCX, dan XLSX
            </li>
          </ul>
        </div>
        <p className="text-xs opacity-60">Versi 1.0 — Bahasa Indonesia formal</p>
      </section>

      {/* Right Form Content */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo Header */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img
              src="/logoecograntai.png"
              alt="Logo EcoGrant AI"
              className="h-10 w-auto object-contain rounded-xl"
            />
            <span className="font-display text-lg font-semibold">EcoGrant AI</span>
          </div>

          {/* VIEW: FORGOT PASSWORD */}
          {view === "forgot-password" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <button
                type="button"
                onClick={() => setView("login")}
                className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Kembali ke Halaman Masuk
              </button>

              <div className="space-y-2">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                  <KeyRound className="size-6" />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  Lupa Password?
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Masukkan alamat email yang telah Anda daftarkan. Sistem akan mengirimkan notifikasi verifikasi dan instruksi pembaruan password ke alamat email tersebut.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-xs font-medium">
                    Alamat Email Terdaftar
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="nama@organisasi.or.id"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-9 h-11 text-sm"
                      required
                      disabled={busy}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Mengirimkan Notifikasi Verifikasi…
                    </>
                  ) : (
                    "Kirim Notifikasi Verifikasi"
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* VIEW: FORGOT PASSWORD SUCCESS */}
          {view === "forgot-success" && (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-8" />
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  Notifikasi Terkirim!
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Sistem telah mengirimkan notifikasi verifikasi ke alamat email{" "}
                  <strong className="font-medium text-foreground">{sentForgotEmail}</strong>.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-4 text-left text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Langkah Selanjutnya:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Buka kotak masuk (inbox) atau folder spam email Anda.</li>
                  <li>Klik tautan verifikasi reset password yang ada dalam pesan.</li>
                  <li>Buat password baru untuk mengakses kembali akun Anda.</li>
                </ol>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 text-sm"
                onClick={() => setView("login")}
              >
                Kembali ke Halaman Masuk
              </Button>
            </div>
          )}

          {/* VIEW: LOGIN & REGISTER TABS */}
          {(view === "login" || view === "register") && (
            <div className="space-y-6">
              <Tabs
                value={view}
                onValueChange={(v) => setView(v as "login" | "register")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/60">
                  <TabsTrigger value="login" className="text-xs font-semibold flex items-center gap-1.5">
                    <LogIn className="size-3.5" />
                    Masuk
                  </TabsTrigger>
                  <TabsTrigger value="register" className="text-xs font-semibold flex items-center gap-1.5">
                    <UserPlus className="size-3.5" />
                    Buat Akun Baru
                  </TabsTrigger>
                </TabsList>

                {/* TAB: LOGIN */}
                <TabsContent value="login" className="space-y-5 pt-4">
                  <div className="space-y-1">
                    <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                      Masuk ke EcoGrant AI
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Masukkan alamat email dan password terdaftar Anda.
                    </p>
                  </div>

                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-xs font-medium">
                        Alamat Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="nama@organisasi.or.id"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-9 h-11 text-sm"
                          required
                          disabled={busy}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password" className="text-xs font-medium">
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(loginEmail);
                            setView("forgot-password");
                          }}
                          className="text-xs text-primary font-medium hover:underline focus:outline-none"
                        >
                          Lupa password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-9 pr-10 h-11 text-sm"
                          required
                          disabled={busy}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showLoginPassword ? "Sembunyikan password" : "Tampilkan password"}
                        >
                          {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={busy}>
                      {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Masuk
                    </Button>
                  </form>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-3 text-muted-foreground font-mono text-[10px]">
                        Atau
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="w-full h-11 text-sm"
                    variant="outline"
                    onClick={handleGoogleLogin}
                    disabled={busy}
                    aria-label="Lanjutkan dengan akun Google"
                  >
                    {busy ? (
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <svg className="mr-2 size-5" viewBox="0 0 24 24" aria-hidden="true">
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
                </TabsContent>

                {/* TAB: REGISTER */}
                <TabsContent value="register" className="space-y-5 pt-4">
                  <div className="space-y-1">
                    <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                      Buat Akun Baru
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Isi alamat email dan buat password untuk pendaftaran akun EcoGrant AI.
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-xs font-medium">
                        Alamat Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="nama@organisasi.or.id"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="pl-9 h-11 text-sm"
                          required
                          disabled={busy}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-xs font-medium">
                        Password Baru
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="reg-password"
                          type={showRegPassword ? "text" : "password"}
                          placeholder="Minimal 6 karakter"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="pl-9 pr-10 h-11 text-sm"
                          required
                          disabled={busy}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showRegPassword ? "Sembunyikan password" : "Tampilkan password"}
                        >
                          {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm-password" className="text-xs font-medium">
                        Konfirmasi Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="reg-confirm-password"
                          type={showRegConfirmPassword ? "text" : "password"}
                          placeholder="Ulangi password baru Anda"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="pl-9 pr-10 h-11 text-sm"
                          required
                          disabled={busy}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showRegConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                        >
                          {showRegConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={busy}>
                      {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Daftarkan Akun
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

