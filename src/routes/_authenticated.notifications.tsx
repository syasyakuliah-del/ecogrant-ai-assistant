import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertTriangle, Bell, CheckCircle2, CheckCheck, Clock, Download,
  ExternalLink, FileCheck, FileText, Info, ShieldAlert, Upload, XCircle,
} from "lucide-react";
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
    ],
  }),
  component: NotificationsPage,
});

function getNotificationIcon(type: string) {
  switch (type) {
    case "status":
    case "proposal_approved":
      return <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    case "proposal_revision":
    case "peringatan":
      return <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />;
    case "proposal_failed":
    case "import_failed":
    case "export_failed":
    case "account_locked":
      return <XCircle className="size-5 text-red-600 dark:text-red-400 shrink-0" />;
    case "import_success":
      return <Upload className="size-5 text-cyan-600 dark:text-cyan-400 shrink-0" />;
    case "export_success":
      return <Download className="size-5 text-indigo-600 dark:text-indigo-400 shrink-0" />;
    case "donor_deadline":
      return <Clock className="size-5 text-rose-600 dark:text-rose-400 shrink-0" />;
    case "security":
      return <ShieldAlert className="size-5 text-violet-600 dark:text-violet-400 shrink-0" />;
    default:
      return <Info className="size-5 text-blue-600 dark:text-blue-400 shrink-0" />;
  }
}

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

  const rows = data.filter((n) => {
    if (filter === "semua") return true;
    if (filter === "belum") return !n.read_at;
    if (filter === "status") return ["status", "proposal_approved", "proposal_revision", "proposal_failed"].includes(n.type);
    if (filter === "keamanan") return ["security", "account_locked"].includes(n.type);
    if (filter === "data") return ["import_success", "import_failed", "export_success", "export_failed"].includes(n.type);
    return n.type === filter;
  });

  const unread = data.filter((n) => !n.read_at).length;

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markAll() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("Seluruh notifikasi ditandai telah dibaca.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        title="Pusat Notifikasi"
        description={`${unread} notifikasi belum dibaca.`}
        actions={
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Notifikasi</SelectItem>
                <SelectItem value="belum">Belum Dibaca</SelectItem>
                <SelectItem value="status">Status Proposal</SelectItem>
                <SelectItem value="data">Impor & Ekspor Data</SelectItem>
                <SelectItem value="keamanan">Keamanan Akun</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={markAll} disabled={unread === 0} className="gap-1.5">
              <CheckCheck className="size-4" /> Tandai Semua Dibaca
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Memuat notifikasi…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Belum Ada Notifikasi" description="Notifikasi pergerakan status proposal, impor data, dan keamanan akun akan muncul di sini." />
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li
              key={n.id}
              className={cn(
                "surface-panel flex items-start justify-between gap-4 p-4 transition-all hover:border-primary/40",
                !n.read_at && "border-primary/50 bg-primary/5 shadow-xs",
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                {getNotificationIcon(n.type)}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm leading-tight text-foreground">{n.title}</p>
                    {!n.read_at && <Badge className="text-[10px] bg-primary">Baru</Badge>}
                  </div>
                  {n.message && <p className="text-xs text-muted-foreground leading-normal">{n.message}</p>}
                  <p className="text-[10px] text-muted-foreground pt-1">{formatDateTime(n.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.action_url && (
                  <Link to={n.action_url as never}>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      Buka <ExternalLink className="size-3" />
                    </Button>
                  </Link>
                )}
                {!n.read_at && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => void markRead(n.id)}>
                    Tandai Dibaca
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}