import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { PROPOSAL_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/proposals/")({
  head: () => ({
    meta: [
      { title: "Proposal Saya — EcoGrant AI" },
      { name: "description", content: "Kelola seluruh proposal hibah yang Anda susun beserta status dan progresnya." },
      { property: "og:title", content: "Proposal Saya — EcoGrant AI" },
      { property: "og:description", content: "Daftar proposal hibah beserta status, progres, dan nilai hibah." },
    ],
  }),
  component: ProposalsPage,
});

const PAGE_SIZE = 10;

function ProposalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("semua");
  const [donor, setDonor] = useState("semua");
  const [sort, setSort] = useState("updated_at");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: donors = [] } = useQuery({
    queryKey: ["donors-simple"],
    queryFn: async () => {
      const { data } = await supabase.from("donors").select("id,name").order("name");
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["proposals", user?.id, debounced, status, donor, sort, page],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("proposals")
        .select("*, donors(name)", { count: "exact" })
        .eq("owner_id", user!.id)
        .is("deleted_at", null);

      if (debounced) query = query.ilike("title", `%${debounced}%`);
      if (status !== "semua") query = query.eq("status", status as never);
      if (donor !== "semua") query = query.eq("donor_id", donor);

      const { data: rows, count, error } = await query
        .order(sort, { ascending: sort === "title" })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: rows ?? [], count: count ?? 0 };
    },
  });

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
        })
        .select("id")
        .single();
      if (error) throw error;
      await logAudit({ action: "proposal.create", entityType: "proposals", entityId: row.id, newValues: { title } });
      return row.id;
    },
    onSuccess: (id) => {
      toast.success("Proposal berhasil dibuat.");
      setCreateOpen(false);
      setNewTitle("");
      void navigate({ to: "/proposals/$id", params: { id } });
    },
    onError: () => toast.error("Proposal gagal dibuat."),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: source, error } = await supabase.from("proposals").select("*").eq("id", id).single();
      if (error) throw error;
      const { id: _id, created_at, updated_at, ...rest } = source;
      void _id;
      void created_at;
      void updated_at;
      const { data: copy, error: insertError } = await supabase
        .from("proposals")
        .insert({ ...rest, title: `${source.title} (Salinan)`, status: "draft", submitted_at: null, approved_at: null })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const [{ data: sections }, { data: lfa }, { data: budget }] = await Promise.all([
        supabase.from("proposal_sections").select("*").eq("proposal_id", id),
        supabase.from("lfa_rows").select("*").eq("proposal_id", id),
        supabase.from("budget_items").select("*").eq("proposal_id", id),
      ]);

      if (sections?.length) {
        await supabase.from("proposal_sections").insert(
          sections.map(({ id: _s, created_at: _c, updated_at: _u, ...s }) => ({ ...s, proposal_id: copy.id })),
        );
      }
      if (lfa?.length) {
        await supabase
          .from("lfa_rows")
          .insert(lfa.map(({ id: _l, created_at: _c, updated_at: _u, ...l }) => ({ ...l, proposal_id: copy.id })));
      }
      if (budget?.length) {
        await supabase.from("budget_items").insert(
          budget.map(
            ({ id: _b, created_at: _c, updated_at: _u, subtotal: _st, tax_amount: _ta, total: _t, lfa_row_id: _lr, ...b }) => ({
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
      toast.success("Proposal berhasil diduplikasi.");
      void queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: () => toast.error("Duplikasi proposal gagal."),
  });

  async function handleDelete(id: string, title: string) {
    const { error } = await supabase
      .from("proposals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Proposal gagal dihapus.");
      return;
    }
    await logAudit({ action: "proposal.delete", entityType: "proposals", entityId: id });
    void queryClient.invalidateQueries({ queryKey: ["proposals"] });
    toast.success(`Proposal "${title}" dihapus.`, {
      duration: 10000,
      action: {
        label: "Batalkan",
        onClick: async () => {
          await supabase.from("proposals").update({ deleted_at: null }).eq("id", id);
          await logAudit({ action: "proposal.restore", entityType: "proposals", entityId: id });
          void queryClient.invalidateQueries({ queryKey: ["proposals"] });
          toast.success("Penghapusan dibatalkan.");
        },
      },
    });
  }

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposal Saya"
        description="Seluruh proposal hibah yang Anda susun beserta status dan progres penyusunannya."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Buat Proposal
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul proposal"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Status</SelectItem>
              {PROPOSAL_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={donor} onValueChange={(v) => { setDonor(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Donor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Donor</SelectItem>
              {donors.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Urutkan</Label>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at">Terakhir diperbarui</SelectItem>
              <SelectItem value="created_at">Tanggal dibuat</SelectItem>
              <SelectItem value="title">Judul</SelectItem>
              <SelectItem value="grant_amount">Nilai hibah</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (data?.rows ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada proposal"
          description="Buat proposal baru untuk mulai menyusun narasi, Logical Framework, dan Rencana Anggaran Biaya."
          action={<Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Buat Proposal</Button>}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Nilai Hibah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40">Progress</TableHead>
                  <TableHead>Diperbarui</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link to="/proposals/$id" params={{ id: p.id }} className="font-medium hover:underline">
                        {p.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{p.organization_name ?? "-"}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {(p as unknown as { donors?: { name: string } }).donors?.name ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm">{formatCurrency(p.grant_amount, p.currency)}</TableCell>
                    <TableCell><Badge variant="secondary">{STATUS_LABEL[p.status]}</Badge></TableCell>
                    <TableCell>
                      <Progress value={p.progress_percent} className="h-1.5" />
                      <span className="text-xs text-muted-foreground">{p.progress_percent} persen</span>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(p.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Duplikasi"
                          onClick={() => duplicateMutation.mutate(p.id)}
                          disabled={duplicateMutation.isPending}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Hapus"
                          onClick={() => void handleDelete(p.id, p.title)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {(data?.rows ?? []).length} dari {data?.count ?? 0} proposal
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Proposal Baru</DialogTitle>
            <DialogDescription>
              Masukkan judul awal proposal. Judul dapat diubah kembali pada langkah pertama wizard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-title">Judul Proposal</Label>
            <Input
              id="new-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Restorasi Ekosistem Mangrove Berbasis Masyarakat"
            />
            <p className="text-xs text-muted-foreground">Judul wajib diisi antara 10 sampai 250 karakter.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button
              disabled={newTitle.trim().length < 10 || createMutation.isPending}
              onClick={() => createMutation.mutate(newTitle.trim())}
            >
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Lanjutkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}