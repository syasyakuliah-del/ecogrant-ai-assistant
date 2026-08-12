import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { AdminTable, AdminToolbar, EmptyRow } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/sbu")({
  head: () => ({
    meta: [
      { title: "Kelola SBU — Admin EcoGrant AI" },
      { name: "description", content: "Kelola Standar Biaya Umum regional per provinsi dan kota untuk validasi anggaran proposal." },
      { property: "og:title", content: "Kelola SBU — Admin EcoGrant AI" },
      { property: "og:description", content: "Master data Standar Biaya Umum regional pada EcoGrant AI." },
    ],
  }),
  component: AdminSbu,
});

type Form = {
  id?: string;
  year: string;
  code: string;
  category: string;
  description: string;
  unit: string;
  price: string;
  province_code: string;
  city_code: string;
};

const EMPTY: Form = {
  year: "2026",
  code: "",
  category: "",
  description: "",
  unit: "OH",
  price: "0",
  province_code: "",
  city_code: "SEMUA",
};

function AdminSbu() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-sbu"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sbu").select("*").is("deleted_at", null).order("code").limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const term = q.trim().toLowerCase();
  const rows = data.filter(
    (s) => !term || [s.code, s.category, s.description, s.province_code].some((f) => (f ?? "").toLowerCase().includes(term)),
  );

  async function save() {
    const payload = {
      year: Number(form.year || 2026),
      code: form.code.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      unit: form.unit.trim(),
      price: Number(form.price || 0),
      province_code: form.province_code.trim(),
      city_code: form.city_code.trim() || "SEMUA",
    };
    if (!payload.code || !payload.description || !payload.province_code) {
      toast.error("Kode, uraian, dan provinsi wajib diisi.");
      return;
    }
    const { error } = form.id ? await supabase.from("sbu").update(payload).eq("id", form.id) : await supabase.from("sbu").insert(payload);
    if (error) {
      toast.error("Data SBU gagal disimpan.");
      return;
    }
    await logAudit({ action: form.id ? "admin.sbu.update" : "admin.sbu.create", entityType: "sbu", entityId: form.id ?? null });
    setOpen(false);
    setForm(EMPTY);
    void qc.invalidateQueries({ queryKey: ["admin-sbu"] });
    toast.success("Data SBU tersimpan.");
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus item SBU ini?")) return;
    await supabase.from("sbu").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    await logAudit({ action: "admin.sbu.delete", entityType: "sbu", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-sbu"] });
  }

  function exportXlsx() {
    const ws = XLSX.utils.json_to_sheet(
      rows.map((s) => ({
        Tahun: s.year,
        Kode: s.code,
        Kategori: s.category,
        Uraian: s.description,
        Satuan: s.unit,
        Harga: Number(s.price),
        Provinsi: s.province_code,
        Kota: s.city_code,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SBU");
    XLSX.writeFile(wb, "standar-biaya-umum.xlsx");
  }

  return (
    <div>
      <PageHeader
        title="Kelola SBU"
        description="Standar Biaya Umum regional per provinsi dan kota."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportXlsx}>
              <Download className="size-4" /> Ekspor
            </Button>
            <Button
              onClick={() => {
                setForm(EMPTY);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Tambah
            </Button>
          </div>
        }
      />

      <AdminToolbar query={q} onQueryChange={setQ} placeholder="Cari kode, kategori, atau provinsi" />

      <AdminTable headers={["Kode", "Kategori", "Uraian", "Satuan", "Harga", "Provinsi", "Aksi"]}>
        {isLoading ? (
          <EmptyRow colSpan={7} label="Memuat data SBU…" />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={7} label="Belum ada data SBU." />
        ) : (
          rows.slice(0, 300).map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.code}</TableCell>
              <TableCell className="text-muted-foreground">{s.category}</TableCell>
              <TableCell className="max-w-72 truncate">{s.description}</TableCell>
              <TableCell>{s.unit}</TableCell>
              <TableCell>{formatCurrency(s.price)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.province_code}</TableCell>
              <TableCell className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ubah item"
                  onClick={() => {
                    setForm({
                      id: s.id,
                      year: String(s.year),
                      code: s.code,
                      category: s.category,
                      description: s.description,
                      unit: s.unit,
                      price: String(s.price),
                      province_code: s.province_code,
                      city_code: s.city_code,
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Hapus item" onClick={() => void remove(s.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </AdminTable>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Ubah Item SBU" : "Tambah Item SBU"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="u-year">Tahun</Label>
              <Input id="u-year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-code">Kode</Label>
              <Input id="u-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-cat">Kategori</Label>
              <Input id="u-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-unit">Satuan</Label>
              <Input id="u-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-price">Harga Satuan</Label>
              <Input id="u-price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-prov">Kode Provinsi</Label>
              <Input id="u-prov" value={form.province_code} onChange={(e) => setForm({ ...form, province_code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-city">Kode Kota</Label>
              <Input id="u-city" value={form.city_code} onChange={(e) => setForm({ ...form, city_code: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="u-desc">Uraian</Label>
              <Input id="u-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void save()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}