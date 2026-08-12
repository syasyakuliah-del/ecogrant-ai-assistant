import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, notify } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { AdminTable, AdminToolbar, EmptyRow } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROPOSAL_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/proposals")({
  head: () => ({
    meta: [
      { title: "Kelola Proposal — Admin EcoGrant AI" },
      { name: "description", content: "Tinjau, ubah status, dan kelola seluruh proposal hibah yang disusun pengguna." },
      { property: "og:title", content: "Kelola Proposal — Admin EcoGrant AI" },
      { property: "og:description", content: "Manajemen proposal lintas organisasi pada platform EcoGrant AI." },
    ],
  }),
  component: AdminProposals,
});

function AdminProposals() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("semua");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const term = q.trim().toLowerCase();
  const rows = data.filter(
    (p) =>
      (status === "semua" || p.status === status) &&
      (!term || [p.title, p.organization_name, p.province].some((f) => (f ?? "").toLowerCase().includes(term))),
  );

  async function changeStatus(id: string, ownerId: string, title: string, next: string) {
    const { error } = await supabase
      .from("proposals")
      .update({ status: next as never, review_note: null })
      .eq("id", id);
    if (error) {
      toast.error("Status gagal diperbarui.");
      return;
    }
    await logAudit({ action: "admin.proposal.status", entityType: "proposal", entityId: id, newValues: { status: next } });
    await notify({
      userId: ownerId,
      type: "status",
      title: `Status proposal diperbarui: ${STATUS_LABEL[next] ?? next}`,
      message: `Proposal "${title}" kini berstatus ${STATUS_LABEL[next] ?? next}.`,
    });
    void qc.invalidateQueries({ queryKey: ["admin-proposals"] });
    toast.success("Status proposal diperbarui.");
  }

  async function remove(id: string) {
    if (!window.confirm("Arsipkan proposal ini?")) return;
    await supabase.from("proposals").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    await logAudit({ action: "admin.proposal.delete", entityType: "proposal", entityId: id });
    void qc.invalidateQueries({ queryKey: ["admin-proposals"] });
    toast.success("Proposal diarsipkan.");
  }

  return (
    <div>
      <PageHeader title="Kelola Proposal" description="Seluruh proposal dari semua organisasi pengguna." />

      <AdminToolbar query={q} onQueryChange={setQ} placeholder="Cari judul, organisasi, atau provinsi">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            {PROPOSAL_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminToolbar>

      <AdminTable headers={["Judul", "Organisasi", "Nilai Hibah", "Diperbarui", "Status", "Aksi"]}>
        {isLoading ? (
          <EmptyRow colSpan={6} label="Memuat data proposal…" />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={6} label="Tidak ada proposal yang cocok dengan filter." />
        ) : (
          rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="max-w-64 truncate font-medium">
                <Link to="/proposals/$id" params={{ id: p.id }} className="hover:underline">
                  {p.title}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{p.organization_name ?? "-"}</TableCell>
              <TableCell>{formatCurrency(p.grant_amount, p.currency)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.updated_at)}</TableCell>
              <TableCell>
                <Select value={p.status} onValueChange={(v) => void changeStatus(p.id, p.owner_id, p.title, v)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSAL_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => void remove(p.id)} aria-label="Arsipkan proposal">
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </AdminTable>
    </div>
  );
}