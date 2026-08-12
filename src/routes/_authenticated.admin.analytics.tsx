import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { STATUS_LABEL } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Admin EcoGrant AI" },
      { name: "description", content: "Statistik proposal per bulan, status, kategori, wilayah, dan pemakaian AI di EcoGrant AI." },
      { property: "og:title", content: "Analytics — Admin EcoGrant AI" },
      { property: "og:description", content: "Analitik penggunaan platform penyusunan proposal hibah." },
    ],
  }),
  component: AdminAnalytics,
});

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function AdminAnalytics() {
  const { data } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [{ data: proposals }, { data: ai }] = await Promise.all([
        supabase.from("proposals").select("status, category, province, grant_amount, created_at").is("deleted_at", null),
        supabase.from("ai_generations").select("generation_type, created_at"),
      ]);
      const p = proposals ?? [];
      const byMonth = new Map<string, number>();
      for (const row of p) {
        const key = row.created_at.slice(0, 7);
        byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
      }
      const group = (key: "status" | "category" | "province") => {
        const m = new Map<string, number>();
        for (const row of p) {
          const v = (row[key] as string | null) || "Tidak diisi";
          m.set(v, (m.get(v) ?? 0) + 1);
        }
        return [...m.entries()].map(([name, value]) => ({ name, value }));
      };
      return {
        total: p.length,
        totalGrant: p.reduce((s, r) => s + Number(r.grant_amount ?? 0), 0),
        aiCount: (ai ?? []).length,
        monthly: [...byMonth.entries()].sort().map(([name, value]) => ({ name, value })),
        byStatus: group("status").map((r) => ({ ...r, name: STATUS_LABEL[r.name] ?? r.name })),
        byCategory: group("category"),
        byProvince: group("province").sort((a, b) => b.value - a.value).slice(0, 8),
      };
    },
  });

  return (
    <div>
      <PageHeader title="Analytics" description="Statistik penggunaan platform dan sebaran proposal." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="surface-panel p-5">
          <p className="text-sm text-muted-foreground">Total Proposal</p>
          <p className="font-display text-2xl font-semibold">{formatNumber(data?.total ?? 0)}</p>
        </div>
        <div className="surface-panel p-5">
          <p className="text-sm text-muted-foreground">Total Nilai Hibah Diajukan</p>
          <p className="font-display text-2xl font-semibold">{formatCurrency(data?.totalGrant ?? 0)}</p>
        </div>
        <div className="surface-panel p-5">
          <p className="text-sm text-muted-foreground">Permintaan AI</p>
          <p className="font-display text-2xl font-semibold">{formatNumber(data?.aiCount ?? 0)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-panel p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Proposal per Bulan</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.monthly ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="surface-panel p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Sebaran Status</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data?.byStatus ?? []} dataKey="value" nameKey="name" outerRadius={90} label>
                {(data?.byStatus ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="surface-panel p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Kategori Program</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.byCategory ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="name" width={140} fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="surface-panel p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Wilayah Terbanyak</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.byProvince ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="name" width={140} fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-chart-3)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  );
}