import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { AdminTable, AdminToolbar, EmptyRow } from "@/components/admin/data-table";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — Admin EcoGrant AI" },
      { name: "description", content: "Riwayat aksi pengguna dan administrator untuk kebutuhan tata kelola dan keamanan." },
      { property: "og:title", content: "Audit Log — Admin EcoGrant AI" },
      { property: "og:description", content: "Jejak audit lengkap seluruh aktivitas EcoGrant AI." },
    ],
  }),
  component: AdminAudit,
});

function AdminAudit() {
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const [{ data: logs, error }, { data: profiles }] = await Promise.all([
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      if (error) throw error;
      const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
      return (logs ?? []).map((l) => ({ ...l, actor: l.user_id ? (names.get(l.user_id) ?? "Pengguna") : "Sistem" }));
    },
  });

  const term = q.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (l) =>
      (!term || [l.action, l.entity_type, l.actor].some((f) => (f ?? "").toLowerCase().includes(term))) &&
      (!date || l.created_at.slice(0, 10) === date),
  );

  return (
    <div>
      <PageHeader title="Audit Log" description="Lima ratus catatan aktivitas terakhir pada platform." />

      <AdminToolbar query={q} onQueryChange={setQ} placeholder="Cari aksi, entitas, atau pengguna">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" aria-label="Filter tanggal" />
      </AdminToolbar>

      <AdminTable headers={["Waktu", "Pengguna", "Aksi", "Entitas", "Detail"]}>
        {isLoading ? (
          <EmptyRow colSpan={5} label="Memuat catatan audit…" />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={5} label="Tidak ada catatan audit yang cocok." />
        ) : (
          rows.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(l.created_at)}</TableCell>
              <TableCell>{l.actor}</TableCell>
              <TableCell className="font-medium">{l.action}</TableCell>
              <TableCell className="text-muted-foreground">{l.entity_type ?? "-"}</TableCell>
              <TableCell className="max-w-72 truncate text-xs text-muted-foreground">
                {l.new_values ? JSON.stringify(l.new_values) : "-"}
              </TableCell>
            </TableRow>
          ))
        )}
      </AdminTable>
    </div>
  );
}