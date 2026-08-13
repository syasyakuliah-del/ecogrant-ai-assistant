import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  KeyRound,
  Mail,
  Shield,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/app-shell";
import { AdminToolbar, EmptyRow } from "@/components/admin/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Kelola User & RBAC — Admin EcoGrant AI" },
      {
        name: "description",
        content: "Kelola akun pengguna, status, peran, dan matriks hak akses RBAC platform.",
      },
    ],
  }),
  component: AdminUsers,
});

const PAGE_SIZE = 25;

const ALL_21_PERMISSIONS = [
  { name: "dashboard.user.view", label: "Melihat Dashboard User", category: "Dashboard" },
  { name: "dashboard.admin.view", label: "Melihat Dashboard Admin", category: "Dashboard" },
  { name: "proposal.create", label: "Membuat Proposal Baru", category: "Proposal" },
  {
    name: "proposal.view.own",
    label: "Melihat Proposal Milik Sendiri / Workspace",
    category: "Proposal",
  },
  { name: "proposal.view.all", label: "Melihat Seluruh Proposal Sistem", category: "Proposal" },
  { name: "proposal.update.own", label: "Mengedit Proposal Milik Sendiri", category: "Proposal" },
  { name: "proposal.update.all", label: "Mengedit Seluruh Proposal Sistem", category: "Proposal" },
  { name: "proposal.delete.own", label: "Menghapus Proposal (Soft Delete)", category: "Proposal" },
  { name: "proposal.delete.all", label: "Menghapus Seluruh Proposal", category: "Proposal" },
  { name: "proposal.approve", label: "Approval & Ubah Status Proposal", category: "Proposal" },
  { name: "proposal.export", label: "Mengekspor Proposal (PDF/DOCX/XLSX)", category: "Proposal" },
  { name: "ai.generate", label: "Menjalankan AI Generator Proposal", category: "AI Generator" },
  { name: "donor.manage", label: "CRUD Master Data Donor", category: "Master Data" },
  { name: "sbm.manage", label: "CRUD Master Data SBM", category: "Master Data" },
  { name: "sbu.manage", label: "CRUD Master Data SBU", category: "Master Data" },
  { name: "activity.manage", label: "CRUD Master Data Kegiatan", category: "Master Data" },
  { name: "user.manage", label: "CRUD User, Peran, & Reset Password", category: "User & RBAC" },
  {
    name: "community.manage",
    label: "CRUD Artikel Community & Moderasi Komentar",
    category: "Community",
  },
  {
    name: "analytics.view",
    label: "Melihat Analytics & Ekspor Laporan",
    category: "Analytics & System",
  },
  { name: "audit.view", label: "Melihat Audit Log Sistem", category: "Analytics & System" },
  { name: "settings.manage", label: "Mengelola System Settings", category: "Analytics & System" },
];

function AdminUsers() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [roleFilter, setRoleFilter] = useState("semua");
  const [page, setPage] = useState(0);

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newOrg, setNewOrg] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [isCreating, setIsCreating] = useState(false);

  // Login history dialog
  const [loginHistoryUserId, setLoginHistoryUserId] = useState<string | null>(null);

  // Fetch users & roles with server-side search & pagination
  const { data: userData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["admin-users", q, page],
    queryFn: async () => {
      let profilesQuery = supabase
        .from("profiles")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (q.trim()) {
        profilesQuery = profilesQuery.or(`full_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`);
      }

      const [{ data: profiles, error }, { data: roles }, { data: proposals }] = await Promise.all([
        profilesQuery.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
        supabase.from("user_roles").select("user_id, role, role_id, roles(name)"),
        supabase.from("proposals").select("owner_id").is("deleted_at", null),
      ]);
      if (error) throw error;

      const roleMap = new Map<string, string>();
      for (const r of roles ?? []) {
        let roleName = r.role;
        if (r.roles && typeof r.roles === "object" && "name" in r.roles && r.roles.name) {
          roleName = String(r.roles.name) as typeof roleName;
        }
        if (roleName === "admin") roleMap.set(r.user_id, "admin");
      }

      const countMap = new Map<string, number>();
      for (const p of proposals ?? [])
        countMap.set(p.owner_id, (countMap.get(p.owner_id) ?? 0) + 1);

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) ?? "user",
        proposals: countMap.get(p.id) ?? 0,
      }));
    },
  });

  // Login history
  const { data: loginHistory = [] } = useQuery({
    queryKey: ["login-history", loginHistoryUserId],
    enabled: !!loginHistoryUserId,
    queryFn: async () => {
      if (!loginHistoryUserId) return [];
      const { data } = await supabase
        .from("login_histories")
        .select("*")
        .eq("user_id", loginHistoryUserId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  // RBAC
  const { data: rbacData, isLoading: isRbacLoading } = useQuery({
    queryKey: ["admin-rbac-matrix"],
    queryFn: async () => {
      const [{ data: roles }, { data: permissions }, { data: rolePerms }] = await Promise.all([
        supabase.from("roles").select("*").order("name"),
        supabase.from("permissions").select("*").order("name"),
        supabase.from("role_permissions").select("role_id, permission_id, permissions(name)"),
      ]);

      const roleMap = new Map<string, Set<string>>();
      for (const r of roles ?? []) roleMap.set(r.id, new Set());
      for (const rp of rolePerms ?? []) {
        const set = roleMap.get(rp.role_id);
        const permName =
          rp.permissions && typeof rp.permissions === "object" && "name" in rp.permissions
            ? (rp.permissions.name as string)
            : null;
        if (set && permName) set.add(permName);
      }

      return {
        roles: roles ?? [],
        permissions:
          permissions && permissions.length > 0
            ? permissions
            : ALL_21_PERMISSIONS.map((p) => ({ id: p.name, ...p })),
        rolePermsMap: roleMap,
      };
    },
  });

  // Filter + Paginate
  const term = q.trim().toLowerCase();
  const allFiltered = (userData ?? []).filter((u) => {
    if (statusFilter !== "semua" && u.status !== statusFilter) return false;
    if (roleFilter !== "semua" && u.role !== roleFilter) return false;
    if (!term) return true;
    return [u.full_name, u.email, u.organization_name, u.phone].some((f) =>
      (f ?? "").toLowerCase().includes(term),
    );
  });
  const totalPages = Math.ceil(allFiltered.length / PAGE_SIZE);
  const rows = allFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) {
      toast.error("Email dan kata sandi wajib diisi.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Kata sandi minimal 8 karakter.");
      return;
    }

    setIsCreating(true);
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: newEmail.trim(),
      password: newPassword,
      options: {
        data: {
          full_name: newFullName.trim(),
          organization_name: newOrg.trim(),
          phone: newPhone.trim(),
        },
      },
    });
    setIsCreating(false);

    if (signUpErr) {
      toast.error("Gagal membuat user: " + signUpErr.message);
      return;
    }

    const createdUserId = signUpData.user?.id;
    if (createdUserId && newRole === "admin") {
      const { data: roleRow } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "admin")
        .maybeSingle();
      await supabase
        .from("user_roles")
        .upsert({ user_id: createdUserId, role: "admin", role_id: roleRow?.id ?? null } as never, {
          onConflict: "user_id,role",
        });
    }

    await logAudit({
      action: "admin.user.create",
      entityType: "profile",
      entityId: createdUserId ?? null,
      newValues: { email: newEmail, role: newRole },
    });
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(`Akun user ${newEmail} berhasil dibuat!`);
    setIsCreateOpen(false);
    setNewFullName("");
    setNewEmail("");
    setNewPassword("");
    setNewPhone("");
    setNewOrg("");
    setNewRole("user");
  }

  async function setRole(userId: string, role: string) {
    const { data: roleRow } = await supabase
      .from("roles")
      .select("id")
      .eq("name", role)
      .maybeSingle();
    const roleId = roleRow?.id ?? null;

    if (role === "admin") {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin", role_id: roleId } as never, {
          onConflict: "user_id,role",
        });
      if (error) {
        toast.error("Peran gagal diubah: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) {
        toast.error("Peran gagal diubah: " + error.message);
        return;
      }
    }

    await logAudit({
      action: "admin.user.role",
      entityType: "user_roles",
      entityId: userId,
      newValues: { role },
    });
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
    await logAudit({
      action: "admin.user.status",
      entityType: "profile",
      entityId: userId,
      newValues: { status: next },
    });
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(`Akun ditandai ${next}.`);
  }

  async function resetPassword(email: string) {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    if (error) {
      toast.error("Gagal mengirim tautan reset password: " + error.message);
      return;
    }
    await logAudit({ action: "admin.user.reset_password", entityType: "profile", entityId: email });
    toast.success(`Tautan reset password berhasil dikirim ke ${email}.`);
  }

  async function resendVerification(email: string) {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      toast.error("Gagal kirim ulang verifikasi: " + error.message);
      return;
    }
    toast.success(`Email verifikasi dikirim ulang ke ${email}.`);
  }

  async function togglePermission(roleId: string, permName: string, currentlyAssigned: boolean) {
    const { data: perm } = await supabase
      .from("permissions")
      .select("id")
      .eq("name", permName)
      .maybeSingle();
    if (!perm) {
      toast.error("Permission data tidak ditemukan di database.");
      return;
    }

    if (currentlyAssigned) {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_id", perm.id);
      if (error) {
        toast.error("Gagal mencabut hak akses: " + error.message);
        return;
      }
      toast.success(`Hak akses ${permName} dicabut dari role.`);
    } else {
      const { error } = await supabase
        .from("role_permissions")
        .insert({ role_id: roleId, permission_id: perm.id });
      if (error) {
        toast.error("Gagal memberikan hak akses: " + error.message);
        return;
      }
      toast.success(`Hak akses ${permName} diberikan ke role.`);
    }

    await logAudit({
      action: "admin.rbac.permission",
      entityType: "role_permissions",
      entityId: roleId,
      newValues: { permName, granted: !currentlyAssigned },
    });
    void qc.invalidateQueries({ queryKey: ["admin-rbac-matrix"] });
  }

  function exportUsers() {
    const exportData = allFiltered.map((u) => ({
      Nama: u.full_name || "-",
      Email: u.email,
      Telepon: u.phone ?? "-",
      Organisasi: u.organization_name ?? "-",
      Peran: u.role,
      Status: u.status,
      "Terakhir Login": u.last_login_at ?? "-",
      Terdaftar: u.created_at,
      Proposal: u.proposals,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, `users_admin_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${exportData.length} user diekspor.`);
    void logAudit({
      action: "admin.user.export",
      entityType: "profile",
      newValues: { count: exportData.length },
    });
  }

  function initials(name: string) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }

  const categories = Array.from(new Set(ALL_21_PERMISSIONS.map((p) => p.category)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola User & RBAC"
        description="Kelola hak akses, status, peran, riwayat login, dan matriks RBAC."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="users" className="gap-2">
            <Users className="size-4" /> Daftar Pengguna
          </TabsTrigger>
          <TabsTrigger value="rbac" className="gap-2">
            <ShieldCheck className="size-4" /> Matriks RBAC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-56">
              <AdminToolbar
                query={q}
                onQueryChange={(v) => {
                  setQ(v);
                  setPage(0);
                }}
                placeholder="Cari nama, email, telepon, atau organisasi…"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="nonaktif">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Role</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportUsers}>
              <Download className="size-3.5" /> Export
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <UserPlus className="size-4" /> Tambah User Baru
            </Button>
          </div>

          {/* Table */}
          <div className="surface-panel overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Email & Organisasi</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Terdaftar & Login</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isUsersLoading ? (
                  <EmptyRow colSpan={8} label="Memuat data pengguna…" />
                ) : rows.length === 0 ? (
                  <EmptyRow colSpan={8} label="Tidak ada pengguna yang cocok." />
                ) : (
                  rows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarImage src={u.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                              {initials(u.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{u.full_name || "Tanpa Nama"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{u.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.organization_name ?? "Individu"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.phone ?? "-"}
                      </TableCell>
                      <TableCell className="font-medium">{u.proposals}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>Buat: {formatDateTime(u.created_at)}</div>
                        {u.last_login_at && <div>Login: {formatDateTime(u.last_login_at)}</div>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(v) => void setRole(u.id, v)}
                          disabled={u.id === user?.id}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
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
                          <Badge variant={u.status === "aktif" ? "default" : "secondary"}>
                            {u.status}
                          </Badge>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-[11px] h-7 px-2"
                            onClick={() => void resetPassword(u.email)}
                          >
                            <KeyRound className="size-3" /> Reset
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title="Kirim ulang verifikasi"
                            onClick={() => void resendVerification(u.email)}
                          >
                            <Mail className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title="Riwayat login"
                            onClick={() => setLoginHistoryUserId(u.id)}
                          >
                            <Clock className="size-3.5" />
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
                Halaman {page + 1} dari {totalPages} ({allFiltered.length} user)
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
        </TabsContent>

        <TabsContent value="rbac" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5 text-emerald-600 dark:text-emerald-400" /> Matriks
                Pemetaan Role & Hak Akses (RBAC)
              </CardTitle>
              <CardDescription>
                Tabel di bawah mengelola relasi{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">role_permissions</code> dan
                21 permission minimum sesuai PRD 5.3.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRbacLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Memuat data matriks RBAC…
                </div>
              ) : (
                <div className="space-y-8">
                  {categories.map((cat) => {
                    const catPerms = ALL_21_PERMISSIONS.filter((p) => p.category === cat);
                    return (
                      <div key={cat} className="space-y-3">
                        <h4 className="font-semibold text-sm text-emerald-700 dark:text-emerald-300 tracking-wide uppercase">
                          Kategori: {cat}
                        </h4>
                        <div className="rounded-lg border divide-y overflow-hidden">
                          {catPerms.map((p) => (
                            <div
                              key={p.name}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 hover:bg-muted/40 transition-colors"
                            >
                              <div>
                                <div className="font-mono text-xs font-semibold text-foreground">
                                  {p.name}
                                </div>
                                <div className="text-xs text-muted-foreground">{p.label}</div>
                              </div>
                              <div className="flex items-center gap-6">
                                {(rbacData?.roles ?? []).map((r) => {
                                  const permSet = rbacData?.rolePermsMap.get(r.id);
                                  const isAssigned = permSet
                                    ? permSet.has(p.name)
                                    : r.name === "admin";
                                  return (
                                    <label
                                      key={r.id}
                                      className="flex items-center gap-2 cursor-pointer text-xs"
                                    >
                                      <Checkbox
                                        checked={isAssigned}
                                        onCheckedChange={() =>
                                          void togglePermission(r.id, p.name, isAssigned)
                                        }
                                        disabled={
                                          r.name === "admin" && p.name.startsWith("dashboard")
                                        }
                                      />
                                      <span className="capitalize font-medium">{r.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <UserPlus className="size-5" /> Tambah User & Password Baru
            </DialogTitle>
            <DialogDescription>
              Administrator dapat membuatkan akun pengguna operasional atau admin baru secara
              langsung.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullname">Nama Lengkap</Label>
              <Input
                id="fullname"
                placeholder="Contoh: Budi Santoso"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Alamat Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="user@organisasi.or.id"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Kata Sandi (Password) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="text"
                required
                placeholder="Minimal 8 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div className="text-[11px] text-muted-foreground">
                Admin dapat menentukan password awal pengguna di sini.
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                placeholder="08xxxxxxxxxx"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org">Nama Organisasi / Yayasan</Label>
              <Input
                id="org"
                placeholder="Contoh: KSPM Kalimantan Barat"
                value={newOrg}
                onChange={(e) => setNewOrg(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Peran (Role)</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "user" | "admin")}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User Operasional (Default)</SelectItem>
                  <SelectItem value="admin">Administrator Sistem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isCreating ? "Membuat Akun…" : "Buat Akun Sekarang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Login History Dialog */}
      <Dialog
        open={!!loginHistoryUserId}
        onOpenChange={(o) => {
          if (!o) setLoginHistoryUserId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-5" /> Riwayat Login
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {loginHistory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada riwayat login tercatat.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginHistory.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{formatDateTime(h.created_at)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={h.status === "berhasil" ? "default" : "destructive"}
                          className="text-[10px]"
                        >
                          {h.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {h.ip_address ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-40 truncate">
                        {h.user_agent ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
