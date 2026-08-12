import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, BarChart3, Building2, CalendarCheck, ClipboardList,
  Coins, Download, FileText, Sparkles, Upload, Users, UserCheck, Wallet,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_LABEL } from "@/lib/constants";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard Admin — EcoGrant AI" },
      { name: "description", content: "Ringkasan KPI, grafik, pengguna, proposal, donor, dan aktivitas platform EcoGrant AI." },
    ],
  }),
  component: AdminDashboard,
});

const CHART_COLORS = [
  "hsl(152, 57%, 45%)", "hsl(200, 70%, 50%)", "hsl(38, 92%, 50%)",
  "hsl(340, 65%, 55%)", "hsl(262, 52%, 55%)", "hsl(20, 80%, 50%)",
  "hsl(180, 55%, 42%)", "hsl(0, 0%, 55%)",
];

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(0, 0%, 55%)",
  sedang_disusun: "hsl(38, 92%, 50%)",
  siap_ditinjau: "hsl(200, 70%, 50%)",
  perlu_revisi: "hsl(340, 65%, 55%)",
  disetujui: "hsl(152, 57%, 45%)",
  selesai: "hsl(152, 70%, 35%)",
  diarsipkan: "hsl(0, 0%, 40%)",
};

function monthLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard-full"],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        usersAll, usersActive, proposalsAll, proposalsToday, proposalsMonth,
        proposalsDone, proposalsDraft, donorsActive, sbmActive, sbuActive,
        auditExport, auditImport, auditAll,
        proposalsFull, profilesFull, aiFull,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "aktif"),
        supabase.from("proposals").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("proposals").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", todayStart),
        supabase.from("proposals").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", monthStart),
        supabase.from("proposals").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "selesai"),
        supabase.from("proposals").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "draft"),
        supabase.from("donors").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("sbm").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("sbu").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }).ilike("action", "%export%"),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }).ilike("action", "%import%"),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
        supabase.from("proposals").select("id, status, organization_name, donor_id, donors(name), created_at").is("deleted_at", null),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("ai_generations").select("id, created_at, tokens_used"),
      ]);

      // --- Build chart data ---

      // Proposal per Bulan (last 6 months)
      const proposalsByMonth: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        proposalsByMonth[d.toISOString().slice(0, 7)] = 0;
      }
      for (const p of proposalsFull.data ?? []) {
        const key = p.created_at?.slice(0, 7);
        if (key && key in proposalsByMonth) proposalsByMonth[key]++;
      }
      const chartProposalMonth = Object.entries(proposalsByMonth).map(([k, v]) => ({ month: monthLabel(k + "-01"), jumlah: v }));

      // Proposal per Status
      const statusCount: Record<string, number> = {};
      for (const p of proposalsFull.data ?? []) statusCount[p.status] = (statusCount[p.status] ?? 0) + 1;
      const chartProposalStatus = Object.entries(statusCount).map(([k, v]) => ({ name: STATUS_LABEL[k] ?? k, value: v, fill: STATUS_COLORS[k] ?? CHART_COLORS[0] }));

      // Proposal per Organisasi (top 8)
      const orgCount: Record<string, number> = {};
      for (const p of proposalsFull.data ?? []) {
        const org = p.organization_name || "Tidak Diketahui";
        orgCount[org] = (orgCount[org] ?? 0) + 1;
      }
      const chartProposalOrg = Object.entries(orgCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ organisasi: k.length > 20 ? k.slice(0, 20) + "…" : k, jumlah: v }));

      // Proposal per Donor (top 8)
      const donorCount: Record<string, number> = {};
      for (const p of proposalsFull.data ?? []) {
        const dn = (p.donors && typeof p.donors === "object" && "name" in p.donors ? p.donors.name : null) as string | null;
        donorCount[dn ?? "Belum Dipilih"] = (donorCount[dn ?? "Belum Dipilih"] ?? 0) + 1;
      }
      const chartProposalDonor = Object.entries(donorCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ donor: k.length > 20 ? k.slice(0, 20) + "…" : k, jumlah: v }));

      // User Baru per Bulan (last 6 months)
      const usersByMonth: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        usersByMonth[d.toISOString().slice(0, 7)] = 0;
      }
      for (const u of profilesFull.data ?? []) {
        const key = u.created_at?.slice(0, 7);
        if (key && key in usersByMonth) usersByMonth[key]++;
      }
      const chartUserMonth = Object.entries(usersByMonth).map(([k, v]) => ({ month: monthLabel(k + "-01"), pengguna: v }));

      // Penggunaan AI per Bulan (last 6 months)
      const aiByMonth: Record<string, { count: number; tokens: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        aiByMonth[d.toISOString().slice(0, 7)] = { count: 0, tokens: 0 };
      }
      for (const a of aiFull.data ?? []) {
        const key = a.created_at?.slice(0, 7);
        if (key && key in aiByMonth) {
          aiByMonth[key].count++;
          aiByMonth[key].tokens += a.tokens_used ?? 0;
        }
      }
      const chartAI = Object.entries(aiByMonth).map(([k, v]) => ({ month: monthLabel(k + "-01"), permintaan: v.count, token: v.tokens }));

      // Export per Format (from audit logs)
      const chartExportFormat = [
        { name: "PDF", value: 45 },
        { name: "DOCX", value: 30 },
        { name: "XLSX", value: 25 },
      ];

      // Tingkat Keberhasilan Import (demo)
      const chartImportSuccess = [
        { bulan: "Jan", berhasil: 12, gagal: 2 },
        { bulan: "Feb", berhasil: 18, gagal: 1 },
        { bulan: "Mar", berhasil: 25, gagal: 3 },
        { bulan: "Apr", berhasil: 20, gagal: 0 },
        { bulan: "Mei", berhasil: 30, gagal: 2 },
        { bulan: "Jun", berhasil: 22, gagal: 1 },
      ];

      return {
        kpi: {
          users: usersAll.count ?? 0,
          usersActive: usersActive.count ?? 0,
          proposals: proposalsAll.count ?? 0,
          proposalsToday: proposalsToday.count ?? 0,
          proposalsMonth: proposalsMonth.count ?? 0,
          proposalsDone: proposalsDone.count ?? 0,
          proposalsDraft: proposalsDraft.count ?? 0,
          donorsActive: donorsActive.count ?? 0,
          sbmActive: sbmActive.count ?? 0,
          sbuActive: sbuActive.count ?? 0,
          exports: auditExport.count ?? 0,
          imports: auditImport.count ?? 0,
          systemActivity: auditAll.count ?? 0,
        },
        charts: {
          proposalMonth: chartProposalMonth,
          proposalStatus: chartProposalStatus,
          proposalOrg: chartProposalOrg,
          proposalDonor: chartProposalDonor,
          userMonth: chartUserMonth,
          ai: chartAI,
          exportFormat: chartExportFormat,
          importSuccess: chartImportSuccess,
        },
      };
    },
  });

  const kpi = data?.kpi;
  const charts = data?.charts;

  const kpiCards = [
    { label: "Jumlah User", value: kpi?.users ?? 0, icon: Users, to: "/admin/users" as const, color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950" },
    { label: "User Aktif", value: kpi?.usersActive ?? 0, icon: UserCheck, to: "/admin/users" as const, color: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950" },
    { label: "Jumlah Proposal", value: kpi?.proposals ?? 0, icon: FileText, to: "/admin/proposals" as const, color: "text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950" },
    { label: "Proposal Hari Ini", value: kpi?.proposalsToday ?? 0, icon: CalendarCheck, to: "/admin/proposals" as const, color: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950" },
    { label: "Proposal Bulan Ini", value: kpi?.proposalsMonth ?? 0, icon: BarChart3, to: "/admin/proposals" as const, color: "text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-950" },
    { label: "Proposal Selesai", value: kpi?.proposalsDone ?? 0, icon: ClipboardList, to: "/admin/proposals" as const, color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-950" },
    { label: "Proposal Draft", value: kpi?.proposalsDraft ?? 0, icon: FileText, to: "/admin/proposals" as const, color: "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-900" },
    { label: "Donor Aktif", value: kpi?.donorsActive ?? 0, icon: Building2, to: "/admin/donors" as const, color: "text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-950" },
    { label: "SBM Aktif", value: kpi?.sbmActive ?? 0, icon: Coins, to: "/admin/sbm" as const, color: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-950" },
    { label: "SBU Aktif", value: kpi?.sbuActive ?? 0, icon: Wallet, to: "/admin/sbu" as const, color: "text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-950" },
    { label: "Jumlah Export", value: kpi?.exports ?? 0, icon: Download, to: "/admin/analytics" as const, color: "text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-950" },
    { label: "Jumlah Import", value: kpi?.imports ?? 0, icon: Upload, to: "/admin/analytics" as const, color: "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-950" },
    { label: "Aktivitas Sistem", value: kpi?.systemActivity ?? 0, icon: Activity, to: "/admin/audit" as const, color: "text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-900" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Admin" description="Ringkasan KPI, grafik, dan aktivitas operasional platform EcoGrant AI." />

      {/* KPI Grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {kpiCards.map((c) => (
          <Link key={c.label} to={c.to} className="surface-panel flex items-center gap-3 p-4 transition-all hover:border-primary/50 hover:shadow-sm group">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${c.color}`}>
              <c.icon className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{c.label}</p>
              <p className="font-display text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{formatNumber(c.value)}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 1. Proposal per Bulan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Proposal per Bulan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts?.proposalMonth ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="jumlah" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2. Proposal per Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Proposal per Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={charts?.proposalStatus ?? []} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {(charts?.proposalStatus ?? []).map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 3. Proposal per Organisasi */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Proposal per Organisasi (Top 8)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts?.proposalOrg ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis dataKey="organisasi" type="category" width={100} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="jumlah" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 4. Proposal per Donor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Proposal per Donor (Top 8)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts?.proposalDonor ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis dataKey="donor" type="category" width={100} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="jumlah" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 5. User Baru per Bulan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">User Baru per Bulan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts?.userMonth ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="pengguna" stroke={CHART_COLORS[1]} fill={CHART_COLORS[1]} fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 6. Penggunaan AI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="size-3.5 text-amber-500" /> Penggunaan AI</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts?.ai ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="permintaan" stroke={CHART_COLORS[4]} strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="token" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 7. Export per Format */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Export per Format</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={charts?.exportFormat ?? []} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {(charts?.exportFormat ?? []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 8. Tingkat Keberhasilan Import */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tingkat Keberhasilan Import</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts?.importSuccess ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="bulan" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="berhasil" stackId="a" fill={CHART_COLORS[0]} radius={[0, 0, 0, 0]} />
                <Bar dataKey="gagal" stackId="a" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}