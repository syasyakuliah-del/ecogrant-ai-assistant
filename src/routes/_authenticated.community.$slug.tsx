import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/community/$slug")({
  head: () => ({
    meta: [
      { title: "Artikel Community — EcoGrant AI" },
      { name: "description", content: "Bacaan komunitas mengenai penyusunan proposal hibah lingkungan dan kehutanan." },
      { property: "og:title", content: "Artikel Community — EcoGrant AI" },
      { property: "og:description", content: "Diskusi dan praktik baik dari komunitas EcoGrant AI." },
    ],
  }),
  component: PostDetail,
});

function PostDetail() {
  const { slug } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: post, isLoading } = useQuery({
    queryKey: ["community-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("community_posts").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["community-comments", post?.id],
    enabled: !!post?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", post!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = [...new Set(data.map((c) => c.user_id))];
      const { data: people } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as Array<{ id: string; full_name: string }> };
      const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
      return data.map((c) => ({ ...c, author_name: names.get(c.user_id) ?? "Pengguna" }));
    },
  });

  async function addComment() {
    if (!user || !post || !comment.trim()) return;
    const { error } = await supabase
      .from("community_comments")
      .insert({ post_id: post.id, user_id: user.id, content: comment.trim() });
    if (error) {
      toast.error("Komentar gagal dikirim.");
      return;
    }
    setComment("");
    void qc.invalidateQueries({ queryKey: ["community-comments", post.id] });
  }

  async function removeComment(id: string) {
    await supabase.from("community_comments").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: ["community-comments", post?.id] });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat artikel…</p>;
  if (!post) return <p className="text-sm text-muted-foreground">Artikel tidak ditemukan.</p>;

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/community" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Kembali ke Community
      </Link>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{post.category}</Badge>
        <span className="text-xs text-muted-foreground">{formatDateTime(post.published_at ?? post.created_at)}</span>
      </div>
      <h1 className="font-display text-2xl font-semibold">{post.title}</h1>
      <p className="mt-4 text-sm leading-relaxed whitespace-pre-line">{post.content}</p>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Komentar ({comments.length})</h2>
        <div className="mt-4 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="surface-panel flex items-start justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold">{c.author_name}</p>
                <p className="text-sm text-muted-foreground">{c.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(c.created_at)}</p>
              </div>
              {isAdmin || c.user_id === user?.id ? (
                <Button variant="ghost" size="icon" onClick={() => void removeComment(c.id)} aria-label="Hapus komentar">
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tulis tanggapan Anda"
            aria-label="Tulis komentar"
          />
          <Button onClick={() => void addComment()} disabled={!comment.trim()}>
            Kirim Komentar
          </Button>
        </div>
      </section>
    </article>
  );
}