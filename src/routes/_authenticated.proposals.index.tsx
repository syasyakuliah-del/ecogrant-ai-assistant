import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowUpDown,
  Building2,
  Calendar,
  CheckSquare,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { PROPOSAL_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { exportProposalsToXLSX, type ProposalExportRow } from "@/lib/proposal-export";
import { EmptyState, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/proposals/")({
  head: () => ({
    meta: [
      { title: "Proposal Saya — EcoGrant AI" },
      {
        name: "description",
        content:
          "Kelola seluruh proposal hibah beserta status, tanggal, progres, dan ekspor dokumen.",
      },
      { property: "og:title", content: "Proposal Saya — EcoGrant AI" },
      {
        property: "og:description",
        content: "Daftar proposal hibah lengkap dengan pencarian, filter, dan aksi massal.",
      },
    ],
  }),
  component: ProposalsPage,
});

type ProposalRow = {
  id: string;
  owner_id: string;
  title: string;
  organization_name: string | null;
  donor_id: string | null;
  grant_amount: number;
  currency: string;
  status: string;
  progress_percent: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  donors?: { name: string } | null;
};

function ProposalsPage() {
  const { user, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("semua");
  const [donor, setDonor] = useState("semua");
  const [orgFilter, setOrgFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("semua");
  const [sortField, setSortField] = useState("updated_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Selection state for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [detailProposal, setDetailProposal] = useState<ProposalRow | null>(null);

  const canAccessAll = isAdmin || hasPermission("proposal.view.all");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch Donors for filter dropdown
  const { data: donors = [] } = useQuery({
    queryKey: ["donors-simple"],
    queryFn: async () => {
      const { data } = await supabase
        .from("donors")
        .select("id,name")
        .is("deleted_at", null)
        .order("name");
      return data ?? [];
    },
  });

  // Fetch Proposals query with server-side filter, sort, and pagination
  const { data, isLoading } = useQuery({
    queryKey: [
      "proposals-list",
      user?.id,
      canAccessAll,
      debounced,
      status,
      donor,
      orgFilter,
      dateFilter,
      sortField,
      sortAsc,
      page,
      pageSize,
    ],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("proposals")
        .select("*, donors(name)", { count: "exact" })
        .is("deleted_at", null);

      if (!canAccessAll) {
        query = query.eq("owner_id", user!.id);
      }

      if (debounced) {
        query = query.or(`title.ilike.%${debounced}%,organization_name.ilike.%${debounced}%`);
      }

      if (status !== "semua") {
        query = query.eq("status", status as never);
      }

      if (donor !== "semua") {
        query = query.eq("donor_id", donor);
      }

      if (orgFilter.trim()) {
        query = query.ilike("organization_name", `%${orgFilter.trim()}%`);
      }

      // Date filtering logic
      if (dateFilter !== "semua") {
        const now = new Date();
        let fromDate: Date | null = null;

        if (dateFilter === "7d") {
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (dateFilter === "30d") {
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (dateFilter === "month") {
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (dateFilter === "year") {
          fromDate = new Date(now.getFullYear(), 0, 1);
        }

        if (fromDate) {
          query = query.gte("created_at", fromDate.toISOString());
        }
      }

      const {
        data: rows,
        count,
        error,
      } = await query
        .order(sortField, { ascending: sortAsc })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (error) throw error;
      return { rows: (rows as unknown as ProposalRow[]) ?? [], count: count ?? 0 };
    },
  });

  // Create Proposal Mutation
  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_name,full_name")
        .eq("id", user!.id)
        .maybeSingle();

      const { data: row, error } = await supabase
        .from("proposals")
        .insert({
          owner_id: user!.id,
          title,
          organization_name: profile?.organization_name ?? null,
          pic_name: profile?.full_name ?? null,
          status: "draft",
          progress_percent: 10,
        })
        .select("id")
        .single();

      if (error) throw error;
      await logAudit({
        action: "proposal.create",
        entityType: "proposals",
        entityId: row.id,
        newValues: { title },
      });
      return row.id;
    },
    onSuccess: (id) => {
      toast.success("Proposal baru berhasil dibuat.");
      setCreateOpen(false);
      setNewTitle("");
      void navigate({ to: "/proposals/$id", params: { id } });
    },
    onError: (err: Error) => toast.error("Gagal membuat proposal: " + err.message),
  });

  // Duplicate Proposal Mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: source, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      const { id: _id, created_at, updated_at, ...rest } = source;
      void _id;
      void created_at;
      void updated_at;

      const { data: copy, error: insertError } = await supabase
        .from("proposals")
        .insert({
          ...rest,
          title: `${source.title} (Salinan)`,
          status: "draft",
          submitted_at: null,
          approved_at: null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Duplicate associated sections, LFA, and budget items
      const [{ data: sections }, { data: lfa }, { data: budget }] = await Promise.all([
        supabase.from("proposal_sections").select("*").eq("proposal_id", id),
        supabase.from("lfa_rows").select("*").eq("proposal_id", id),
        supabase.from("budget_items").select("*").eq("proposal_id", id),
      ]);

      if (sections?.length) {
        await supabase.from("proposal_sections").insert(
          sections.map(({ id: _s, created_at: _c, updated_at: _u, ...s }) => ({
            ...s,
            proposal_id: copy.id,
          })),
        );
      }

      if (lfa?.length) {
        await supabase.from("lfa_rows").insert(
          lfa.map(({ id: _l, created_at: _c, updated_at: _u, ...l }) => ({
            ...l,
            proposal_id: copy.id,
          })),
        );
      }

      if (budget?.length) {
        await supabase.from("budget_items").insert(
          budget.map(
            ({
              id: _b,
              created_at: _c,
              updated_at: _u,
              subtotal: _st,
              tax_amount: _ta,
              total: _t,
              lfa_row_id: _lr,
              ...b
            }) => ({
              ...b,
              proposal_id: copy.id,
            }),
          ),
        );
      }

      await logAudit({ action: "proposal.duplicate", entityType: "proposals", entityId: copy.id });
      return copy.id;
    },
    onSuccess: () => {
      toast.success("Proposal berhasil menduplikasi seluruh narasi, LFA, dan RAB.");
      void queryClient.invalidateQueries({ queryKey: ["proposals-list"] });
    },
    onError: (err: Error) => toast.error("Duplikasi gagal: " + err.message),
  });

  // Soft Delete with 10-Second Interactive Undo Toast
  async function handleDelete(id: string, title: string) {
    const { error } = await supabase
      .from("proposals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Proposal gagal dihapus: " + error.message);
      return;
    }

    await logAudit({ action: "proposal.delete", entityType: "proposals", entityId: id });
    void queryClient.invalidateQueries({ queryKey: ["proposals-list"] });

    toast.success(`Proposal "${title}" dihapus (Soft Delete).`, {
      duration: 10000,
      icon: <RotateCcw className="size-4 text-emerald-500" />,
      action: {
        label: "Batalkan (Undo 10s)",
        onClick: async () => {
          await supabase.from("proposals").update({ deleted_at: null }).eq("id", id);
          await logAudit({ action: "proposal.restore", entityType: "proposals", entityId: id });
          void queryClient.invalidateQueries({ queryKey: ["proposals-list"] });
          toast.success("Penghapusan proposal berhasil dibatalkan!");
        },
      },
    });
  }

  // Bulk Delete for Admin
  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;

    const { error } = await supabase
      .from("proposals")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", selectedIds);

    if (error) {
      toast.error("Bulk delete gagal: " + error.message);
      return;
    }

    await logAudit({
      action: "admin.proposal.bulk_delete",
      entityType: "proposals",
      newValues: { count, selectedIds },
    });
    setSelectedIds([]);
    void queryClient.invalidateQueries({ queryKey: ["proposals-list"] });

    toast.success(`${count} proposal berhasil dihapus.`, {
      duration: 10000,
      action: {
        label: "Batalkan Semua",
        onClick: async () => {
          await supabase.from("proposals").update({ deleted_at: null }).in("id", selectedIds);
          void queryClient.invalidateQueries({ queryKey: ["proposals-list"] });
          toast.success("Penghapusan massal dibatalkan.");
        },
      },
    });
  }

  // Export Single Proposal
  function handleSingleExport(proposal: ProposalRow) {
    const exportData: ProposalExportRow[] = [
      {
        id: proposal.id,
        title: proposal.title,
        organization_name: proposal.organization_name,
        donor_name: proposal.donors?.name ?? null,
        grant_amount: proposal.grant_amount,
        currency: proposal.currency,
        status: proposal.status,
        progress_percent: proposal.progress_percent,
        created_at: proposal.created_at,
        updated_at: proposal.updated_at,
      },
    ];
    exportProposalsToXLSX(exportData, `Proposal_${proposal.title.replace(/\s+/g, "_")}.xlsx`);
    toast.success("Dokumen XLSX proposal berhasil diunduh.");
  }

  // Bulk Export for Admin
  function handleBulkExport() {
    const targetRows =
      selectedIds.length > 0
        ? (data?.rows ?? []).filter((r) => selectedIds.includes(r.id))
        : (data?.rows ?? []);

    if (targetRows.length === 0) {
      toast.error("Tidak ada proposal untuk diekspor.");
      return;
    }

    const exportData: ProposalExportRow[] = targetRows.map((r) => ({
      id: r.id,
      title: r.title,
      organization_name: r.organization_name,
      donor_name: r.donors?.name ?? null,
      grant_amount: r.grant_amount,
      currency: r.currency,
      status: r.status,
      progress_percent: r.progress_percent,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    exportProposalsToXLSX(
      exportData,
      `Laporan_Ekspor_Proposal_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success(`${exportData.length} proposal berhasil diekspor ke Excel.`);
  }

  // Selection handlers
  const allCurrentRowIds = (data?.rows ?? []).map((r) => r.id);
  const isAllSelected =
    allCurrentRowIds.length > 0 && allCurrentRowIds.every((id) => selectedIds.includes(id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allCurrentRowIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allCurrentRowIds])));
    }
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  // Toggle sorting by column
  function handleSortToggle(field: string) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setPage(0);
  }

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposal Saya"
        description="Kelola seluruh proposal hibah beserta pencarian, filter status/donor, progress, duplikasi, dan ekspor dokumen."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2 shadow-sm">
            <Plus className="size-4" /> Buat Proposal
          </Button>
        }
      />

      {/* Filter & Search Toolbar */}
      <Card className="p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-12">
          {/* Realtime Debounced Search */}
          <div className="relative md:col-span-4">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul proposal atau nama organisasi..."
              className="pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                {PROPOSAL_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Donor Filter */}
          <div className="md:col-span-2">
            <Select
              value={donor}
              onValueChange={(v) => {
                setDonor(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue placeholder="Filter Donor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Donor</SelectItem>
                {donors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          <div className="md:col-span-2">
            <Select
              value={dateFilter}
              onValueChange={(v) => {
                setDateFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue placeholder="Rentang Tanggal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Tanggal</SelectItem>
                <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="year">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Organization Text Filter */}
          <div className="md:col-span-2">
            <Input
              value={orgFilter}
              onChange={(e) => {
                setOrgFilter(e.target.value);
                setPage(0);
              }}
              placeholder="Filter Organisasi"
              className="text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Second Row: Sorting, Page Size, and Bulk Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="size-3.5 text-primary" /> Urutkan:
            </div>
            <Select value={sortField} onValueChange={(v) => setSortField(v)}>
              <SelectTrigger className="w-44 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at">Terakhir Diperbarui</SelectItem>
                <SelectItem value="created_at">Tanggal Dibuat</SelectItem>
                <SelectItem value="title">Judul Proposal</SelectItem>
                <SelectItem value="grant_amount">Nilai Hibah</SelectItem>
                <SelectItem value="progress_percent">Progress Penyusunan</SelectItem>
                <SelectItem value="organization_name">Nama Organisasi</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs gap-1"
              onClick={() => setSortAsc(!sortAsc)}
            >
              <ArrowUpDown className="size-3" /> {sortAsc ? "A-Z / Naik" : "Z-A / Turun"}
            </Button>
          </div>

          {/* Bulk Action Controls for Admin or selected items */}
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-xs"
              >
                {selectedIds.length} Dipilih
              </Badge>
            )}

            {(canAccessAll || selectedIds.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleBulkExport}
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Ekspor XLSX {selectedIds.length > 0 ? `(${selectedIds.length})` : "Semua"}
              </Button>
            )}

            {canAccessAll && selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleBulkDelete}
              >
                <Trash2 className="size-3.5" /> Hapus Massal ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Table View */}
      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (data?.rows ?? []).length === 0 ? (
        <EmptyState
          title="Tidak Ada Proposal Ditemukan"
          description="Proposal tidak ditemukan sesuai kriteria filter Anda. Buat proposal baru atau reset kata kunci pencarian."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Buat Proposal Baru
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  {canAccessAll && (
                    <TableHead className="w-10 text-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Pilih Semua"
                      />
                    </TableHead>
                  )}
                  <TableHead className="cursor-pointer" onClick={() => handleSortToggle("title")}>
                    <div className="flex items-center gap-1">
                      Judul Proposal
                      <ArrowUpDown className="size-3 opacity-50" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSortToggle("organization_name")}
                  >
                    <div className="flex items-center gap-1">
                      Organisasi
                      <ArrowUpDown className="size-3 opacity-50" />
                    </div>
                  </TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSortToggle("grant_amount")}
                  >
                    <div className="flex items-center gap-1">
                      Nilai Hibah
                      <ArrowUpDown className="size-3 opacity-50" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSortToggle("status")}>
                    <div className="flex items-center gap-1">
                      Status
                      <ArrowUpDown className="size-3 opacity-50" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-36 cursor-pointer"
                    onClick={() => handleSortToggle("progress_percent")}
                  >
                    <div className="flex items-center gap-1">
                      Progress
                      <ArrowUpDown className="size-3 opacity-50" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs"
                    onClick={() => handleSortToggle("created_at")}
                  >
                    Tanggal Dibuat
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-xs"
                    onClick={() => handleSortToggle("updated_at")}
                  >
                    Terakhir Diperbarui
                  </TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows ?? []).map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <TableRow key={p.id} className={isSelected ? "bg-primary/5" : undefined}>
                      {canAccessAll && (
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectRow(p.id)}
                            aria-label={`Pilih ${p.title}`}
                          />
                        </TableCell>
                      )}

                      {/* 10.1 Kolom Judul */}
                      <TableCell className="max-w-xs font-medium">
                        <Link
                          to="/proposals/$id"
                          params={{ id: p.id }}
                          className="hover:text-primary transition-colors line-clamp-2 hover:underline"
                        >
                          {p.title}
                        </Link>
                      </TableCell>

                      {/* 10.1 Kolom Organisasi */}
                      <TableCell className="text-xs text-muted-foreground">
                        {p.organization_name || "Individu / Belum Diatur"}
                      </TableCell>

                      {/* 10.1 Kolom Donor */}
                      <TableCell className="text-xs font-medium">
                        {p.donors?.name || "Belum Dipilih"}
                      </TableCell>

                      {/* 10.1 Kolom Nilai Hibah */}
                      <TableCell className="text-xs font-mono font-semibold">
                        {formatCurrency(p.grant_amount, p.currency)}
                      </TableCell>

                      {/* 10.1 Kolom Status */}
                      <TableCell>
                        <Badge
                          variant={
                            p.status === "disetujui" || p.status === "selesai"
                              ? "default"
                              : p.status === "perlu_revisi"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-[11px] font-normal"
                        >
                          {STATUS_LABEL[p.status] || p.status}
                        </Badge>
                      </TableCell>

                      {/* 10.1 Kolom Progress */}
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={p.progress_percent} className="h-1.5" />
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {p.progress_percent}%
                          </span>
                        </div>
                      </TableCell>

                      {/* 10.1 Kolom Tanggal Dibuat */}
                      <TableCell className="text-[11px] text-muted-foreground">
                        {formatDate(p.created_at)}
                      </TableCell>

                      {/* 10.1 Kolom Terakhir Diperbarui */}
                      <TableCell className="text-[11px] text-muted-foreground">
                        {formatDate(p.updated_at)}
                      </TableCell>

                      {/* 10.1 Kolom Aksi */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Lihat Detail */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            title="Lihat Ringkasan Detail"
                            onClick={() => setDetailProposal(p)}
                          >
                            <Eye className="size-3.5 text-muted-foreground" />
                          </Button>

                          {/* Edit */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            title="Edit Proposal"
                            onClick={() =>
                              void navigate({ to: "/proposals/$id", params: { id: p.id } })
                            }
                          >
                            <FileText className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          </Button>

                          {/* Duplikasi Proposal */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            title="Duplikasi Proposal"
                            onClick={() => duplicateMutation.mutate(p.id)}
                            disabled={duplicateMutation.isPending}
                          >
                            <Copy className="size-3.5 text-primary" />
                          </Button>

                          {/* Export */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            title="Ekspor Ke Excel"
                            onClick={() => handleSingleExport(p)}
                          >
                            <Download className="size-3.5 text-blue-600 dark:text-blue-400" />
                          </Button>

                          {/* Hapus dengan Undo 10 Detik */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            title="Hapus Proposal (Undo 10s)"
                            onClick={() => void handleDelete(p.id, p.title)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Server-Side Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-4 py-3 gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                Menampilkan {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)}{" "}
                dari {totalCount} proposal
              </span>
              <div className="flex items-center gap-1.5">
                <span>Per Halaman:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-16 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Sebelumnya
              </Button>

              <span className="text-xs font-medium px-2">
                {page + 1} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Dialog Buat Proposal Baru */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Buat Proposal Hibah Baru
            </DialogTitle>
            <DialogDescription>
              Masukkan judul rencana proposal. Anda dapat menyunting judul dan narasi kembali di
              dalam wizard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="new-proposal-title">Judul Proposal</Label>
            <Input
              id="new-proposal-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Contoh: Program Pemberdayaan Kelompok Tani Hutan Berkelanjutan"
            />
            <p className="text-xs text-muted-foreground">
              Panjang judul antara 10 hingga 250 karakter.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={newTitle.trim().length < 10 || createMutation.isPending}
              onClick={() => createMutation.mutate(newTitle.trim())}
            >
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Mulai Penyusunan Wizard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail Proposal */}
      <Dialog open={!!detailProposal} onOpenChange={(open) => !open && setDetailProposal(null)}>
        {detailProposal && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase">
                <FileText className="size-4" /> Detail Ringkasan Proposal
              </div>
              <DialogTitle className="text-lg font-bold">{detailProposal.title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                ID Proposal:{" "}
                <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">
                  {detailProposal.id}
                </code>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 bg-muted/30">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Organisasi</span>
                  <span className="font-semibold">
                    {detailProposal.organization_name || "Individu"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Lembaga Donor</span>
                  <span className="font-semibold">
                    {detailProposal.donors?.name || "Belum Dipilih"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Nilai Hibah</span>
                  <span className="font-mono font-bold text-primary text-sm">
                    {formatCurrency(detailProposal.grant_amount, detailProposal.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Status</span>
                  <Badge variant="secondary" className="mt-0.5">
                    {STATUS_LABEL[detailProposal.status] || detailProposal.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-medium text-[11px]">
                  <span>Progress Penyusunan</span>
                  <span>{detailProposal.progress_percent}% Selesai</span>
                </div>
                <Progress value={detailProposal.progress_percent} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-muted-foreground pt-2 border-t">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider">Tanggal Dibuat</span>
                  <span className="font-mono text-foreground text-[11px]">
                    {formatDateTime(detailProposal.created_at)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider">
                    Terakhir Diperbarui
                  </span>
                  <span className="font-mono text-foreground text-[11px]">
                    {formatDateTime(detailProposal.updated_at)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleSingleExport(detailProposal)}
                className="gap-1.5 text-xs"
              >
                <Download className="size-3.5" /> Unduh XLSX
              </Button>
              <Button
                onClick={() =>
                  void navigate({ to: "/proposals/$id", params: { id: detailProposal.id } })
                }
                className="gap-1.5 text-xs"
              >
                <FileText className="size-3.5" /> Buka Wizard Penyusunan
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
