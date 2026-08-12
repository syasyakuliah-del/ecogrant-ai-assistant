import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import {
  ArrowUpDown, ChevronLeft, ChevronRight, Download, Leaf, Link2,
  Pencil, Plus, Trash2, Upload,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { AdminToolbar, EmptyRow } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BUDGET_CATEGORIES, PROGRAM_CATEGORIES, UNITS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin/activities")({
  head: () => ({
    meta: [
      { title: "Kelola Kegiatan — Admin EcoGrant AI" },
      { name: "description", content: "Katalog kegiatan standar beserta pemetaan ke LFA dan kategori anggaran RAB." },
    ],
  }),
  component: AdminActivities,
});

const PAGE_SIZE = 25;

type FormState = {
  id?: string;
  category: string;
  sub_category: string;
  name: string;
  description: string;
  default_output: string;
  default_indicator: string;
  target_unit: string;
  lfa_level: string;
  budget_category: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  category: "Konservasi Keanekaragaman Hayati",
  sub_category: "Patroli",
  name: "",
  description: "",
  default_output: "",
  default_indicator: "",
  target_unit: "kegiatan",
  lfa_level: "activity",
  budget_category: "Operasional",
  is_active: true,
};

type SortKey = "name" | "category" | "lfa_level" | "budget_category";

function AdminActivities() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("semua");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Form Modal
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Import Modal
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-activities-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").order("category").limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const categories = useMemo(() => Array.from(new Set(data.map((d) => d.category).filter(Boolean))), [data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let result = data.filter((a) => {
      if (categoryFilter !== "semua" && a.category !== categoryFilter) return false;
      if (!term) return true;
      return [a.name, a.category, a.sub_category, a.description, a.default_output].some((f) => (f ?? "").toLowerCase().includes(term));
    });
    result.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), "id");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [data, q, categoryFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }, [sortKey]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(a: (typeof data)[number]) {
    setForm({
      id: a.id,
      category: a.category,
      sub_category: a.sub_category ?? "",
      name: a.name,
      description: a.description ?? "",
      default_output: a.default_output ?? "",
      default_indicator: a.default_indicator ?? "",
      target_unit: a.target_unit ?? "kegiatan",
      lfa_level: a.lfa_level ?? "activity",
      budget_category: a.budget_category ?? "Operasional",
      is_active: a.is_active ?? true,
    });
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nama kegiatan wajib diisi."); return; }

    setIsSaving(true);
    const payload = {
      category: form.category.trim(),
      sub_category: form.sub_category.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || "",
      default_output: form.default_output.trim() || null,
      default_indicator: form.default_indicator.trim() || null,
      target_unit: form.target_unit.trim() || "kegiatan",
      lfa_level: form.lfa_level.trim() || "activity",
      budget_category: form.budget_category.trim() || "Operasional",
      is_active: form.is_active,
    };

    const { error } = form.id
      ? await supabase.from("activities").update(payload).eq("id", form.id)
      : await supabase.from("activities").insert(payload);

    setIsSaving(false);

    if (error) { toast.error("Gagal menyimpan kegiatan: " + error.message); return; }

    await logAudit({ action: form.id ? "admin.activity.update" : "admin.activity.create", entityType: "activity", entityId: form.id ?? null, newValues: payload });
    void qc.invalidateQueries({ queryKey: ["admin-activities-full"] });
    toast.success(form.id ? "Data kegiatan diperbarui." : "Kegiatan baru berhasil ditambahkan.");
    setFormOpen(false);
  }

  async function softDelete(id: string) {
    if (!window.confirm("Hapus data kegiatan ini?")) return;
    await supabase.from("activities").delete().eq("id", id);
    await logAudit({ action: "admin.activity.delete", entityType: "activity", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-activities-full"] });
    toast.success("Kegiatan dihapus.");
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
        if (parsed.length === 0) { toast.error("File Excel kosong."); return; }
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
    const toInsert = importRows.map((r) => ({
      category: String(r["Kategori"] || r["category"] || "Umum").trim(),
      sub_category: String(r["Sub Kategori"] || r["sub_category"] || "").trim() || null,
      name: String(r["Nama Kegiatan"] || r["Nama"] || r["name"] || "").trim(),
      description: String(r["Deskripsi"] || r["description"] || "").trim(),
      default_output: r["Default Output"] ? String(r["Default Output"]) : null,
      default_indicator: r["Default Indikator"] ? String(r["Default Indikator"]) : null,
      target_unit: String(r["Satuan"] || r["target_unit"] || "kegiatan").trim(),
      lfa_level: String(r["Level LFA"] || r["lfa_level"] || "activity").trim(),
      budget_category: String(r["Kategori RAB"] || r["budget_category"] || "Operasional").trim(),
      is_active: true,
    })).filter((x) => x.name.length > 0);

    const { error } = await supabase.from("activities").insert(toInsert);
    setIsImporting(false);

    if (error) { toast.error("Gagal mengimpor kegiatan: " + error.message); return; }

    await logAudit({ action: "admin.activity.import", entityType: "activity", newValues: { count: toInsert.length } });
    void qc.invalidateQueries({ queryKey: ["admin-activities-full"] });
    toast.success(`${toInsert.length} data kegiatan berhasil diimpor.`);
    setImportOpen(false);
    setImportRows([]);
  }

  function exportXLSX() {
    const exportData = filtered.map((a) => ({
      Kategori: a.category,
      "Sub Kategori": a.sub_category ?? "-",
      "Nama Kegiatan": a.name,
      Deskripsi: a.description ?? "-",
      "Default Output": a.default_output ?? "-",
      "Default Indikator": a.default_indicator ?? "-",
      Satuan: a.target_unit,
      "Level LFA": a.lfa_level,
      "Kategori RAB": a.budget_category,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Activities");
    XLSX.writeFile(wb, `activities_admin_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${exportData.length} kegiatan diekspor.`);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Kelola Kegiatan" description="Katalog kegiatan standar untuk otomatisasi penyusunan LFA dan RAB." />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-56">
          <AdminToolbar query={q} onQueryChange={(v) => { setQ(v); setPage(0); }} placeholder="Cari nama kegiatan, kategori, atau deskripsi…" />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kategori</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" id="act-excel-upload" />
          <Label htmlFor="act-excel-upload">
            <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" asChild>
              <span><Upload className="size-3.5" /> Import Excel</span>
            </Button>
          </Label>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportXLSX}><Download className="size-3.5" /> Export</Button>
        <Button onClick={openCreate} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="size-4" /> Tambah Kegiatan</Button>
      </div>

      {/* Table */}
      <div className="surface-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => toggleSort("name")}>
                <span className="flex items-center gap-1">Nama Kegiatan <ArrowUpDown className="size-3 opacity-40" /></span>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => toggleSort("category")}>
                <span className="flex items-center gap-1">Kategori <ArrowUpDown className="size-3 opacity-40" /></span>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => toggleSort("lfa_level")}>
                <span className="flex items-center gap-1">Mapping LFA <ArrowUpDown className="size-3 opacity-40" /></span>
              </TableHead>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => toggleSort("budget_category")}>
                <span className="flex items-center gap-1">Mapping RAB <ArrowUpDown className="size-3 opacity-40" /></span>
              </TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <EmptyRow colSpan={7} label="Memuat data kegiatan…" />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7} label="Tidak ada kegiatan yang cocok." />
            ) : (
              rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium max-w-64 truncate">
                    <div>{a.name}</div>
                    {a.sub_category && <span className="text-[11px] text-muted-foreground">{a.sub_category}</span>}
                  </TableCell>
                  <TableCell className="text-sm">{a.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs"><Link2 className="size-2.5 mr-1" /> {a.lfa_level}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{a.budget_category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.target_unit}</TableCell>
                  <TableCell><Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8" title="Edit kegiatan" onClick={() => openEdit(a)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="size-8" title="Hapus kegiatan" onClick={() => void softDelete(a.id)}><Trash2 className="size-4 text-red-500" /></Button>
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
          <span>Halaman {page + 1} dari {totalPages} ({filtered.length} kegiatan)</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Master Kegiatan" : "Tambah Master Kegiatan Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Nama Kegiatan <span className="text-red-500">*</span></Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pelatihan Kelompok Tani Hutan" />
              </div>
              <div className="space-y-1">
                <Label>Kategori Program</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROGRAM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Sub Kategori</Label>
                <Input value={form.sub_category} onChange={(e) => setForm({ ...form, sub_category: e.target.value })} placeholder="Pelatihan / Penanaman / Patroli" />
              </div>
              <div className="space-y-1">
                <Label>Mapping Level LFA</Label>
                <Select value={form.lfa_level} onValueChange={(v) => setForm({ ...form, lfa_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goal">Goal (Dampak Utama)</SelectItem>
                    <SelectItem value="outcome">Outcome (Capaian Hasil)</SelectItem>
                    <SelectItem value="output">Output (Hasil Langsung)</SelectItem>
                    <SelectItem value="activity">Activity (Aktivitas Lapangan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Mapping Kategori RAB</Label>
                <Select value={form.budget_category} onValueChange={(v) => setForm({ ...form, budget_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUDGET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Deskripsi Kegiatan</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Penjelasan singkat aktivitas lapangan…" />
              </div>
              <div className="space-y-1">
                <Label>Default Output</Label>
                <Input value={form.default_output} onChange={(e) => setForm({ ...form, default_output: e.target.value })} placeholder="Kapasitas peserta meningkat" />
              </div>
              <div className="space-y-1">
                <Label>Default Indikator</Label>
                <Input value={form.default_indicator} onChange={(e) => setForm({ ...form, default_indicator: e.target.value })} placeholder="Jumlah peserta terlatih" />
              </div>
              <div className="space-y-1">
                <Label>Satuan Target</Label>
                <Select value={form.target_unit} onValueChange={(v) => setForm({ ...form, target_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.is_active ? "aktif" : "nonaktif"} onValueChange={(v) => setForm({ ...form, is_active: v === "aktif" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{isSaving ? "Menyimpan…" : "Simpan Kegiatan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Preview Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Leaf className="size-5 text-emerald-600" /> Preview Impor Kegiatan ({importRows.length} baris)</DialogTitle>
          </DialogHeader>
          <div className="max-h-56 overflow-y-auto rounded border p-2 text-xs space-y-1">
            {importRows.slice(0, 5).map((r, i) => (
              <div key={i} className="p-2 border-b last:border-none flex justify-between items-center">
                <div>
                  <span className="font-semibold">{String(r["Nama Kegiatan"] || r["Nama"] || r["name"] || "")}</span>
                  <p className="text-muted-foreground">{String(r["Kategori"] || r["category"] || "")} · LFA: {String(r["Level LFA"] || r["lfa_level"] || "activity")}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Batal</Button>
            <Button onClick={() => void processImport()} disabled={isImporting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isImporting ? "Mengimpor…" : `Impor ${importRows.length} Data`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}