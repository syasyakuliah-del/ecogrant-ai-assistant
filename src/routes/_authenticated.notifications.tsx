import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifikasi — EcoGrant AI" },
      { name: "description", content: "Pusat notifikasi status proposal, ulasan admin, dan pengingat tenggat donor." },
      { property: "og:title", content: "Notifikasi — EcoGrant AI" },
      { property: "og:description", content: "Pantau seluruh pemberitahuan ruang kerja proposal hibah Anda." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("semua");

  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const rows = data.filter((n) => (filter === "semua" ? true : filter === "belum" ? !n.read_at : n.type === filter));
  const unread = data.filter((n) => !n.read_at).length;

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
    void qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  }

  async function markAll() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
    void qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    toast.success("Seluruh notifikasi ditandai telah dibaca.");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Notifikasi"
        description={`${unread} notifikasi belum dibaca`}
        actions={
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua</SelectItem>
                <SelectItem value="belum">Belum dibaca</SelectItem>
                <SelectItem value="info">Informasi</SelectItem>
                <SelectItem value="status">Status Proposal</SelectItem>
                <SelectItem value="peringatan">Peringatan</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={markAll} disabled={unread === 0}>
              <CheckCheck className="size-4" /> Tandai semua
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat notifikasi…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Belum ada notifikasi" description="Notifikasi akan muncul saat ada perubahan status proposal atau informasi penting lainnya." />
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li
              key={n.id}
              className={cn(
                "surface-panel flex items-start gap-3 px-4 py-3",
                !n.read_at && "border-primary/40 bg-primary/5",
              )}
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <Badge variant="secondary">{n.type}</Badge>
                  {!n.read_at ? <Badge>Baru</Badge> : null}
                </div>
                {n.message ? <p className="mt-1 text-sm text-muted-foreground">{n.message}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {n.action_url ? (
                  <Link to={n.action_url} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                    Buka
                  </Link>
                ) : null}
                {!n.read_at ? (
                  <button onClick={() => void markRead(n.id)} className="text-xs text-muted-foreground hover:underline">
                    Tandai dibaca
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}