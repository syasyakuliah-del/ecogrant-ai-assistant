import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { AdminTable, AdminToolbar, EmptyRow } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/activities")({
  head: () => ({
    meta: [
      { title: "Kelola Kegiatan — Admin EcoGrant AI" },
      { name: "description", content: "Master data kegiatan program beserta pemetaan ke Logical Framework dan kategori anggaran." },
      { property: "og:title", content: "Kelola Kegiatan — Admin EcoGrant AI" },
      { property: "og:description", content: "Katalog kegiatan standar untuk penyusunan LFA dan RAB." },
    ],
  }),
  component: AdminActivities,
});

type Form = {
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

const EMPTY: Form = {
  category: "Umum",
  sub_category: "",
  name: "",
  description: "",
  default_output: "",
  default_indicator: "",
  target_unit: "kegiatan",
  lfa_level: "activity",
  budget_category: "Operasional",
  is_active: true,
};

function AdminActivities() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-activities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").order("category").limit(500);
      if (error) throw error;
      return data;
    },
  });

  const term = q.trim().toLowerCase();
  const rows = data.filter((a) => !term || [a.name, a.category, a.sub_category].some((f) => (f ?? "").toLowerCase().includes(term)));

  async function save() {
    if (!form.name.trim()) {
      toast.error("Nama kegiatan wajib diisi.");
      return;
    }
    const payload = {
      category: form.category,
      sub_category: form.sub_category || null,
      name: form.name.trim(),
      description: form.description,
      default_output: form.default_output || null,
      default_indicator: form.default_indicator || null,
      target_unit: form.target_unit,
      lfa_level: form.lfa_level,
      budget_category: form.budget_category,
      is_active: form.is_active,
    };
    const { error } = form.id
      ? await supabase.from("activities").update(payload).eq("id", form.id)
      : await supabase.from("activities").insert(payload);
    if (error) {
      toast.error("Kegiatan gagal disimpan.");
      return;
    }
    await logAudit({ action: form.id ? "admin.activity.update" : "admin.activity.create", entityType: "activity", entityId: form.id ?? null });
    setOpen(false);
    setForm(EMPTY);
    void qc.invalidateQueries({ queryKey: ["admin-activities"] });
    toast.success("Kegiatan tersimpan.");
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus kegiatan ini?")) return;
    await supabase.from("activities").delete().eq("id", id);
    await logAudit({ action: "admin.activity.delete", entityType: "activity", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-activities"] });
  }

  return (
    <div>
      <PageHeader
        title="Kelola Kegiatan"
        description="Katalog kegiatan standar beserta pemetaan LFA dan kategori anggaran."
        actions={
          <Button
            onClick={() => {
              setForm(EMPTY);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Tambah Kegiatan
          </Button>
        }
      />

      <AdminToolbar query={q} onQueryChange={setQ} placeholder="Cari nama atau kategori kegiatan" />

      <AdminTable headers={["Nama", "Kategori", "Output Default", "Satuan", "Level LFA", "Kategori RAB", "Status", "Aksi"]}>
        {isLoading ? (
          <EmptyRow colSpan={8} label="Memuat data kegiatan…" />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={8} label="Belum ada kegiatan terdaftar." />
        ) : (
          rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {a.category}
                {a.sub_category ? ` · ${a.sub_category}` : ""}
              </TableCell>
              <TableCell className="max-w-56 truncate text-muted-foreground">{a.default_output ?? "-"}</TableCell>
              <TableCell>{a.target_unit}</TableCell>
              <TableCell className="text-xs">{a.lfa_level}</TableCell>
              <TableCell className="text-xs">{a.budget_category}</TableCell>
              <TableCell>
                <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Aktif" : "Nonaktif"}</Badge>
              </TableCell>
              <TableCell className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ubah kegiatan"
                  onClick={() => {
                    setForm({
                      id: a.id,
                      category: a.category,
                      sub_category: a.sub_category ?? "",
                      name: a.name,
                      description: a.description,
                      default_output: a.default_output ?? "",
                      default_indicator: a.default_indicator ?? "",
                      target_unit: a.target_unit,
                      lfa_level: a.lfa_level,
                      budget_category: a.budget_category,
                      is_active: a.is_active,
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Hapus kegiatan" onClick={() => void remove(a.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </AdminTable>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Ubah Kegiatan" : "Tambah Kegiatan"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="a-name">Nama Kegiatan</Label>
              <Input id="a-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-cat">Kategori</Label>
              <Input id="a-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-sub">Sub Kegiatan</Label>
              <Input id="a-sub" value={form.sub_category} onChange={(e) => setForm({ ...form, sub_category: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-out">Output Default</Label>
              <Input id="a-out" value={form.default_output} onChange={(e) => setForm({ ...form, default_output: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-ind">Indikator Default</Label>
              <Input id="a-ind" value={form.default_indicator} onChange={(e) => setForm({ ...form, default_indicator: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-unit">Satuan Target</Label>
              <Input id="a-unit" value={form.target_unit} onChange={(e) => setForm({ ...form, target_unit: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-lfa">Level LFA</Label>
              <Input id="a-lfa" value={form.lfa_level} onChange={(e) => setForm({ ...form, lfa_level: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-bud">Kategori RAB</Label>
              <Input id="a-bud" value={form.budget_category} onChange={(e) => setForm({ ...form, budget_category: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="a-desc">Deskripsi</Label>
              <Input id="a-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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