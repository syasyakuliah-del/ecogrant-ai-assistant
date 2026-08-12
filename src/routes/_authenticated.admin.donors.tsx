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
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/donors")({
  head: () => ({
    meta: [
      { title: "Kelola Donor — Admin EcoGrant AI" },
      { name: "description", content: "Kelola basis data lembaga donor, prioritas pendanaan, persyaratan, dan tenggat pengajuan." },
      { property: "og:title", content: "Kelola Donor — Admin EcoGrant AI" },
      { property: "og:description", content: "Basis data lembaga donor untuk pencocokan proposal." },
    ],
  }),
  component: AdminDonors,
});

type FormState = {
  id?: string;
  name: string;
  category: string;
  country: string;
  website: string;
  email: string;
  priorities: string;
  requirements: string;
  funding_fields: string;
  min_grant: string;
  max_grant: string;
  deadline: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: "",
  category: "Lainnya",
  country: "Indonesia",
  website: "",
  email: "",
  priorities: "",
  requirements: "",
  funding_fields: "",
  min_grant: "0",
  max_grant: "0",
  deadline: "",
  is_active: true,
};

function toList(v: string) {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function AdminDonors() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-donors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("donors").select("*").is("deleted_at", null).order("name");
      if (error) throw error;
      return data;
    },
  });

  const term = q.trim().toLowerCase();
  const rows = data.filter((d) => !term || [d.name, d.category, d.country].some((f) => (f ?? "").toLowerCase().includes(term)));

  async function save() {
    if (!form.name.trim()) {
      toast.error("Nama donor wajib diisi.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      country: form.country || null,
      website: form.website || null,
      email: form.email || null,
      priorities: toList(form.priorities),
      requirements: toList(form.requirements),
      funding_fields: toList(form.funding_fields),
      min_grant: Number(form.min_grant || 0),
      max_grant: Number(form.max_grant || 0),
      deadline: form.deadline || null,
      is_active: form.is_active,
    };
    const { error } = form.id
      ? await supabase.from("donors").update(payload).eq("id", form.id)
      : await supabase.from("donors").insert(payload);
    if (error) {
      toast.error("Data donor gagal disimpan.");
      return;
    }
    await logAudit({ action: form.id ? "admin.donor.update" : "admin.donor.create", entityType: "donor", entityId: form.id ?? null });
    setOpen(false);
    setForm(EMPTY);
    void qc.invalidateQueries({ queryKey: ["admin-donors"] });
    toast.success("Data donor tersimpan.");
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus donor ini dari daftar aktif?")) return;
    await supabase.from("donors").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    await logAudit({ action: "admin.donor.delete", entityType: "donor", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-donors"] });
    toast.success("Donor dihapus.");
  }

  return (
    <div>
      <PageHeader
        title="Kelola Donor"
        description="Basis data lembaga donor yang dipakai pada pencocokan proposal."
        actions={
          <Button
            onClick={() => {
              setForm(EMPTY);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Tambah Donor
          </Button>
        }
      />

      <AdminToolbar query={q} onQueryChange={setQ} placeholder="Cari nama, kategori, atau negara" />

      <AdminTable headers={["Nama", "Kategori", "Rentang Hibah", "Tenggat", "Status", "Aksi"]}>
        {isLoading ? (
          <EmptyRow colSpan={6} label="Memuat data donor…" />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={6} label="Belum ada donor terdaftar." />
        ) : (
          rows.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell className="text-muted-foreground">{d.category}</TableCell>
              <TableCell className="text-xs">
                {formatCurrency(d.min_grant, d.currency)} – {formatCurrency(d.max_grant, d.currency)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDate(d.deadline)}</TableCell>
              <TableCell>
                <Badge variant={d.is_active ? "default" : "secondary"}>{d.is_active ? "Aktif" : "Nonaktif"}</Badge>
              </TableCell>
              <TableCell className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ubah donor"
                  onClick={() => {
                    setForm({
                      id: d.id,
                      name: d.name,
                      category: d.category,
                      country: d.country ?? "",
                      website: d.website ?? "",
                      email: d.email ?? "",
                      priorities: d.priorities.join(", "),
                      requirements: d.requirements.join(", "),
                      funding_fields: d.funding_fields.join(", "),
                      min_grant: String(d.min_grant),
                      max_grant: String(d.max_grant),
                      deadline: d.deadline ?? "",
                      is_active: d.is_active,
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Hapus donor" onClick={() => void remove(d.id)}>
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
            <DialogTitle>{form.id ? "Ubah Donor" : "Tambah Donor"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="d-name">Nama Lembaga</Label>
              <Input id="d-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-cat">Kategori</Label>
              <Input id="d-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-country">Negara</Label>
              <Input id="d-country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-web">Situs Web</Label>
              <Input id="d-web" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-mail">Email</Label>
              <Input id="d-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-min">Hibah Minimum</Label>
              <Input id="d-min" type="number" value={form.min_grant} onChange={(e) => setForm({ ...form, min_grant: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-max">Hibah Maksimum</Label>
              <Input id="d-max" type="number" value={form.max_grant} onChange={(e) => setForm({ ...form, max_grant: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-dead">Tenggat Pengajuan</Label>
              <Input id="d-dead" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="d-prior">Prioritas (pisahkan dengan koma)</Label>
              <Input id="d-prior" value={form.priorities} onChange={(e) => setForm({ ...form, priorities: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="d-req">Persyaratan (pisahkan dengan koma)</Label>
              <Input id="d-req" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="d-field">Bidang Pendanaan (pisahkan dengan koma)</Label>
              <Input id="d-field" value={form.funding_fields} onChange={(e) => setForm({ ...form, funding_fields: e.target.value })} />
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