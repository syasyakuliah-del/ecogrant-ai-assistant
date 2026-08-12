import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Calendar, Eye, FileText, Globe, Image as ImageIcon,
  Plus, Search, ShieldAlert, Sparkles, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/community/")({
  head: () => ({
    meta: [
      { title: "Community & Praktik Baik — EcoGrant AI" },
      { name: "description", content: "Artikel, pengetahuan, dan ruang diskusi antarpengelola program hibah." },
    ],
  }),
  component: CommunityPage,
});

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "artikel"
  );
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function CommunityPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState("terbit");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "Praktik Baik",
    excerpt: "",
    content: "",
    featured_image: "",
    status: "terbit",
  });
  const [busy, setBusy] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["community-posts-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("community_posts").select("*").order("published_at", { ascending: false }).limit(200);
      if (error) throw error;
      const authorIds = [...new Set((data ?? []).map((p) => p.author_id).filter(Boolean))] as string[];
      const { data: authors } = authorIds.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url, organization_name").in("id", authorIds)
        : { data: [] };
      const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));
      return (data ?? []).map((p) => ({
        ...p,
        author: p.author_id ? authorMap.get(p.author_id) : null,
      }));
    },
  });

  const term = q.trim().toLowerCase();
  const filtered = posts.filter((p) => {
    if (activeTab !== "semua" && p.status !== activeTab) return false;
    if (!term) return true;
    return [p.title, p.excerpt, p.category, p.author?.full_name].some((f) => (f ?? "").toLowerCase().includes(term));
  });

  async function submit() {
    if (!user) return;
    if (!form.title.trim() || !form.content.trim()) { toast.error("Judul dan isi artikel wajib diisi."); return; }

    setBusy(true);
    const slug = `${slugify(form.title)}-${Date.now().toString(36)}`;
    const { error } = await supabase.from("community_posts").insert({
      author_id: user.id,
      title: form.title.trim(),
      slug,
      category: form.category,
      excerpt: form.excerpt.trim() || form.content.trim().slice(0, 140),
      content: form.content.trim(),
      status: isAdmin ? form.status : "draft",
      published_at: new Date().toISOString(),
    });

    setBusy(false);
    if (error) { toast.error("Artikel gagal disimpan: " + error.message); return; }

    await logAudit({ action: "community.post.create", entityType: "community_post" });
    setOpen(false);
    setForm({ title: "", category: "Praktik Baik", excerpt: "", content: "", featured_image: "", status: "terbit" });
    void qc.invalidateQueries({ queryKey: ["community-posts-all"] });
    toast.success(isAdmin ? "Artikel berhasil diterbitkan!" : "Artikel tersimpan sebagai Draft dan menunggu moderasi.");
  }

  async function updateStatus(id: string, nextStatus: string) {
    const { error } = await supabase.from("community_posts").update({ status: nextStatus } as never).eq("id", id);
    if (error) { toast.error("Gagal mengubah status artikel."); return; }
    await logAudit({ action: "community.post.status", entityType: "community_post", entityId: id, newValues: { status: nextStatus } });
    void qc.invalidateQueries({ queryKey: ["community-posts-all"] });
    toast.success(`Status artikel diubah menjadi ${nextStatus}.`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Community & Knowledge Hub"
        description="Ruang berbagi pengalaman, praktik baik, dan tips sukses pengajuan hibah lingkungan."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="size-4" /> Tulis Artikel</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tulis Artikel Community Baru</DialogTitle>
                <DialogDescription>Bagikan praktik baik, panduan, atau cerita sukses program organisasi Anda.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label>Judul Artikel <span className="text-red-500">*</span></Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Strategi Efektif Menyusun LFA untuk Grant Konservasi" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Kategori</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Praktik Baik">Praktik Baik</SelectItem>
                        <SelectItem value="Panduan Proposal">Panduan Proposal</SelectItem>
                        <SelectItem value="Studi Kasus">Studi Kasus</SelectItem>
                        <SelectItem value="Info Donor">Info Donor</SelectItem>
                        <SelectItem value="Umum">Umum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isAdmin && (
                    <div className="space-y-1">
                      <Label>Status Publikasi</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="terbit">Terbit Langsung</SelectItem>
                          <SelectItem value="draft">Draft / Menunggu Moderasi</SelectItem>
                          <SelectItem value="terjadwal">Terjadwal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>URL Image Header (opsional)</Label>
                  <Input value={form.featured_image} onChange={(e) => setForm({ ...form, featured_image: e.target.value })} placeholder="https://images.unsplash.com/…" />
                </div>
                <div className="space-y-1">
                  <Label>Ringkasan Singkat (Excerpt)</Label>
                  <Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Ringkasan 1-2 kalimat tentang artikel…" />
                </div>
                <div className="space-y-1">
                  <Label>Isi Konten Artikel <span className="text-red-500">*</span></Label>
                  <Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Tuliskan isi artikel selengkapnya di sini…" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button onClick={() => void submit()} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {busy ? "Menyimpan…" : "Terbitkan Artikel"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filter Toolbar & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="terbit">Terbit</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="terjadwal">Terjadwal</TabsTrigger>
            <TabsTrigger value="semua">Semua</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul, kategori, penulis…" className="pl-9" />
        </div>
      </div>

      {/* Grid Articles */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat artikel komunitas…</div>
      ) : filtered.length === 0 ? (
        <div className="surface-panel p-12 text-center text-sm text-muted-foreground rounded-xl">
          Tidak ada artikel yang cocok dengan filter.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <Card key={post.id} className="flex flex-col justify-between hover:shadow-md transition-shadow overflow-hidden group">
              <div>
                {/* Header Badge & Category */}
                <div className="p-4 pb-2 flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                  <Badge variant={post.status === "terbit" ? "default" : "outline"} className="text-[10px] capitalize">
                    {post.status}
                  </Badge>
                </div>

                <CardHeader className="pt-0">
                  <Link to="/community/$slug" params={{ slug: post.slug }} className="hover:underline">
                    <CardTitle className="line-clamp-2 text-base group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                  </Link>
                  <CardDescription className="line-clamp-3 text-xs mt-1">
                    {post.excerpt || post.content.slice(0, 120) + "…"}
                  </CardDescription>
                </CardHeader>
              </div>

              <CardFooter className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
                <div className="flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarImage src={post.author?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700">
                      {initials(post.author?.full_name || "Admin")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-28 font-medium text-foreground">{post.author?.full_name || "Penulis"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatDate(post.published_at ?? post.created_at)}</span>
                  {isAdmin && (
                    <Select value={post.status} onValueChange={(v) => void updateStatus(post.id, v)}>
                      <SelectTrigger className="size-7 p-0 border-none bg-transparent shadow-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="terbit">Terbit</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="diarsipkan">Arsip</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}