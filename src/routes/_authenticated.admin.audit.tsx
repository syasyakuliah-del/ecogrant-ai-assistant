import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Eye, FileJson, Filter, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { AdminToolbar, EmptyRow } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — Admin EcoGrant AI" },
      {
        name: "description",
        content: "Jejak audit read-only aktivitas pengguna, administrasi, dan sistem EcoGrant AI.",
      },
    ],
  }),
  component: AdminAudit,
});

const PAGE_SIZE = 25;

function AdminAudit() {
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [actionCategory, setActionCategory] = useState("semua");
  const [page, setPage] = useState(0);

  // Selected Log detail modal
  const [selectedLog, setSelectedLog] = useState<Record<string, unknown> | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-audit-full"],
    queryFn: async () => {
      const [{ data: logs, error }, { data: profiles }] = await Promise.all([
        supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      if (error) throw error;
      const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
      return (logs ?? []).map((l) => ({
        ...l,
        actor_name: l.user_id ? (names.get(l.user_id) ?? "Pengguna") : "Sistem",
      }));
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((l) => {
      if (dateFilter && l.created_at.slice(0, 10) !== dateFilter) return false;
      if (actionCategory !== "semua" && !l.action.startsWith(actionCategory)) return false;
      if (!term) return true;
      return [l.action, l.entity_type, l.actor_name, l.user_agent, l.ip_address].some((f) =>
        (f ?? "").toLowerCase().includes(term),
      );
    });
  }, [data, q, dateFilter, actionCategory]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Log Systems"
        description="Perekaman aktivitas read-only untuk keamanan dan tata kelola platform."
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-56">
          <AdminToolbar
            query={q}
            onQueryChange={(v) => {
              setQ(v);
              setPage(0);
            }}
            placeholder="Cari aksi, entitas, IP, atau nama pengguna…"
          />
        </div>
        <Select
          value={actionCategory}
          onValueChange={(v) => {
            setActionCategory(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kategori</SelectItem>
            <SelectItem value="admin">Aksi Admin</SelectItem>
            <SelectItem value="proposal">Status Proposal</SelectItem>
            <SelectItem value="auth">Keamanan / Auth</SelectItem>
            <SelectItem value="community">Community</SelectItem>
            <SelectItem value="ai">AI Generator</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(0);
          }}
          className="w-40"
        />
      </div>

      {/* Table */}
      <div className="surface-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Pengguna / Aktor</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Entitas Target</TableHead>
              <TableHead>User Agent / IP</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <EmptyRow colSpan={6} label="Memuat catatan audit…" />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={6} label="Tidak ada catatan audit yang cocok." />
            ) : (
              rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {formatDateTime(l.created_at)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{l.actor_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {l.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.entity_type ?? "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-44 truncate">
                    {l.user_agent || l.ip_address || "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Lihat detail JSON"
                      onClick={() => setSelectedLog(l)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Halaman {page + 1} dari {totalPages} ({filtered.length} log)
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Log Detail Inspector Modal */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(o) => {
          if (!o) setSelectedLog(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="size-5 text-emerald-600" /> Detail Audit Log
            </DialogTitle>
            <DialogDescription>
              Catatan audit ini bersifat immutable (hanya-baca) dan tidak dapat diubah.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/20">
                <div>
                  <span className="text-muted-foreground">ID Log:</span>{" "}
                  <code className="font-mono">{String(selectedLog.id)}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Waktu:</span>{" "}
                  {formatDateTime(String(selectedLog.created_at))}
                </div>
                <div>
                  <span className="text-muted-foreground">Aktor:</span>{" "}
                  {String(selectedLog.actor_name)}
                </div>
                <div>
                  <span className="text-muted-foreground">Aksi:</span>{" "}
                  <Badge variant="outline">{String(selectedLog.action)}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Entitas:</span>{" "}
                  {String(selectedLog.entity_type ?? "-")}
                </div>
                <div>
                  <span className="text-muted-foreground">Entity ID:</span>{" "}
                  {String(selectedLog.entity_id ?? "-")}
                </div>
              </div>

              {selectedLog.old_values && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground">
                    Nilai Lama (Old Values):
                  </span>
                  <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground">
                    Nilai Baru (New Values):
                  </span>
                  <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
