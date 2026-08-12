import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { AdminTable, AdminToolbar, EmptyRow } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Kelola User — Admin EcoGrant AI" },
      { name: "description", content: "Atur peran administrator, status akun, dan pantau aktivitas pengguna platform." },
      { property: "og:title", content: "Kelola User — Admin EcoGrant AI" },
      { property: "og:description", content: "Manajemen pengguna dan hak akses EcoGrant AI." },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }, { data: proposals }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("proposals").select("owner_id").is("deleted_at", null),
      ]);
      if (error) throw error;
      const roleMap = new Map<string, string>();
      for (const r of roles ?? []) if (r.role === "admin") roleMap.set(r.user_id, "admin");
      const countMap = new Map<string, number>();
      for (const p of proposals ?? []) countMap.set(p.owner_id, (countMap.get(p.owner_id) ?? 0) + 1);
      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) ?? "user",
        proposals: countMap.get(p.id) ?? 0,
      }));
    },
  });

  const term = q.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (u) => !term || [u.full_name, u.email, u.organization_name].some((f) => (f ?? "").toLowerCase().includes(term)),
  );

  async function setRole(userId: string, role: string) {
    if (role === "admin") {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error && !error.message.includes("duplicate")) {
        toast.error("Peran gagal diubah.");
        return;
      }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) {
        toast.error("Peran gagal diubah.");
        return;
      }
    }
    await logAudit({ action: "admin.user.role", entityType: "user_roles", entityId: userId, newValues: { role } });
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success("Peran pengguna diperbarui.");
  }

  async function toggleStatus(userId: string, current: string) {
    const next = current === "aktif" ? "nonaktif" : "aktif";
    const { error } = await supabase.from("profiles").update({ status: next }).eq("id", userId);
    if (error) {
      toast.error("Status gagal diubah.");
      return;
    }
    await logAudit({ action: "admin.user.status", entityType: "profile", entityId: userId, newValues: { status: next } });
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(`Akun ditandai ${next}.`);
  }

  return (
    <div>
      <PageHeader title="Kelola User" description="Peran, status akun, dan aktivitas seluruh pengguna." />
      <AdminToolbar query={q} onQueryChange={setQ} placeholder="Cari nama, email, atau organisasi" />

      <AdminTable headers={["Nama", "Email", "Organisasi", "Proposal", "Terdaftar", "Peran", "Status"]}>
        {isLoading ? (
          <EmptyRow colSpan={7} label="Memuat data pengguna…" />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={7} label="Tidak ada pengguna yang cocok." />
        ) : (
          rows.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.full_name}</TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell className="text-muted-foreground">{u.organization_name ?? "-"}</TableCell>
              <TableCell>{u.proposals}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDateTime(u.created_at)}</TableCell>
              <TableCell>
                <Select value={u.role} onValueChange={(v) => void setRole(u.id, v)} disabled={u.id === user?.id}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Pengguna</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void toggleStatus(u.id, u.status)}
                  disabled={u.id === user?.id}
                >
                  <Badge variant={u.status === "aktif" ? "default" : "secondary"}>{u.status}</Badge>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </AdminTable>
    </div>
  );
}