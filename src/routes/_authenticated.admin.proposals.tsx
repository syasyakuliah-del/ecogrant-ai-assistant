import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import {
  ArrowUpDown, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Download,
  Eye, History, RotateCcw, Trash2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, notify } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { AdminToolbar, EmptyRow } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PROPOSAL_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/proposals")({
  head: () => ({
    meta: [
      { title: "Kelola Proposal — Admin EcoGrant AI" },
      { name: "description", content: "Tinjau, ubah status, approval, dan kelola seluruh proposal hibah." },
    ],
  }),
  component: AdminProposals,
});

const PAGE_SIZE = 25;

type SortKey = "title" | "organization_name" | "grant_amount" | "updated_at";
type SortDir = "asc" | "desc";

function AdminProposals() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Approval dialog
  const [approvalTarget, setApprovalTarget] = useState<{ id: string; ownerId: string; title: string; mode: "approve" | "return" } | null>(null);
  const [approvalNote, setApprovalNote] = useState("");

  // Versions dialog
  const [versionsFor, setVersionsFor] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-proposals-full", showArchived],
    queryFn: async () => {
      let query = supabase.from("proposals").select("*").order("updated_at", { ascending: false }).limit(500);
      if (!showArchived) query = query.is("deleted_at", null);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["proposal-versions", versionsFor],
    enabled: !!versionsFor,
    queryFn: async () => {
      if (!versionsFor) return [];
      const { data } = await supabase.from("proposal_versions").select("*").eq("proposal_id", versionsFor).order("version_number", { ascending: false });
      return data ?? [];
    },
  });

  // Filter + Sort
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let result = data.filter((p) => {
      if (statusFilter !== "semua" && p.status !== statusFilter) return false;
      if (!term) return true;
      return [p.title, p.organization_name, p.province].some((f) => (f ?? "").toLowerCase().includes(term));
    });
    result.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (sortKey === "grant_amount") return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      const cmp = String(av).localeCompare(String(bv), "id");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [data, q, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }, [sortKey]);

  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => { if (selected.size === rows.length) setSelected(new Set()); else setSelected(new Set(rows.map((r) => r.id))); };

  async function changeStatus(id: string, ownerId: string, title: string, next: string, note?: string) {
    const updateData: Record<string, unknown> = { status: next as never, review_note: note ?? null };
    if (next === "disetujui") { updateData.approved_at = new Date().toISOString(); }
    if (next === "siap_ditinjau") { updateData.submitted_at = new Date().toISOString(); }
    const { error } = await supabase.from("proposals").update(updateData as never).eq("id", id);
    if (error) { toast.error("Status gagal diperbarui: " + error.message); return; }
    await logAudit({ action: "admin.proposal.status", entityType: "proposal", entityId: id, newValues: { status: next, note } });
    await notify({ userId: ownerId, type: "status", title: `Status proposal: ${STATUS_LABEL[next] ?? next}`, message: `Proposal "${title}" kini berstatus ${STATUS_LABEL[next] ?? next}.${note ? ` Catatan: ${note}` : ""}` });
    void qc.invalidateQueries({ queryKey: ["admin-proposals-full"] });
    toast.success("Status proposal diperbarui.");
  }

  async function handleApproval() {
    if (!approvalTarget) return;
    const nextStatus = approvalTarget.mode === "approve" ? "disetujui" : "perlu_revisi";
    await changeStatus(approvalTarget.id, approvalTarget.ownerId, approvalTarget.title, nextStatus, approvalNote || undefined);
    setApprovalTarget(null);
    setApprovalNote("");
  }

  async function softDelete(id: string) {
    if (!window.confirm("Arsipkan proposal ini?")) return;
    await supabase.from("proposals").update({ deleted_at: new Date().toISOString() } as never).eq("id", id);
    await logAudit({ action: "admin.proposal.archive", entityType: "proposal", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-proposals-full"] });
    toast.success("Proposal diarsipkan.");
  }

  async function restore(id: string) {
    await supabase.from("proposals").update({ deleted_at: null } as never).eq("id", id);
    await logAudit({ action: "admin.proposal.restore", entityType: "proposal", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-proposals-full"] });
    toast.success("Proposal dikembalikan dari arsip.");
  }

  async function bulkChangeStatus(next: string) {
    if (selected.size === 0) return;
    for (const id of selected) {
      const p = data.find((x) => x.id === id);
      if (p) await changeStatus(id, p.owner_id, p.title, next);
    }
    setSelected(new Set());
  }

  async function bulkArchive() {
    if (selected.size === 0 || !window.confirm(`Arsipkan ${selected.size} proposal?`)) return;
    for (const id of selected) await softDelete(id);
    setSelected(new Set());
  }

  function exportXLSX() {
    const exportData = (selected.size > 0 ? filtered.filter((p) => selected.has(p.id)) : filtered).map((p) => ({
      Judul: p.title,
      Organisasi: p.organization_name ?? "-",
      Provinsi: p.province ?? "-",
      "Nilai Hibah": Number(p.grant_amount),
      "Mata Uang": p.currency,
      Status: STATUS_LABEL[p.status] ?? p.status,
      "Dibuat": p.created_at,
      "Diperbarui": p.updated_at,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proposals");
    XLSX.writeFile(wb, `proposals_admin_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${exportData.length} proposal diekspor.`);
    void logAudit({ action: "admin.proposal.export", entityType: "proposal", newValues: { count: exportData.length, format: "xlsx" } });
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{label} <ArrowUpDown className="size-3 opacity-40" />{sortKey === field && <span className="text-[10px] text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>}</span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Kelola Proposal" description="Seluruh proposal dari semua organisasi — approval, arsip, bulk action, dan export." />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-56">
          <AdminToolbar query={q} onQueryChange={(v) => { setQ(v); setPage(0); }} placeholder="Cari judul, organisasi, atau provinsi…" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            {PROPOSAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => { setShowArchived(!showArchived); setPage(0); }}>
          {showArchived ? "Sembunyikan Arsip" : "Tampilkan Arsip"}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportXLSX}><Download className="size-3.5" /> Export XLSX</Button>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <span className="font-medium">{selected.size} dipilih</span>
          <Select onValueChange={(v) => void bulkChangeStatus(v)}>
            <SelectTrigger className="w-44 h-8"><SelectValue placeholder="Ubah status…" /></SelectTrigger>
            <SelectContent>
              {PROPOSAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" onClick={() => void bulkArchive()}>Arsipkan</Button>
          <Button variant="outline" size="sm" onClick={exportXLSX}><Download className="size-3.5 mr-1" /> Export Terpilih</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Batal Pilih</Button>
        </div>
      )}

      {/* Table */}
      <div className="surface-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={rows.length > 0 && selected.size === rows.length} onCheckedChange={toggleAll} /></TableHead>
              <SortHeader label="Judul" field="title" />
              <SortHeader label="Organisasi" field="organization_name" />
              <SortHeader label="Nilai Hibah" field="grant_amount" />
              <SortHeader label="Diperbarui" field="updated_at" />
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <EmptyRow colSpan={7} label="Memuat data proposal…" />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7} label="Tidak ada proposal yang cocok." />
            ) : (
              rows.map((p) => (
                <TableRow key={p.id} className={p.deleted_at ? "opacity-50" : ""}>
                  <TableCell><Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></TableCell>
                  <TableCell className="max-w-56 truncate font-medium">
                    <Link to="/proposals/$id" params={{ id: p.id }} className="hover:underline">{p.title}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.organization_name ?? "-"}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(p.grant_amount, p.currency)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.updated_at)}</TableCell>
                  <TableCell>
                    {p.deleted_at ? (
                      <Badge variant="secondary">Diarsipkan</Badge>
                    ) : (
                      <Select value={p.status} onValueChange={(v) => void changeStatus(p.id, p.owner_id, p.title, v)}>
                        <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROPOSAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {!p.deleted_at && p.status === "siap_ditinjau" && (
                        <>
                          <Button variant="ghost" size="icon" title="Setujui" onClick={() => setApprovalTarget({ id: p.id, ownerId: p.owner_id, title: p.title, mode: "approve" })}>
                            <CheckCircle2 className="size-4 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Kembalikan dengan catatan" onClick={() => setApprovalTarget({ id: p.id, ownerId: p.owner_id, title: p.title, mode: "return" })}>
                            <XCircle className="size-4 text-amber-600" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" title="Lihat versi" onClick={() => setVersionsFor(p.id)}>
                        <History className="size-4" />
                      </Button>
                      <Link to="/proposals/$id" params={{ id: p.id }}>
                        <Button variant="ghost" size="icon" title="Lihat detail"><Eye className="size-4" /></Button>
                      </Link>
                      {p.deleted_at ? (
                        <Button variant="ghost" size="icon" title="Restore" onClick={() => void restore(p.id)}>
                          <RotateCcw className="size-4 text-blue-600" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" title="Arsipkan" onClick={() => void softDelete(p.id)}>
                          <Trash2 className="size-4 text-red-500" />
                        </Button>
                      )}
                    </div>
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
          <span>Halaman {page + 1} dari {totalPages} ({filtered.length} proposal)</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      )}

      {/* Approval Dialog */}
      <Dialog open={!!approvalTarget} onOpenChange={(o) => { if (!o) { setApprovalTarget(null); setApprovalNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approvalTarget?.mode === "approve" ? <CheckCircle2 className="size-5 text-emerald-600" /> : <XCircle className="size-5 text-amber-600" />}
              {approvalTarget?.mode === "approve" ? "Setujui Proposal" : "Kembalikan untuk Revisi"}
            </DialogTitle>
            <DialogDescription>
              Proposal: <strong>{approvalTarget?.title}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{approvalTarget?.mode === "approve" ? "Catatan persetujuan (opsional)" : "Catatan revisi yang diperlukan"}</Label>
            <Textarea value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder={approvalTarget?.mode === "approve" ? "Proposal telah memenuhi persyaratan…" : "Mohon perbaiki bagian anggaran dan narasi…"} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApprovalTarget(null); setApprovalNote(""); }}>Batal</Button>
            <Button onClick={() => void handleApproval()} className={approvalTarget?.mode === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}>
              {approvalTarget?.mode === "approve" ? "Setujui" : "Kembalikan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions Dialog */}
      <Dialog open={!!versionsFor} onOpenChange={(o) => { if (!o) setVersionsFor(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardList className="size-5" /> Riwayat Versi Proposal</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {versions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Belum ada riwayat versi.</p>
            ) : (
              versions.map((v) => (
                <Card key={v.id}>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs font-medium flex items-center justify-between">
                      <span>Versi {v.version_number}</span>
                      <span className="text-muted-foreground font-normal">{formatDateTime(v.created_at)}</span>
                    </CardTitle>
                  </CardHeader>
                  {v.change_summary && <CardContent className="py-1 px-3 text-xs text-muted-foreground">{v.change_summary}</CardContent>}
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}