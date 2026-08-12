import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profil Pengguna — EcoGrant AI" },
      { name: "description", content: "Kelola identitas, organisasi, dan informasi kontak pengelola proposal hibah." },
      { property: "og:title", content: "Profil Pengguna — EcoGrant AI" },
      { property: "og:description", content: "Perbarui data profil dan organisasi Anda di EcoGrant AI." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
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
        organization_name: profile.organization_name ?? "",
        position: profile.position ?? "",
        phone: profile.phone ?? "",
        bio: profile.bio ?? "",
        avatar_url: profile.avatar_url ?? "",
      });
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error("Profil gagal disimpan.");
      return;
    }
    await logAudit({ action: "profile.update", entityType: "profile", entityId: user.id, newValues: form });
    await refreshProfile();
    toast.success("Profil berhasil diperbarui.");
  }

  const initials = (form.full_name || "P")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profil" description="Informasi ini digunakan pada dokumen proposal yang Anda hasilkan." />

      <form onSubmit={handleSave} className="surface-panel space-y-5 p-6">
        <div className="flex items-center gap-4">
          {form.avatar_url ? (
            <img src={form.avatar_url} alt="Foto profil" className="size-16 rounded-full object-cover" />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {initials}
            </span>
          )}
          <div className="flex-1 space-y-2">
            <Label htmlFor="avatar">Tautan Foto Profil</Label>
            <Input
              id="avatar"
              placeholder="https://…"
              value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nama Lengkap</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org">Organisasi</Label>
            <Input id="org" value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Jabatan</Label>
            <Input id="position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telepon</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Deskripsi Singkat</Label>
          <Textarea id="bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>

        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Simpan Perubahan
        </Button>
      </form>
    </div>
  );
}