import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Crown, FileText, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMembership } from "@/hooks/useMembership";
import { STATUS_LABEL } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EcoGrant AI" },
      {
        name: "description",
        content: "Ringkasan proposal hibah, progres penyusunan, dan aktivitas terbaru.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Dashboard — EcoGrant AI" },
      {
        property: "og:description",
        content: "Ringkasan proposal hibah dan progres penyusunan Anda.",
      },
    ],
  }),
  component: DashboardPage,
});

const PERIODS = [
  { value: "30", label: "30 hari terakhir" },
  { value: "90", label: "90 hari terakhir" },
  { value: "365", label: "12 bulan terakhir" },
  { value: "all", label: "Seluruh periode" },
];

function DashboardPage() {
  const { profile, user, isAdmin, loading } = useAuth();
  const { currentPlan, proposalCount } = useMembership();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("365");

  useEffect(() => {
    if (!loading && isAdmin) {
      void navigate({ to: "/admin", replace: true });
    }
  }, [isAdmin, loading, navigate]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", user?.id, period],
    queryFn: async () => {
      let query = supabase
        .from("proposals")
        .select(
          "id,title,status,progress_percent,grant_amount,currency,updated_at,created_at,donor_id",
        )
        .eq("owner_id", user!.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (period !== "all") {
        const since = new Date(Date.now() - Number(period) * 86400000).toISOString();
        query = query.gte("created_at", since);
      }
      const { data: proposals, error } = await query;
      if (error) throw error;

      const { data: notifications } = await supabase
        .from("notifications")
        .select("id,title,message,created_at,read_at")
        .order("created_at", { ascending: false })
        .limit(5);

      return { proposals: proposals ?? [], notifications: notifications ?? [] };
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const list = data?.proposals ?? [];
    return {
      total: list.length,
      draft: list.filter((p) => p.status === "draft" || p.status === "sedang_disusun").length,
      review: list.filter((p) => p.status === "siap_ditinjau" || p.status === "perlu_revisi")
        .length,
      done: list.filter((p) => p.status === "selesai" || p.status === "disetujui").length,
      value: list.reduce((a, p) => a + Number(p.grant_amount ?? 0), 0),
    };
  }, [data]);

  const statusChart = useMemo(() => {
    const list = data?.proposals ?? [];
    const counts = new Map<string, number>();
    for (const p of list) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
    return [...counts.entries()].map(([status, value]) => ({
      name: STATUS_LABEL[status] ?? status,
      value,
    }));
  }, [data]);

  const monthlyChart = useMemo(() => {
    const list = data?.proposals ?? [];
    const counts = new Map<string, number>();
    for (const p of list) {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, jumlah]) => ({ bulan: key, jumlah }));
  }, [data]);

  const chartColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  if (isError) {
    return (
      <div className="surface-panel flex flex-col items-center gap-3 p-12 text-center">
        <p className="font-display font-semibold">Data dashboard gagal dimuat</p>
        <p className="text-sm text-muted-foreground">
          Terjadi kendala saat mengambil data dari server.
        </p>
        <Button onClick={() => void refetch()} variant="outline">
          <RefreshCw className="size-4" /> Coba lagi
        </Button>
      </div>
    );
  }

  const proposalLimit = currentPlan.limits.proposalQuota;
  const usagePercentage = proposalLimit === 999 ? 0 : Math.min(100, Math.round((proposalCount / proposalLimit) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Selamat datang, ${profile?.full_name || "Pengguna"}`}
        description="Berikut ringkasan penyusunan proposal hibah pada ruang kerja Anda."
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* MEMBERSHIP SUMMARY CARD */}
      <Card className="border-l-4 border-l-primary bg-card/80 backdrop-blur shadow-xs">
        <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Crown className="size-6" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Membership Anda
                </span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  AKTIF
                </Badge>
              </div>
              <p className="font-display text-lg font-bold text-foreground">
                Paket {currentPlan.name}{" "}
                <span className="text-xs font-medium text-muted-foreground font-sans">
                  ({formatCurrency(currentPlan.priceMonthly)} / bulan)
                </span>
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col md:flex-row items-stretch md:items-center gap-4 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-6">
            <div className="space-y-1.5 min-w-[200px]">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Kuota Proposal Bulan Ini:</span>
                <span className="font-bold text-foreground">
                  {proposalCount} / {proposalLimit === 999 ? "Tanpa Batas" : proposalLimit}
                </span>
              </div>
              <Progress value={proposalLimit === 999 ? 100 : usagePercentage} className="h-2" />
            </div>

            <Link to="/membership" className="shrink-0">
              <Button size="sm" variant={currentPlan.id === "premium" ? "outline" : "default"} className="w-full h-9 text-xs font-semibold gap-1.5">
                <Sparkles className="size-3.5" />
                {currentPlan.id === "premium" ? "Kelola Membership" : "Upgrade Membership"}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Proposal", value: stats.total },
            { label: "Draft dan Sedang Disusun", value: stats.draft },
            { label: "Dalam Peninjauan", value: stats.review },
            { label: "Disetujui dan Selesai", value: stats.done },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {kpi.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-semibold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Total Nilai Hibah Diajukan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-display text-2xl font-semibold text-primary">
            {formatCurrency(stats.value)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposal per Status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {statusChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data untuk ditampilkan.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                  >
                    {statusChart.map((_, i) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposal per Bulan</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {monthlyChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data untuk ditampilkan.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="bulan" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="jumlah" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Proposal Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-24" />
            ) : (data?.proposals ?? []).length === 0 ? (
              <EmptyState
                title="Belum ada proposal"
                description="Mulai susun proposal hibah pertama Anda melalui menu Proposal Saya."
              />
            ) : (
              (data?.proposals ?? []).slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  to="/proposals/$id"
                  params={{ id: p.id }}
                  className="flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Diperbarui {formatDateTime(p.updated_at)} ·{" "}
                        {formatCurrency(p.grant_amount, p.currency)}
                      </p>
                    </div>
                    <Badge variant="secondary">{STATUS_LABEL[p.status]}</Badge>
                  </div>
                  <Progress value={p.progress_percent} className="h-1.5" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifikasi Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.notifications ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada notifikasi.</p>
            ) : (
              (data?.notifications ?? []).map((n) => (
                <div key={n.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="size-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">{n.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDateTime(n.created_at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
