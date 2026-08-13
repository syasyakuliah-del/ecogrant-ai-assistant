import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, MessageSquare, Send, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notify, logAudit } from "@/lib/audit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/community/$slug")({
  head: () => ({
    meta: [
      { title: "Artikel Community — EcoGrant AI" },
      {
        name: "description",
        content: "Bacaan komunitas mengenai penyusunan proposal hibah lingkungan dan kehutanan.",
      },
    ],
  }),
  component: PostDetail,
});

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function PostDetail() {
  const { slug } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ["community-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      let author = null;
      if (data.author_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, organization_name")
          .eq("id", data.author_id)
          .maybeSingle();
        author = prof;
      }
      return { ...data, author };
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
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
        : { data: [] };
      const peopleMap = new Map((people ?? []).map((p) => [p.id, p]));
      return data.map((c) => ({
        ...c,
        author: peopleMap.get(c.user_id),
      }));
    },
  });

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !post || !commentText.trim()) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("community_comments").insert({
      post_id: post.id,
      user_id: user.id,
      content: commentText.trim(),
      status: "tampil",
    });
    setIsSubmitting(false);

    if (error) {
      toast.error("Komentar gagal dikirim: " + error.message);
      return;
    }

    setCommentText("");
    void qc.invalidateQueries({ queryKey: ["community-comments", post.id] });
    toast.success("Komentar terpublikasi.");

    // Notify post author
    if (post.author_id && post.author_id !== user.id) {
      await notify({
        userId: post.author_id,
        type: "comment",
        title: "Komentar Baru pada Artikel Anda",
        message: `Pengguna memberikan komentar pada artikel "${post.title}".`,
        actionUrl: `/community/${post.slug}`,
      });
    }
  }

  async function toggleModeration(commentId: string, currentStatus: string) {
    const nextStatus = currentStatus === "tampil" ? "disembunyikan" : "tampil";
    const { error } = await supabase
      .from("community_comments")
      .update({ status: nextStatus } as never)
      .eq("id", commentId);
    if (error) {
      toast.error("Gagal memoderasi komentar.");
      return;
    }
    await logAudit({
      action: "community.comment.moderate",
      entityType: "community_comment",
      entityId: commentId,
      newValues: { status: nextStatus },
    });
    void qc.invalidateQueries({ queryKey: ["community-comments", post?.id] });
    toast.success(`Komentar ${nextStatus}.`);
  }

  async function removeComment(commentId: string) {
    if (!window.confirm("Hapus komentar ini secara permanen?")) return;
    await supabase.from("community_comments").delete().eq("id", commentId);
    await logAudit({
      action: "community.comment.delete",
      entityType: "community_comment",
      entityId: commentId,
    });
    void qc.invalidateQueries({ queryKey: ["community-comments", post?.id] });
    toast.success("Komentar dihapus.");
  }

  if (isLoading)
    return <p className="py-12 text-center text-sm text-muted-foreground">Memuat artikel…</p>;
  if (!post)
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">Artikel tidak ditemukan.</p>
    );

  const visibleComments = comments.filter(
    (c) => isAdmin || c.status === "tampil" || c.user_id === user?.id,
  );

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/community"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" /> Kembali ke Community
      </Link>

      <div className="surface-panel p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={post.author?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
                {initials(post.author?.full_name || "Penulis")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">
                {post.author?.full_name || "Penulis Komunitas"}
              </p>
              <p className="text-xs text-muted-foreground">
                {post.author?.organization_name || "Pengelola Program"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{post.category}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(post.published_at ?? post.created_at)}
            </span>
          </div>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight">{post.title}</h1>

        <div className="prose dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed whitespace-pre-line text-foreground/90">
          {post.content}
        </div>
      </div>

      {/* Comments Section */}
      <section className="surface-panel p-6 space-y-6">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="size-5 text-emerald-600" />
          Komentar & Diskusi ({visibleComments.length})
        </h3>

        {/* Add comment form */}
        <form onSubmit={addComment} className="space-y-3">
          <Textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Tuliskan komentar atau masukan Anda..."
            className="text-sm"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="size-3.5" /> {isSubmitting ? "Mengirim…" : "Kirim Komentar"}
            </Button>
          </div>
        </form>

        {/* Comment list */}
        <div className="space-y-4 pt-2">
          {visibleComments.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Belum ada komentar. Jadi yang pertama berkomentar!
            </p>
          ) : (
            visibleComments.map((c) => (
              <div
                key={c.id}
                className={`p-4 rounded-xl border transition-colors ${c.status === "disembunyikan" ? "bg-amber-500/5 border-amber-500/20" : "bg-card"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-7">
                      <AvatarImage src={c.author?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px] bg-slate-100 text-slate-700">
                        {initials(c.author?.full_name || "User")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-semibold text-xs text-foreground">
                        {c.author?.full_name || "Pengguna"}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-2">
                        {formatDateTime(c.created_at)}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title={
                          c.status === "tampil" ? "Sembunyikan komentar" : "Tampilkan komentar"
                        }
                        onClick={() => void toggleModeration(c.id, c.status)}
                      >
                        {c.status === "tampil" ? (
                          <EyeOff className="size-3.5 text-amber-600" />
                        ) : (
                          <Eye className="size-3.5 text-emerald-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Hapus komentar"
                        onClick={() => void removeComment(c.id)}
                      >
                        <Trash2 className="size-3.5 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-foreground/90 leading-normal pl-9">{c.content}</p>
                {c.status === "disembunyikan" && (
                  <Badge
                    variant="outline"
                    className="mt-2 ml-9 text-[10px] border-amber-400 text-amber-600"
                  >
                    Disembunyikan Moderator
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </article>
  );
}
