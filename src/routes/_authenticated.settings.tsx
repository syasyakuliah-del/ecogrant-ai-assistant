import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bell, Clock, Globe, KeyRound, Lock, LogOut, Moon,
  Shield, ShieldAlert, Sun, UserX, Check,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan Akun & Keamanan — EcoGrant AI" },
      { name: "description", content: "Ubah kata sandi, kelola sesi aktif, preferensi notifikasi, dan tampilan." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  // Password State
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busyPw, setBusyPw] = useState(false);

  // Preferences State
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [timeZone, setTimeZone] = useState("WIB");
  const [emailNotif, setEmailNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);

  // Active Sessions / Login Histories
  const { data: history = [] } = useQuery({
    queryKey: ["login-histories-me", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("login_histories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data ?? [];
    },
  });

  function validatePassword(v: string) {
    if (v.length < 10) return "Kata sandi minimal 10 karakter.";
    if (!/[A-Z]/.test(v)) return "Kata sandi harus mengandung minimal 1 huruf besar (A-Z).";
    if (!/[a-z]/.test(v)) return "Kata sandi harus mengandung minimal 1 huruf kecil (a-z).";
    if (!/[0-9]/.test(v)) return "Kata sandi harus mengandung minimal 1 angka (0-9).";
    if (!/[^A-Za-z0-9]/.test(v)) return "Kata sandi harus mengandung minimal 1 karakter khusus (!@#$%^&*).";
    return null;
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const err = validatePassword(pw);
    if (err) { toast.error(err); return; }
    if (pw !== pw2) { toast.error("Konfirmasi kata sandi tidak cocok."); return; }

    setBusyPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusyPw(false);

    if (error) { toast.error("Kata sandi gagal diubah: " + error.message); return; }

    await logAudit({ action: "auth.password.reset", entityType: "auth", entityId: user?.id });
    setPw("");
    setPw2("");
    toast.success("Kata sandi berhasil diperbarui!");
  }

  async function revokeAllSessions() {
    if (!window.confirm("Keluar dari seluruh sesi perangkat aktif lainnya?")) return;
    await logAudit({ action: "auth.sessions.revoke", entityType: "session", entityId: user?.id });
    await signOut();
    void navigate({ to: "/auth", replace: true });
    toast.success("Seluruh sesi telah dicabut. Silakan login kembali.");
  }

  async function deactivateAccount() {
    if (!user) return;
    if (!window.confirm("Apakah Anda yakin ingin menonaktifkan akun ini? Akses Anda ke ruang kerja akan dibekukan.")) return;
    await supabase.from("profiles").update({ status: "nonaktif" }).eq("id", user.id);
    await logAudit({ action: "account.deactivate", entityType: "profile", entityId: user.id });
    await signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Pengaturan Akun & Keamanan" description="Keamanan password, manajemen sesi aktif, preferensi tampilan, dan waktu." />

      {/* 1. Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Lock className="size-4 text-emerald-600" /> Ubah Kata Sandi (Password)</CardTitle>
          <CardDescription>Kata sandi wajib memenuhi standar keamanan minimal 10 karakter dengan kombinasi huruf besar, kecil, angka, dan simbol.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pw">Kata Sandi Baru</Label>
                <Input id="pw" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">Konfirmasi Kata Sandi Baru</Label>
                <Input id="pw2" type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••••••" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={busyPw || !pw} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {busyPw ? "Memperbarui Password…" : "Perbarui Kata Sandi"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. Session Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Shield className="size-4 text-emerald-600" /> Manajemen Sesi & Riwayat Masuk</CardTitle>
            <CardDescription>Tinjau perangkat yang terhubung dan riwayat aktivitas masuk ke akun Anda.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void revokeAllSessions()} className="gap-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950 border-red-200">
            <LogOut className="size-3.5" /> Keluar Semua Sesi
          </Button>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Belum ada riwayat sesi tercatat.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu Sesi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Perangkat / User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs font-mono">{formatDateTime(h.created_at)}</TableCell>
                    <TableCell><Badge variant={h.status === "berhasil" ? "default" : "destructive"} className="text-[10px]">{h.status}</Badge></TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{h.ip_address ?? "127.0.0.1"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-48 truncate">{h.user_agent ?? "Browser"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 3. Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sun className="size-4 text-emerald-600" /> Preferensi Tampilan, Waktu & Notifikasi</CardTitle>
          <CardDescription>Atur mode tema, zona waktu, format tanggal, dan saluran notifikasi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Dark Mode */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="font-semibold text-sm">Mode Tampilan</Label>
                <p className="text-xs text-muted-foreground">Saat ini menggunakan mode {theme === "dark" ? "gelap (dark)" : "terang (light)"}.</p>
              </div>
              <Button variant="outline" size="sm" onClick={toggle} className="gap-2">
                {theme === "dark" ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4 text-slate-700" />}
                {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
              </Button>
            </div>

            {/* Language (Locked) */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-semibold text-sm">Bahasa Aplikasi</Label>
                <p className="text-xs text-muted-foreground">Bahasa dikunci ke Bahasa Indonesia (ID) untuk versi MVP.</p>
              </div>
              <Badge variant="secondary" className="gap-1"><Globe className="size-3" /> Indonesia (ID)</Badge>
            </div>

            {/* Date Format */}
            <div className="space-y-1.5">
              <Label>Format Tanggal</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (Contoh: 31/12/2026)</SelectItem>
                  <SelectItem value="DD MMMM YYYY">DD MMMM YYYY (Contoh: 31 Desember 2026)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (Contoh: 2026-12-31)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <Label>Zona Waktu Platform</Label>
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WIB">WIB — Waktu Indonesia Barat (UTC+7)</SelectItem>
                  <SelectItem value="WITA">WITA — Waktu Indonesia Tengah (UTC+8)</SelectItem>
                  <SelectItem value="WIT">WIT — Waktu Indonesia Timur (UTC+9)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notification Preferences */}
            <div className="flex items-center justify-between p-3 border rounded-lg sm:col-span-2">
              <div className="space-y-0.5">
                <Label className="font-semibold text-sm">Notifikasi Email</Label>
                <p className="text-xs text-muted-foreground">Kirim ringkasan notifikasi penting ke email terdaftar Anda.</p>
              </div>
              <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg sm:col-span-2">
              <div className="space-y-0.5">
                <Label className="font-semibold text-sm">Notifikasi In-App Real-time</Label>
                <p className="text-xs text-muted-foreground">Tampilkan pop-up pemberitahuan saat aplikasi terbuka.</p>
              </div>
              <Switch checked={inAppNotif} onCheckedChange={setInAppNotif} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Danger Zone */}
      <Card className="border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20">
        <CardHeader>
          <CardTitle className="text-base text-red-600 dark:text-red-400 flex items-center gap-2">
            <UserX className="size-4" /> Nonaktifkan Akun
          </CardTitle>
          <CardDescription>Akun akan ditandai nonaktif dan seluruh sesi akan diakhiri. Hubungi administrator untuk mengaktifkan kembali.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => void deactivateAccount()}>
            Nonaktifkan Akun Sekarang
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}