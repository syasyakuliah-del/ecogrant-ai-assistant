import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Wallet,
  AlertCircle,
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
import { BUDGET_CATEGORIES, PROVINCES, UNITS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/sbu")({
  head: () => ({
    meta: [
      { title: "Kelola SBU — Admin EcoGrant AI" },
      {
        name: "description",
        content: "Master data Standar Biaya Umum (SBU) berbasis provinsi dan kabupaten/kota.",
      },
    ],
  }),
  component: AdminSbu,
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
  province_code: string;
  city_code: string;
  source: string;
  effective_from: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  year: "2026",
  version: "1.0",
  code: "",
  category: "Akomodasi",
  description: "",
  unit: "OH",
  price: "0",
  province_code: "DKI JAKARTA",
  city_code: "SEMUA",
  source: "Peraturan Gubernur DKI Jakarta 2026",
  effective_from: "2026-01-01",
  is_active: true,
};

type SortKey = "code" | "province_code" | "price" | "category";

function AdminSbu() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("semua");
  const [provinceFilter, setProvinceFilter] = useState("semua");
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

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-sbu-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sbu")
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
  const provinces = useMemo(
    () => Array.from(new Set(data.map((d) => d.province_code).filter(Boolean))),
    [data],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const result = data.filter((s) => {
      if (categoryFilter !== "semua" && s.category !== categoryFilter) return false;
      if (provinceFilter !== "semua" && s.province_code !== provinceFilter) return false;
      if (!term) return true;
      return [s.code, s.category, s.description, s.province_code, s.city_code].some((f) =>
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
  }, [data, q, categoryFilter, provinceFilter, sortKey, sortDir]);

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
      province_code: s.province_code,
      city_code: s.city_code ?? "SEMUA",
      source: s.source ?? "",
      effective_from: s.effective_from ?? "",
      is_active: s.is_active ?? true,
    });
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.description.trim() || !form.province_code.trim()) {
      toast.error("Kode, Uraian, dan Provinsi SBU wajib diisi.");
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
      province_code: form.province_code.trim().toUpperCase(),
      city_code: form.city_code.trim().toUpperCase() || "SEMUA",
      source: form.source.trim() || null,
      effective_from: form.effective_from || null,
      is_active: form.is_active,
    };

    // Duplicate check on (year, version, code, province_code, city_code)
    if (!form.id) {
      const dup = data.find(
        (x) =>
          x.year === payload.year &&
          x.version === payload.version &&
          x.code === payload.code &&
          x.province_code === payload.province_code &&
          x.city_code === payload.city_code,
      );
      if (dup) {
        setIsSaving(false);
        toast.error(
          `SBU dengan Kode ${payload.code}, Tahun ${payload.year}, Provinsi ${payload.province_code}, Kota ${payload.city_code} sudah ada.`,
        );
        return;
      }
    }

    const { error } = form.id
      ? await supabase.from("sbu").update(payload).eq("id", form.id)
      : await supabase.from("sbu").insert(payload);

    setIsSaving(false);

    if (error) {
      toast.error("Gagal menyimpan SBU: " + error.message);
      return;
    }

    await logAudit({
      action: form.id ? "admin.sbu.update" : "admin.sbu.create",
      entityType: "sbu",
      entityId: form.id ?? null,
      newValues: payload,
    });
    void qc.invalidateQueries({ queryKey: ["admin-sbu-full"] });
    toast.success(form.id ? "Data SBU diperbarui." : "SBU baru berhasil ditambahkan.");
    setFormOpen(false);
  }

  async function softDelete(id: string) {
    if (!window.confirm("Hapus item SBU ini?")) return;
    await supabase
      .from("sbu")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", id);
    await logAudit({ action: "admin.sbu.delete", entityType: "sbu", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-sbu-full"] });
    toast.success("Item SBU dihapus.");
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

        const errors: string[] = [];
        const seenKeys = new Set<string>();
        parsed.forEach((r, idx) => {
          const code = String(r["Kode"] || r["code"] || "")
            .trim()
            .toUpperCase();
          const year = Number(r["Tahun"] || r["year"] || 2026);
          const version = String(r["Versi"] || r["version"] || "1.0").trim();
          const prov = String(r["Provinsi"] || r["province_code"] || "")
            .trim()
            .toUpperCase();
          const city = String(r["Kota"] || r["city_code"] || "SEMUA")
            .trim()
            .toUpperCase();
          const price = Number(r["Harga"] || r["price"] || 0);

          if (!code) errors.push(`Baris ${idx + 2}: Kode kosong`);
          if (!prov) errors.push(`Baris ${idx + 2}: Provinsi kosong`);
          if (price < 0) errors.push(`Baris ${idx + 2}: Harga negatif`);

          const key = `${year}-${version}-${code}-${prov}-${city}`;
          if (seenKeys.has(key)) errors.push(`Baris ${idx + 2}: Duplikasi (${key})`);
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

  async function processImport() {
    if (importRows.length === 0) return;
    setIsImporting(true);
    const toInsert = importRows
      .map((r) => ({
        year: Number(r["Tahun"] || r["year"] || 2026),
        version: String(r["Versi"] || r["version"] || "1.0").trim(),
        code: String(r["Kode"] || r["code"] || "")
          .trim()
          .toUpperCase(),
        category: String(r["Kategori"] || r["category"] || "Akomodasi").trim(),
        description: String(r["Uraian"] || r["description"] || "").trim(),
        unit: String(r["Satuan"] || r["unit"] || "OH").trim(),
        price: Number(r["Harga"] || r["price"] || 0),
        province_code: String(r["Provinsi"] || r["province_code"] || "DKI JAKARTA")
          .trim()
          .toUpperCase(),
        city_code: String(r["Kota"] || r["city_code"] || "SEMUA")
          .trim()
          .toUpperCase(),
        source: r["Sumber"] ? String(r["Sumber"]) : null,
        is_active: true,
      }))
      .filter((x) => x.code.length > 0 && x.description.length > 0);

    const { error } = await supabase
      .from("sbu")
      .upsert(toInsert, { onConflict: "year,version,code,province_code,city_code" });
    setIsImporting(false);

    if (error) {
      toast.error("Gagal mengimpor SBU: " + error.message);
      return;
    }

    await logAudit({
      action: "admin.sbu.import",
      entityType: "sbu",
      newValues: { count: toInsert.length },
    });
    void qc.invalidateQueries({ queryKey: ["admin-sbu-full"] });
    toast.success(`${toInsert.length} item SBU berhasil diimpor & divalidasi.`);
    setImportOpen(false);
    setImportRows([]);
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
      Provinsi: s.province_code,
      "Kabupaten/Kota": s.city_code,
      Sumber: s.source ?? "-",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SBU");
    XLSX.writeFile(wb, `sbu_admin_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${exportData.length} item SBU diekspor.`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kelola SBU"
        description="Master data Standar Biaya Umum regional berbasis Provinsi dan Kota."
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
            placeholder="Cari kode, kategori, provinsi, atau uraian SBU…"
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
          value={provinceFilter}
          onValueChange={(v) => {
            setProvinceFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Provinsi</SelectItem>
            {provinces.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
            id="sbu-excel-upload"
          />
          <Label htmlFor="sbu-excel-upload">
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
          onClick={openCreate}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="size-4" /> Tambah SBU
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
                onClick={() => toggleSort("province_code")}
              >
                <span className="flex items-center gap-1">
                  Provinsi/Kota <ArrowUpDown className="size-3 opacity-40" />
                </span>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <EmptyRow colSpan={9} label="Memuat data SBU…" />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={9} label="Tidak ada item SBU yang cocok." />
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
                  <TableCell className="text-xs">
                    <div>{s.province_code}</div>
                    <div className="text-[10px] text-muted-foreground">{s.city_code}</div>
                  </TableCell>
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
                        title="Edit SBU"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Hapus SBU"
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
            Halaman {page + 1} dari {totalPages} ({filtered.length} SBU)
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
            <DialogTitle>{form.id ? "Edit Item SBU" : "Tambah Item SBU Baru"}</DialogTitle>
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
                  Kode SBU <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="SBU-100"
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
                  Uraian Standar SBU <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Penginapan Standar Pelaksana"
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Provinsi <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  value={form.province_code}
                  onChange={(e) => setForm({ ...form, province_code: e.target.value })}
                  placeholder="KALIMANTAN BARAT"
                />
              </div>
              <div className="space-y-1">
                <Label>Kabupaten / Kota</Label>
                <Input
                  value={form.city_code}
                  onChange={(e) => setForm({ ...form, city_code: e.target.value })}
                  placeholder="SEMUA / KOTA PONTIANAK"
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
              <div className="space-y-1 sm:col-span-2">
                <Label>Sumber Regulasi / Pergub</Label>
                <Input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="Peraturan Gubernur Kalimantan Barat 2026"
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
                {isSaving ? "Menyimpan…" : "Simpan SBU"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Preview Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-emerald-600" /> Preview Impor SBU ({importRows.length}{" "}
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
                    {String(r["Uraian"] || r["description"] || "")} (
                    {String(r["Provinsi"] || r["province_code"] || "")})
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
    </div>
  );
}
