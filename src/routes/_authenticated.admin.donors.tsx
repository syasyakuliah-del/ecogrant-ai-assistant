import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { AdminToolbar, EmptyRow } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/donors")({
  head: () => ({
    meta: [
      { title: "Kelola Donor — Admin EcoGrant AI" },
      {
        name: "description",
        content:
          "Kelola basis data lembaga donor, prioritas pendanaan, dan kriteria persyaratannya.",
      },
    ],
  }),
  component: AdminDonors,
});

const PAGE_SIZE = 25;

type FormState = {
  id?: string;
  name: string;
  category: string;
  country: string;
  website: string;
  email: string;
  phone: string;
  funding_fields: string;
  priorities: string;
  requirements: string;
  min_grant: string;
  max_grant: string;
  currency: string;
  deadline: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  category: "Yayasan Nasional",
  country: "Indonesia",
  website: "",
  email: "",
  phone: "",
  funding_fields: "",
  priorities: "",
  requirements: "",
  min_grant: "0",
  max_grant: "0",
  currency: "IDR",
  deadline: "",
  is_active: true,
};

function toArray(val: string) {
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toCsvStr(arr?: string[] | null) {
  return (arr ?? []).join(", ");
}

type SortKey = "name" | "category" | "max_grant" | "deadline";

function AdminDonors() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("semua");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // History modal
  const [historyDonorId, setHistoryDonorId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-donors-full", showArchived],
    queryFn: async () => {
      let query = supabase
        .from("donors")
        .select(
          "id, name, category, country, website, funding_fields, priorities, requirements, min_grant, max_grant, currency, deadline, is_active, created_at, updated_at, deleted_at",
        )
        .order("name");
      if (!showArchived) query = query.is("deleted_at", null);
      const { data, error } = await query;
      if (error) throw error;
      // Contact details are admin-only and served by a guarded database function.
      const { data: contacts } = await supabase.rpc("admin_donor_contacts");
      const contactMap = new Map(
        (contacts ?? []).map((c) => [c.id, { email: c.email, phone: c.phone }]),
      );
      return (data ?? []).map((d) => ({
        ...d,
        email: contactMap.get(d.id)?.email ?? null,
        phone: contactMap.get(d.id)?.phone ?? null,
      }));
    },
  });

  const { data: auditHistory = [] } = useQuery({
    queryKey: ["donor-history", historyDonorId],
    enabled: !!historyDonorId,
    queryFn: async () => {
      if (!historyDonorId) return [];
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("entity_id", historyDonorId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const categories = useMemo(
    () => Array.from(new Set(data.map((d) => d.category).filter(Boolean))),
    [data],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const result = data.filter((d) => {
      if (categoryFilter !== "semua" && d.category !== categoryFilter) return false;
      if (!term) return true;
      return [d.name, d.category, d.country, d.email].some((f) =>
        (f ?? "").toLowerCase().includes(term),
      );
    });
    result.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (sortKey === "max_grant")
        return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      const cmp = String(av).localeCompare(String(bv), "id");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [data, q, categoryFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(d: (typeof data)[number]) {
    setForm({
      id: d.id,
      name: d.name,
      category: d.category,
      country: d.country ?? "",
      website: d.website ?? "",
      email: d.email ?? "",
      phone: d.phone ?? "",
      funding_fields: toCsvStr(d.funding_fields),
      priorities: toCsvStr(d.priorities),
      requirements: toCsvStr(d.requirements),
      min_grant: String(d.min_grant ?? 0),
      max_grant: String(d.max_grant ?? 0),
      currency: d.currency ?? "IDR",
      deadline: d.deadline ?? "",
      is_active: d.is_active ?? true,
    });
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nama donor wajib diisi.");
      return;
    }

    setIsSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      country: form.country.trim() || null,
      website: form.website.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      funding_fields: toArray(form.funding_fields),
      priorities: toArray(form.priorities),
      requirements: toArray(form.requirements),
      min_grant: Number(form.min_grant || 0),
      max_grant: Number(form.max_grant || 0),
      currency: form.currency.trim() || "IDR",
      deadline: form.deadline || null,
      is_active: form.is_active,
    };

    const { error } = form.id
      ? await supabase.from("donors").update(payload).eq("id", form.id)
      : await supabase.from("donors").insert(payload);

    setIsSaving(false);

    if (error) {
      toast.error("Gagal menyimpan donor: " + error.message);
      return;
    }

    await logAudit({
      action: form.id ? "admin.donor.update" : "admin.donor.create",
      entityType: "donor",
      entityId: form.id ?? null,
      newValues: payload,
    });
    void qc.invalidateQueries({ queryKey: ["admin-donors-full"] });
    toast.success(form.id ? "Data donor diperbarui." : "Donor baru berhasil ditambahkan.");
    setFormOpen(false);
  }

  async function softDelete(id: string) {
    if (!window.confirm("Arsipkan lembaga donor ini?")) return;
    await supabase
      .from("donors")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", id);
    await logAudit({ action: "admin.donor.archive", entityType: "donor", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-donors-full"] });
    toast.success("Lembaga donor diarsipkan.");
  }

  async function restore(id: string) {
    await supabase
      .from("donors")
      .update({ deleted_at: null } as never)
      .eq("id", id);
    await logAudit({ action: "admin.donor.restore", entityType: "donor", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-donors-full"] });
    toast.success("Lembaga donor dipulihkan.");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        if (parsed.length === 0) {
          toast.error("File Excel kosong.");
          return;
        }
        setImportRows(parsed);
        setImportOpen(true);
      } catch (err) {
        toast.error("Gagal membaca file Excel.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  async function processImport() {
    if (importRows.length === 0) return;
    setIsImporting(true);
    const toInsert = importRows
      .map((r) => ({
        name: String(r["Nama Donor"] || r["Nama"] || r["name"] || "").trim(),
        category: String(r["Kategori"] || r["category"] || "Lainnya").trim(),
        country: String(r["Negara"] || r["country"] || "Indonesia").trim(),
        website: String(r["Website"] || r["website"] || "").trim() || null,
        email: String(r["Email"] || r["email"] || "").trim() || null,
        phone: String(r["Telepon"] || r["phone"] || "").trim() || null,
        min_grant: Number(r["Nilai Min"] || r["min_grant"] || 0),
        max_grant: Number(r["Nilai Max"] || r["max_grant"] || 0),
        currency: String(r["Mata Uang"] || r["currency"] || "IDR").trim(),
        deadline: r["Deadline"] ? String(r["Deadline"]) : null,
        is_active: true,
      }))
      .filter((x) => x.name.length > 0);

    const { error } = await supabase.from("donors").insert(toInsert);
    setIsImporting(false);

    if (error) {
      toast.error("Gagal mengimpor data donor: " + error.message);
      return;
    }

    await logAudit({
      action: "admin.donor.import",
      entityType: "donor",
      newValues: { count: toInsert.length },
    });
    void qc.invalidateQueries({ queryKey: ["admin-donors-full"] });
    toast.success(`${toInsert.length} data donor berhasil diimpor.`);
    setImportOpen(false);
    setImportRows([]);
  }

  function exportXLSX() {
    const exportData = (
      selected.size > 0 ? filtered.filter((d) => selected.has(d.id)) : filtered
    ).map((d) => ({
      "Nama Donor": d.name,
      Kategori: d.category,
      Negara: d.country ?? "-",
      Website: d.website ?? "-",
      Email: d.email ?? "-",
      Telepon: d.phone ?? "-",
      "Nilai Min": Number(d.min_grant),
      "Nilai Max": Number(d.max_grant),
      "Mata Uang": d.currency,
      Deadline: d.deadline ?? "-",
      "Status Aktif": d.is_active ? "Ya" : "Tidak",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Donors");
    XLSX.writeFile(wb, `donors_admin_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${exportData.length} data donor diekspor.`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kelola Donor"
        description="Basis data lembaga donor, syarat, prioritas pendanaan, dan tenggat waktu."
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
            placeholder="Cari nama donor, kategori, negara, atau email…"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowArchived(!showArchived);
            setPage(0);
          }}
        >
          {showArchived ? "Sembunyikan Arsip" : "Tampilkan Arsip"}
        </Button>
        <div className="relative">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
            id="donor-excel-upload"
          />
          <Label htmlFor="donor-excel-upload">
            <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" asChild>
              <span>
                <Upload className="size-3.5" /> Import Excel
              </span>
            </Button>
          </Label>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportXLSX}>
          <Download className="size-3.5" /> Export XLSX
        </Button>
        <Button
          onClick={openCreate}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="size-4" /> Tambah Donor
        </Button>
      </div>

      {/* Table */}
      <div className="surface-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={rows.length > 0 && selected.size === rows.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("name")}
              >
                <span className="flex items-center gap-1">
                  Nama Donor <ArrowUpDown className="size-3 opacity-40" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("category")}
              >
                <span className="flex items-center gap-1">
                  Kategori <ArrowUpDown className="size-3 opacity-40" />
                </span>
              </TableHead>
              <TableHead>Negara</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("max_grant")}
              >
                <span className="flex items-center gap-1">
                  Max Grant <ArrowUpDown className="size-3 opacity-40" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("deadline")}
              >
                <span className="flex items-center gap-1">
                  Deadline <ArrowUpDown className="size-3 opacity-40" />
                </span>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <EmptyRow colSpan={8} label="Memuat data lembaga donor…" />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={8} label="Tidak ada donor yang cocok." />
            ) : (
              rows.map((d) => (
                <TableRow key={d.id} className={d.deleted_at ? "opacity-50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(d.id)}
                      onCheckedChange={() => toggleSelect(d.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium max-w-56 truncate">
                    <div>{d.name}</div>
                    {d.website && (
                      <a
                        href={d.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        {d.website} <ExternalLink className="size-2.5" />
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{d.category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.country ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {formatCurrency(d.max_grant, d.currency)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(d.deadline)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.is_active ? "default" : "secondary"}>
                      {d.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Edit donor"
                        onClick={() => openEdit(d)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Riwayat perubahan"
                        onClick={() => setHistoryDonorId(d.id)}
                      >
                        <History className="size-4" />
                      </Button>
                      {d.deleted_at ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Restore"
                          onClick={() => void restore(d.id)}
                        >
                          <RotateCcw className="size-4 text-blue-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Arsipkan"
                          onClick={() => void softDelete(d.id)}
                        >
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
          <span>
            Halaman {page + 1} dari {totalPages} ({filtered.length} donor)
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

      {/* Form Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Edit Lembaga Donor" : "Tambah Lembaga Donor Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>
                  Nama Donor <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Global Environment Facility"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Yayasan / Multilateral / Government"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Negara</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="Indonesia / AS / Jerman"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="grant@donor.org"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telepon Kontak</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+62 …"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Deadline Pengajuan</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nilai Minimum Grant</Label>
                <Input
                  type="number"
                  value={form.min_grant}
                  onChange={(e) => setForm({ ...form, min_grant: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nilai Maksimum Grant</Label>
                <Input
                  type="number"
                  value={form.max_grant}
                  onChange={(e) => setForm({ ...form, max_grant: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mata Uang</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm({ ...form, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">IDR (Rupiah)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.is_active ? "aktif" : "nonaktif"}
                  onValueChange={(v) => setForm({ ...form, is_active: v === "aktif" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Bidang Pendanaan (pisahkan koma)</Label>
                <Textarea
                  rows={2}
                  value={form.funding_fields}
                  onChange={(e) => setForm({ ...form, funding_fields: e.target.value })}
                  placeholder="Konservasi Hutan, Pertanian Berkelanjutan, Restorasi Gambut"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Prioritas Strategis (pisahkan koma)</Label>
                <Textarea
                  rows={2}
                  value={form.priorities}
                  onChange={(e) => setForm({ ...form, priorities: e.target.value })}
                  placeholder="Masyarakat Adat, Keadilan Gender, Kalimantan"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Persyaratan Berkas (pisahkan koma)</Label>
                <Textarea
                  rows={2}
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  placeholder="Akta Pendirian, Laporan Keuangan 2 Tahun, Proposal Teknis"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSaving ? "Menyimpan…" : "Simpan Donor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Preview Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Preview Impor Data Donor ({importRows.length} baris)</DialogTitle>
            <DialogDescription>
              Periksa sampel data yang akan diimpor dari file Excel.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto rounded border p-2 text-xs space-y-1">
            {importRows.slice(0, 5).map((r, i) => (
              <div key={i} className="p-2 border-b last:border-none flex flex-col gap-0.5">
                <span className="font-semibold text-foreground">
                  {String(r["Nama Donor"] || r["Nama"] || r["name"] || "-")}
                </span>
                <span className="text-muted-foreground">
                  {String(r["Kategori"] || r["category"] || "-")} · Max:{" "}
                  {String(r["Nilai Max"] || r["max_grant"] || "0")}
                </span>
              </div>
            ))}
            {importRows.length > 5 && (
              <p className="text-center text-muted-foreground py-2">
                …dan {importRows.length - 5} baris lainnya.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => void processImport()}
              disabled={isImporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isImporting ? "Mengimpor…" : `Impor ${importRows.length} Data`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit History Modal */}
      <Dialog
        open={!!historyDonorId}
        onOpenChange={(o) => {
          if (!o) setHistoryDonorId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5" /> Riwayat Perubahan Data
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {auditHistory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada riwayat audit tercatat.
              </p>
            ) : (
              auditHistory.map((h) => (
                <div key={h.id} className="p-3 border rounded-lg text-xs space-y-1">
                  <div className="font-semibold flex justify-between">
                    <span>{h.action}</span>
                    <span className="text-muted-foreground font-normal">
                      {formatDateTime(h.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
