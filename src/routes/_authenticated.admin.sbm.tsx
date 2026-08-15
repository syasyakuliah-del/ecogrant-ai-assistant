import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  FileSpreadsheet,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Upload,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { AdminToolbar, EmptyRow } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { BUDGET_CATEGORIES, UNITS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/sbm")({
  head: () => ({
    meta: [
      { title: "Kelola SBM — Admin EcoGrant AI" },
      {
        name: "description",
        content: "Master data Standar Biaya Masukan (SBM) untuk acuan validasi RAB.",
      },
    ],
  }),
  component: AdminSbm,
});

const PAGE_SIZE = 25;

type FormState = {
  id?: string;
  year: string;
  version: string;
  code: string;
  category: string;
  description: string;
  unit: string;
  price: string;
  region_code: string;
  regulation_source: string;
  effective_from: string;
  effective_until: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  year: "2026",
  version: "1.0",
  code: "",
  category: "Honorarium",
  description: "",
  unit: "OJ",
  price: "0",
  region_code: "NASIONAL",
  regulation_source: "PMK Standar Biaya Masukan 2026",
  effective_from: "2026-01-01",
  effective_until: "2026-12-31",
  is_active: true,
};

type SortKey = "code" | "category" | "price" | "region_code";

function parseSbmRow(r: Record<string, unknown>) {
  let year = 2026;
  let version = "1.0";

  const rawThnVer = String(r["Thn/Ver"] || r["thn/ver"] || r["THN/VER"] || r["Thn"] || "").trim();
  if (rawThnVer) {
    const parts = rawThnVer.split("/");
    if (parts[0]) year = Number(parts[0].replace(/\D/g, "")) || 2026;
    if (parts[1]) version = parts[1].trim() || "1.0";
  } else {
    year = Number(r["Tahun"] || r["tahun"] || r["year"] || 2026);
    version = String(r["Versi"] || r["versi"] || r["version"] || "1.0").trim();
  }

  const code = String(r["Kode"] || r["kode"] || r["code"] || "").trim().toUpperCase();
  const category = String(r["Kategori"] || r["kategori"] || r["category"] || "Honorarium").trim();
  const description = String(r["Uraian"] || r["uraian"] || r["description"] || "").trim();
  const unit = String(r["Satuan"] || r["satuan"] || r["unit"] || "OJ").trim();

  let rawPrice = r["Harga"] ?? r["harga"] ?? r["price"] ?? r["Harga Satuan"] ?? 0;
  if (typeof rawPrice === "string") {
    rawPrice = Number(rawPrice.replace(/[^0-9.-]+/g, "")) || 0;
  }
  const price = Number(rawPrice) || 0;

  const region_code = String(
    r["Wilayah"] || r["wilayah"] || r["region"] || r["region_code"] || "NASIONAL"
  )
    .trim()
    .toUpperCase();

  const regulation_source = r["Sumber Regulasi"]
    ? String(r["Sumber Regulasi"])
    : "Permenhut No. 32 Tahun 2025 (SBM 2026)";

  return { year, version, code, category, description, unit, price, region_code, regulation_source };
}

function AdminSbm() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("semua");
  const [regionFilter, setRegionFilter] = useState("semua");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Form Modal
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Import Modal
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Version Bump Modal
  const [versionBumpOpen, setVersionBumpOpen] = useState(false);
  const [targetYear, setTargetYear] = useState("2027");
  const [targetVersion, setTargetVersion] = useState("1.0");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-sbm-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sbm")
        .select("*")
        .is("deleted_at", null)
        .order("code")
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const categories = useMemo(
    () => Array.from(new Set(data.map((d) => d.category).filter(Boolean))),
    [data],
  );
  const regions = useMemo(
    () => Array.from(new Set(data.map((d) => d.region_code).filter(Boolean))),
    [data],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const result = data.filter((s) => {
      if (categoryFilter !== "semua" && s.category !== categoryFilter) return false;
      if (regionFilter !== "semua" && s.region_code !== regionFilter) return false;
      if (!term) return true;
      return [s.code, s.category, s.description, s.region_code].some((f) =>
        (f ?? "").toLowerCase().includes(term),
      );
    });
    result.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (sortKey === "price")
        return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      const cmp = String(av).localeCompare(String(bv), "id");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [data, q, categoryFilter, regionFilter, sortKey, sortDir]);

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

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(s: (typeof data)[number]) {
    setForm({
      id: s.id,
      year: String(s.year),
      version: s.version ?? "1.0",
      code: s.code,
      category: s.category,
      description: s.description,
      unit: s.unit,
      price: String(s.price),
      region_code: s.region_code ?? "NASIONAL",
      regulation_source: s.regulation_source ?? "",
      effective_from: s.effective_from ?? "",
      effective_until: s.effective_until ?? "",
      is_active: s.is_active ?? true,
    });
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.description.trim()) {
      toast.error("Kode dan uraian SBM wajib diisi.");
      return;
    }

    setIsSaving(true);
    const payload = {
      year: Number(form.year || 2026),
      version: form.version.trim() || "1.0",
      code: form.code.trim().toUpperCase(),
      category: form.category.trim(),
      description: form.description.trim(),
      unit: form.unit.trim(),
      price: Number(form.price || 0),
      region_code: form.region_code.trim().toUpperCase() || "NASIONAL",
      regulation_source: form.regulation_source.trim() || null,
      effective_from: form.effective_from || null,
      effective_until: form.effective_until || null,
      is_active: form.is_active,
    };

    // Duplicate check on (year, version, code, region_code)
    if (!form.id) {
      const dup = data.find(
        (x) =>
          x.year === payload.year &&
          x.version === payload.version &&
          x.code === payload.code &&
          x.region_code === payload.region_code,
      );
      if (dup) {
        setIsSaving(false);
        toast.error(
          `SBM dengan Kode ${payload.code}, Tahun ${payload.year}, Versi ${payload.version}, Wilayah ${payload.region_code} sudah ada.`,
        );
        return;
      }
    }

    const { error } = form.id
      ? await supabase.from("sbm").update(payload).eq("id", form.id)
      : await supabase.from("sbm").insert(payload);

    setIsSaving(false);

    if (error) {
      toast.error("Gagal menyimpan SBM: " + error.message);
      return;
    }

    await logAudit({
      action: form.id ? "admin.sbm.update" : "admin.sbm.create",
      entityType: "sbm",
      entityId: form.id ?? null,
      newValues: payload,
    });
    void qc.invalidateQueries({ queryKey: ["admin-sbm-full"] });
    toast.success(form.id ? "Data SBM diperbarui." : "SBM baru berhasil ditambahkan.");
    setFormOpen(false);
  }

  async function softDelete(id: string) {
    if (!window.confirm("Hapus item SBM ini?")) return;
    await supabase
      .from("sbm")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", id);
    await logAudit({ action: "admin.sbm.delete", entityType: "sbm", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-sbm-full"] });
    toast.success("Item SBM dihapus.");
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

        // Validate duplicates & errors
        const errors: string[] = [];
        const seenKeys = new Set<string>();
        parsed.forEach((r, idx) => {
          const row = parseSbmRow(r);

          if (!row.code) errors.push(`Baris ${idx + 2}: Kode kosong`);
          if (!row.description) errors.push(`Baris ${idx + 2}: Uraian kosong`);
          if (row.price < 0) errors.push(`Baris ${idx + 2}: Harga negatif (${row.price})`);

          const key = `${row.year}-${row.version}-${row.code}-${row.region_code}`;
          if (seenKeys.has(key)) errors.push(`Baris ${idx + 2}: Duplikasi dalam file (${key})`);
          seenKeys.add(key);
        });

        setImportRows(parsed);
        setImportErrors(errors);
        setImportOpen(true);
      } catch (err) {
        toast.error("Gagal membaca file Excel.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  function downloadTemplate() {
    const templateData = [
      {
        "Thn/Ver": "2026 / 1.0",
        Kode: "SBM-2026-001",
        Kategori: "Honorarium",
        Uraian: "Honorarium Narasumber Pakar / Pejabat Eselon I",
        Satuan: "OJ",
        Harga: 1400000,
        Wilayah: "NASIONAL",
        "Sumber Regulasi": "Permenhut No. 32 Tahun 2025 / PMK SBM 2026",
      },
      {
        "Thn/Ver": "2026 / 1.0",
        Kode: "SBM-2026-002",
        Kategori: "Perjalanan Dinas",
        Uraian: "Satuan Biaya Transpor Lokal DKI Jakarta",
        Satuan: "Kali",
        Harga: 150000,
        Wilayah: "DKI JAKARTA",
        "Sumber Regulasi": "Permenhut No. 32 Tahun 2025 / PMK SBM 2026",
      },
      {
        "Thn/Ver": "2026 / 1.0",
        Kode: "SBM-2026-003",
        Kategori: "Konsumsi",
        Uraian: "Satuan Biaya Konsumsi Rapat Koordinasi (Makan + Snack)",
        Satuan: "OP",
        Harga: 110000,
        Wilayah: "JAWA BARAT",
        "Sumber Regulasi": "Permenhut No. 32 Tahun 2025 / PMK SBM 2026",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template SBM 2026");
    XLSX.writeFile(wb, "Template_SBM_Kemenhut_2026.xlsx");
    toast.success("Template Excel SBM 2026 berhasil diunduh.");
  }

  async function processImport() {
    if (importRows.length === 0) return;
    setIsImporting(true);
    const toInsert = importRows
      .map((r) => {
        const row = parseSbmRow(r);
        return {
          year: row.year,
          version: row.version,
          code: row.code,
          category: row.category,
          description: row.description,
          unit: row.unit,
          price: row.price,
          region_code: row.region_code,
          regulation_source: row.regulation_source,
          is_active: true,
        };
      })
      .filter((x) => x.code.length > 0 && x.description.length > 0);

    const { error } = await supabase
      .from("sbm")
      .upsert(toInsert, { onConflict: "year,version,code,region_code" });
    setIsImporting(false);

    if (error) {
      toast.error("Gagal mengimpor data SBM: " + error.message);
      return;
    }

    await logAudit({
      action: "admin.sbm.import",
      entityType: "sbm",
      newValues: { count: toInsert.length },
    });
    void qc.invalidateQueries({ queryKey: ["admin-sbm-full"] });
    toast.success(`${toInsert.length} item SBM berhasil diimpor & divalidasi.`);
    setImportOpen(false);
    setImportRows([]);
    setImportErrors([]);
  }

  function exportXLSX() {
    const exportData = filtered.map((s) => ({
      Tahun: s.year,
      Versi: s.version,
      Kode: s.code,
      Kategori: s.category,
      Uraian: s.description,
      Satuan: s.unit,
      Harga: Number(s.price),
      Wilayah: s.region_code,
      "Sumber Regulasi": s.regulation_source ?? "-",
      "Tanggal Berlaku": s.effective_from ?? "-",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SBM");
    XLSX.writeFile(wb, `sbm_admin_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${exportData.length} item SBM diekspor.`);
  }

  async function handleVersionBump() {
    if (!targetYear || !targetVersion) return;
    const activeItems = data.filter((d) => d.is_active && !d.deleted_at);
    if (activeItems.length === 0) {
      toast.error("Tidak ada data SBM aktif untuk disalin.");
      return;
    }

    const newVersionItems = activeItems.map((item) => ({
      year: Number(targetYear),
      version: targetVersion.trim(),
      code: item.code,
      category: item.category,
      description: item.description,
      unit: item.unit,
      price: item.price,
      region_code: item.region_code,
      regulation_source: item.regulation_source,
      is_active: true,
    }));

    const { error } = await supabase
      .from("sbm")
      .upsert(newVersionItems, { onConflict: "year,version,code,region_code" });
    if (error) {
      toast.error("Gagal menyalin versi SBM: " + error.message);
      return;
    }

    await logAudit({
      action: "admin.sbm.version_bump",
      entityType: "sbm",
      newValues: { targetYear, targetVersion, count: newVersionItems.length },
    });
    void qc.invalidateQueries({ queryKey: ["admin-sbm-full"] });
    toast.success(
      `Versi SBM baru (${targetYear} v${targetVersion}) berhasil dibuat dengan ${newVersionItems.length} item.`,
    );
    setVersionBumpOpen(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kelola SBM"
        description="Master data Standar Biaya Masukan — acuan resmi harga satuan RAB."
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
            placeholder="Cari kode, kategori, atau uraian SBM…"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
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
        <Select
          value={regionFilter}
          onValueChange={(v) => {
            setRegionFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Wilayah</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
          <FileSpreadsheet className="size-3.5 text-emerald-600" /> Unduh Template
        </Button>
        <div className="relative">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
            id="sbm-excel-upload"
          />
          <Label htmlFor="sbm-excel-upload">
            <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" asChild>
              <span>
                <Upload className="size-3.5" /> Import Excel
              </span>
            </Button>
          </Label>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportXLSX}>
          <Download className="size-3.5" /> Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setVersionBumpOpen(true)}
        >
          <Layers className="size-3.5" /> Versioning
        </Button>
        <Button
          onClick={openCreate}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="size-4" /> Tambah SBM
        </Button>
      </div>

      {/* Table */}
      <div className="surface-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Thn/Ver</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("code")}
              >
                <span className="flex items-center gap-1">
                  Kode <ArrowUpDown className="size-3 opacity-40" />
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
              <TableHead>Uraian</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("price")}
              >
                <span className="flex items-center gap-1">
                  Harga Satuan <ArrowUpDown className="size-3 opacity-40" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("region_code")}
              >
                <span className="flex items-center gap-1">
                  Wilayah <ArrowUpDown className="size-3 opacity-40" />
                </span>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <EmptyRow colSpan={9} label="Memuat data SBM…" />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={9} label="Tidak ada item SBM yang cocok." />
            ) : (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {s.year} v{s.version}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {s.code}
                  </TableCell>
                  <TableCell className="text-sm">{s.category}</TableCell>
                  <TableCell className="text-sm max-w-64 truncate">{s.description}</TableCell>
                  <TableCell className="text-sm">{s.unit}</TableCell>
                  <TableCell className="font-mono text-sm">{formatCurrency(s.price)}</TableCell>
                  <TableCell className="text-xs">{s.region_code}</TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? "default" : "secondary"}>
                      {s.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Edit SBM"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Hapus SBM"
                        onClick={() => void softDelete(s.id)}
                      >
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
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
            Halaman {page + 1} dari {totalPages} ({filtered.length} SBM)
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Item SBM" : "Tambah Item SBM Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>
                  Tahun <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Versi</Label>
                <Input
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  placeholder="1.0"
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Kode SBM <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="SBM-001"
                />
              </div>
              <div className="space-y-1">
                <Label>Kategori</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>
                  Uraian Kegiatan / Standar <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Honorarium Narasumber Pejabat Eselon II"
                />
              </div>
              <div className="space-y-1">
                <Label>Satuan</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>
                  Harga Satuan (IDR) <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Kode Wilayah</Label>
                <Input
                  value={form.region_code}
                  onChange={(e) => setForm({ ...form, region_code: e.target.value })}
                  placeholder="NASIONAL"
                />
              </div>
              <div className="space-y-1">
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
              <div className="space-y-1 sm:col-span-2">
                <Label>Sumber Regulasi</Label>
                <Input
                  value={form.regulation_source}
                  onChange={(e) => setForm({ ...form, regulation_source: e.target.value })}
                  placeholder="PMK Standar Biaya Masukan 2026"
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
                {isSaving ? "Menyimpan…" : "Simpan SBM"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Preview & Error Report Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="size-5 text-emerald-600" /> Preview Impor SBM ({importRows.length}{" "}
              baris)
            </DialogTitle>
          </DialogHeader>
          {importErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs space-y-1 max-h-32 overflow-y-auto">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="size-4" /> Temuan Peringatan/Duplikasi (
                {importErrors.length}):
              </div>
              {importErrors.map((err, idx) => (
                <div key={idx}>· {err}</div>
              ))}
            </div>
          )}
          <div className="max-h-56 overflow-y-auto rounded border p-2 text-xs space-y-1">
            {importRows.slice(0, 5).map((r, i) => (
              <div
                key={i}
                className="p-2 border-b last:border-none flex justify-between items-center"
              >
                <div>
                  <span className="font-mono font-semibold text-emerald-700">
                    {String(r["Kode"] || r["code"] || "")}
                  </span>
                  <p className="text-muted-foreground">
                    {String(r["Uraian"] || r["description"] || "")}
                  </p>
                </div>
                <span className="font-mono font-medium">
                  {formatCurrency(Number(r["Harga"] || r["price"] || 0))}
                </span>
              </div>
            ))}
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
              {isImporting ? "Mengimpor…" : `Impor & Override ${importRows.length} Data`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Bump Modal */}
      <Dialog open={versionBumpOpen} onOpenChange={setVersionBumpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-emerald-600" /> Replikasi Versi Standar SBM
            </DialogTitle>
            <DialogDescription>
              Salin seluruh standar SBM aktif ke tahun/versi standar baru.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Tahun Standar Baru</Label>
              <Input
                type="number"
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                placeholder="2027"
              />
            </div>
            <div className="space-y-1">
              <Label>Versi Baru</Label>
              <Input
                value={targetVersion}
                onChange={(e) => setTargetVersion(e.target.value)}
                placeholder="1.0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionBumpOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => void handleVersionBump()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Buat Versi Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
