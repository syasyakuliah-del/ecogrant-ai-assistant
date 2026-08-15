import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Save, Upload, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profil Pengguna — EcoGrant AI" },
      {
        name: "description",
        content: "Kelola identitas, organisasi, jabatan, dan bio pengelola proposal hibah.",
      },
    ],
  }),
  component: ProfilePage,
});

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    organization_name: "",
    position: "",
    phone: "",
    bio: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        email: profile.email ?? user?.email ?? "",
        organization_name: profile.organization_name ?? "",
        position: profile.position ?? "",
        phone: profile.phone ?? "",
        bio: profile.bio ?? "",
        avatar_url: profile.avatar_url ?? "",
      });
    }
  }, [profile, user]);

  // P1 Fix #5: explicit MIME allowlist (accept attribute alone is not enough)
  const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error('Format gambar tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran maksimal foto adalah 2 MB.");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
         throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // P1 Fix #3: use functional update to avoid stale closure
      setForm(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Foto berhasil diunggah!");
    } catch (error: any) {
      console.error("[Profile] Avatar upload failed:", error);
      toast.error(
        "Gagal mengunggah foto. Pastikan Anda memiliki bucket 'avatars' di Supabase Storage."
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name.trim()) {
      toast.error("Nama lengkap wajib diisi.");
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        organization_name: form.organization_name.trim() || null,
        position: form.position.trim() || null,
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
      })
      .eq("id", user.id);

    setBusy(false);
    if (error) {
      toast.error("Profil gagal disimpan: " + error.message);
      return;
    }

    await logAudit({
      action: "profile.update",
      entityType: "profile",
      entityId: user.id,
      newValues: form,
    });
    await refreshProfile();
    toast.success("Profil berhasil diperbarui.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Profil Pengguna"
        description="Informasi profil ini digunakan secara otomatis pada header dan lembar pengesahan proposal."
      />

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Identitas & Diri</CardTitle>
            <CardDescription>Perbarui foto profil, jabatan, dan bio singkat Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4 border-b pb-6">
              <Avatar className="size-20 border-2 border-primary/20">
                <AvatarImage src={form.avatar_url ?? undefined} />
                <AvatarFallback className="text-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                  {initials(form.full_name || "User")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1.5 w-full">
                <Label htmlFor="avatar">Tautan Foto Avatar (URL)</Label>
                <div className="flex gap-2">
                  <Input
                    id="avatar"
                    placeholder="https://images.unsplash.com/…"
                    value={form.avatar_url}
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    <span className="sr-only sm:not-sr-only sm:ml-2">Unggah</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Masukkan URL gambar, gunakan Gravatar, atau klik unggah (Maks 2MB).
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Alamat Email</Label>
                <Input id="email" disabled value={form.email} className="bg-muted" />
                <p className="text-[10px] text-muted-foreground">
                  Email utama akun tidak dapat diubah di sini.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Nomor Telepon / WhatsApp</Label>
                <Input
                  id="phone"
                  placeholder="08xxxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="position">Jabatan / Peran</Label>
                <Input
                  id="position"
                  placeholder="Direktur Eksekutif / Manager Program"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="organization_name">Nama Organisasi / Yayasan</Label>
                <Input
                  id="organization_name"
                  placeholder="Contoh: Yayasan Konservasi Borneo"
                  value={form.organization_name}
                  onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bio">Bio Singkat Pengelola Program</Label>
                <Textarea
                  id="bio"
                  rows={3}
                  placeholder="Tuliskan pengalaman atau latar belakang singkat Anda…"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={busy}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="size-4" /> {busy ? "Menyimpan…" : "Simpan Perubahan Profil"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
