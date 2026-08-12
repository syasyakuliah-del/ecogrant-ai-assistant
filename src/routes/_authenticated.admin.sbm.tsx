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

export const Route = createFileRoute("/_authenticated/admin/sbm")({
  head: () => ({
    meta: [
      { title: "Kelola SBM — Admin EcoGrant AI" },
      { name: "description", content: "Kelola Standar Biaya Masukan sebagai acuan validasi harga satuan Rencana Anggaran Biaya." },
      { property: "og:title", content: "Kelola SBM — Admin EcoGrant AI" },
      { property: "og:description", content: "Master data Standar Biaya Masukan pada EcoGrant AI." },
    ],
  }),
  component: AdminSbm,
});

type Form = {
  id?: string;
  year: string;
  code: string;
  category: string;
  description: string;
  unit: string;
  price: string;
  region_code: string;
};

const EMPTY: Form = { year: "2026", code: "", category: "", description: "", unit: "OJ", price: "0", region_code: "NASIONAL" };

function AdminSbm() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-sbm"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sbm").select("*").is("deleted_at", null).order("code").limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const term = q.trim().toLowerCase();
  const rows = data.filter((s) => !term || [s.code, s.category, s.description, s.region_code].some((f) => (f ?? "").toLowerCase().includes(term)));

  async function save() {
    const payload = {
      year: Number(form.year || 2026),
      code: form.code.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      unit: form.unit.trim(),
      price: Number(form.price || 0),
      region_code: form.region_code.trim() || "NASIONAL",
    };
    if (!payload.code || !payload.description) {
      toast.error("Kode dan uraian wajib diisi.");
      return;
    }
    const { error } = form.id ? await supabase.from("sbm").update(payload).eq("id", form.id) : await supabase.from("sbm").insert(payload);
    if (error) {
      toast.error("Data SBM gagal disimpan.");
      return;
    }
    await logAudit({ action: form.id ? "admin.sbm.update" : "admin.sbm.create", entityType: "sbm", entityId: form.id ?? null });
    setOpen(false);
    setForm(EMPTY);
    void qc.invalidateQueries({ queryKey: ["admin-sbm"] });
    toast.success("Data SBM tersimpan.");
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus item SBM ini?")) return;
    await supabase.from("sbm").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    await logAudit({ action: "admin.sbm.delete", entityType: "sbm", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-sbm"] });
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
        Wilayah: s.region_code,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SBM");
    XLSX.writeFile(wb, "standar-biaya-masukan.xlsx");
  }

  return (
    <div>
      <PageHeader
        title="Kelola SBM"
        description="Standar Biaya Masukan sebagai acuan validasi harga satuan."
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

      <AdminToolbar query={q} onQueryChange={setQ} placeholder="Cari kode, kategori, atau uraian" />

      <AdminTable headers={["Kode", "Kategori", "Uraian", "Satuan", "Harga", "Wilayah", "Aksi"]}>
        {isLoading ? (
          <EmptyRow colSpan={7} label="Memuat data SBM…" />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={7} label="Belum ada data SBM." />
        ) : (
          rows.slice(0, 300).map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.code}</TableCell>
              <TableCell className="text-muted-foreground">{s.category}</TableCell>
              <TableCell className="max-w-72 truncate">{s.description}</TableCell>
              <TableCell>{s.unit}</TableCell>
              <TableCell>{formatCurrency(s.price)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.region_code}</TableCell>
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
                      region_code: s.region_code,
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
            <DialogTitle>{form.id ? "Ubah Item SBM" : "Tambah Item SBM"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s-year">Tahun</Label>
              <Input id="s-year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-code">Kode</Label>
              <Input id="s-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-cat">Kategori</Label>
              <Input id="s-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-unit">Satuan</Label>
              <Input id="s-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-price">Harga Satuan</Label>
              <Input id="s-price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-reg">Kode Wilayah</Label>
              <Input id="s-reg" value={form.region_code} onChange={(e) => setForm({ ...form, region_code: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="s-desc">Uraian</Label>
              <Input id="s-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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