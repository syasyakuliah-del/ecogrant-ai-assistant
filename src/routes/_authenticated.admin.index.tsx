import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, ClipboardList, Coins, FileText, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard Admin — EcoGrant AI" },
      { name: "description", content: "Ringkasan pengguna, proposal, donor, dan aktivitas terbaru platform EcoGrant AI." },
      { property: "og:title", content: "Dashboard Admin — EcoGrant AI" },
      { property: "og:description", content: "Pantau kesehatan platform dan aktivitas pengguna EcoGrant AI." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [users, proposals, donors, sbm, sbu, ai, recent, audit] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("proposals").select("id, title, status, created_at, updated_at").is("deleted_at", null),
        supabase.from("donors").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("sbm").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("sbu").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("ai_generations").select("id", { count: "exact", head: true }),
        supabase.from("proposals").select("id, title, status, updated_at").is("deleted_at", null).order("updated_at", { ascending: false }).limit(6),
        supabase.from("audit_logs").select("id, action, entity_type, created_at").order("created_at", { ascending: false }).limit(8),
      ]);
      const statusCount: Record<string, number> = {};
      for (const p of proposals.data ?? []) statusCount[p.status] = (statusCount[p.status] ?? 0) + 1;
      return {
        users: users.count ?? 0,
        proposals: proposals.data?.length ?? 0,
        donors: donors.count ?? 0,
        sbm: sbm.count ?? 0,
        sbu: sbu.count ?? 0,
        ai: ai.count ?? 0,
        statusCount,
        recent: recent.data ?? [],
        audit: audit.data ?? [],
      };
    },
  });

  const cards = [
    { label: "Total Pengguna", value: data?.users ?? 0, icon: Users, to: "/admin/users" as const },
    { label: "Total Proposal", value: data?.proposals ?? 0, icon: FileText, to: "/admin/proposals" as const },
    { label: "Lembaga Donor", value: data?.donors ?? 0, icon: Building2, to: "/admin/donors" as const },
    { label: "Item SBM", value: data?.sbm ?? 0, icon: Coins, to: "/admin/sbm" as const },
    { label: "Item SBU", value: data?.sbu ?? 0, icon: Coins, to: "/admin/sbu" as const },
    { label: "Permintaan AI", value: data?.ai ?? 0, icon: ClipboardList, to: "/admin/analytics" as const },
  ];

  return (
    <div>
      <PageHeader title="Dashboard Admin" description="Ringkasan operasional platform EcoGrant AI." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="surface-panel flex items-center gap-4 p-5 transition-colors hover:border-primary/50">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <c.icon className="size-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="font-display text-2xl font-semibold">{formatNumber(c.value)}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-panel p-5">
          <h2 className="mb-3 font-display text-base font-semibold">Proposal per Status</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(data?.statusCount ?? {}).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between">
                <span className="text-muted-foreground">{STATUS_LABEL[status] ?? status}</span>
                <Badge variant="secondary">{count}</Badge>
              </li>
            ))}
            {Object.keys(data?.statusCount ?? {}).length === 0 ? (
              <li className="text-muted-foreground">Belum ada proposal.</li>
            ) : null}
          </ul>
        </section>

        <section className="surface-panel p-5">
          <h2 className="mb-3 font-display text-base font-semibold">Proposal Terbaru</h2>
          <ul className="space-y-2 text-sm">
            {(data?.recent ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span className="truncate">{p.title}</span>
                <Badge variant="outline">{STATUS_LABEL[p.status] ?? p.status}</Badge>
              </li>
            ))}
            {(data?.recent ?? []).length === 0 ? <li className="text-muted-foreground">Belum ada aktivitas.</li> : null}
          </ul>
        </section>

        <section className="surface-panel p-5 lg:col-span-2">
          <h2 className="mb-3 font-display text-base font-semibold">Aktivitas Sistem Terakhir</h2>
          <ul className="space-y-2 text-sm">
            {(data?.audit ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{a.action}</span>
                  <span className="text-muted-foreground"> · {a.entity_type ?? "-"}</span>
                </span>
                <span className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
              </li>
            ))}
            {(data?.audit ?? []).length === 0 ? <li className="text-muted-foreground">Belum ada catatan audit.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}