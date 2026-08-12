import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/community/")({
  head: () => ({
    meta: [
      { title: "Community — EcoGrant AI" },
      { name: "description", content: "Artikel, praktik baik, dan diskusi antar pengelola program hibah lingkungan." },
      { property: "og:title", content: "Community — EcoGrant AI" },
      { property: "og:description", content: "Berbagi pengalaman menyusun proposal hibah bersama komunitas EcoGrant AI." },
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

function CommunityPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "Umum", excerpt: "", content: "" });
  const [busy, setBusy] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const term = q.trim().toLowerCase();
  const rows = term
    ? data.filter((p) => [p.title, p.excerpt, p.category].some((f) => (f ?? "").toLowerCase().includes(term)))
    : data;

  async function submit() {
    if (!user) return;
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Judul dan isi artikel wajib diisi.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("community_posts").insert({
      author_id: user.id,
      title: form.title.trim(),
      slug: `${slugify(form.title)}-${Date.now().toString(36)}`,
      category: form.category,
      excerpt: form.excerpt.trim() || form.content.trim().slice(0, 140),
      content: form.content.trim(),
      status: isAdmin ? "terbit" : "menunggu",
    });
    setBusy(false);
    if (error) {
      toast.error("Artikel gagal disimpan.");
      return;
    }
    await logAudit({ action: "community.create", entityType: "community_post" });
    setOpen(false);
    setForm({ title: "", category: "Umum", excerpt: "", content: "" });
    void qc.invalidateQueries({ queryKey: ["community-posts"] });
    toast.success(isAdmin ? "Artikel diterbitkan." : "Artikel dikirim dan menunggu moderasi administrator.");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Community"
        description="Praktik baik dan pembelajaran dari sesama pengelola program."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Tulis Artikel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tulis Artikel Community</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="c-title">Judul</Label>
                  <Input id="c-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-cat">Kategori</Label>
                  <Input id="c-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-exc">Ringkasan</Label>
                  <Input id="c-exc" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-con">Isi Artikel</Label>
                  <Textarea id="c-con" rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => void submit()} disabled={busy}>
                  Kirim Artikel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative mb-5">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari artikel" className="pl-9" aria-label="Cari artikel community" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat artikel…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Belum ada artikel" description="Jadilah yang pertama membagikan pengalaman menyusun proposal hibah." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((p) => (
            <Link
              key={p.id}
              to="/community/$slug"
              params={{ slug: p.slug }}
              className="surface-panel block p-5 transition-colors hover:border-primary/50"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{p.category}</Badge>
                {p.status !== "terbit" ? <Badge variant="outline">{p.status}</Badge> : null}
                <span className="text-xs text-muted-foreground">{formatDate(p.published_at ?? p.created_at)}</span>
              </div>
              <p className="font-display text-base font-semibold">{p.title}</p>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}