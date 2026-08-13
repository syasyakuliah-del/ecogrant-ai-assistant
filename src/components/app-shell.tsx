import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  ClipboardList,
  Coins,
  FileText,
  Gauge,
  HelpCircle,
  Info,
  Leaf,
  LogOut,
  Menu,
  Moon,
  PieChart,
  ScrollText,
  Settings,
  ShieldCheck,
  Sun,
  User as UserIcon,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { logAudit } from "@/lib/audit";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const USER_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge, permission: "dashboard.user.view" },
  { to: "/proposals", label: "Proposal Saya", icon: FileText, permission: "proposal.view.own" },
  { to: "/community", label: "Community", icon: Users },
  { to: "/notifications", label: "Notifikasi", icon: Bell },
  { to: "/help", label: "Help Center", icon: HelpCircle },
  { to: "/profile", label: "Profil", icon: UserIcon },
  { to: "/settings", label: "Pengaturan Akun", icon: Settings },
  { to: "/about", label: "Tentang Aplikasi", icon: Info },
] as const;

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard Admin", icon: ShieldCheck, permission: "dashboard.admin.view" },
  { to: "/admin/proposals", label: "Kelola Proposal", icon: ClipboardList, permission: "proposal.view.all" },
  { to: "/admin/users", label: "Kelola User & RBAC", icon: Users, permission: "user.manage" },
  { to: "/admin/donors", label: "Kelola Donor", icon: Building2, permission: "donor.manage" },
  { to: "/admin/activities", label: "Kelola Kegiatan", icon: Leaf, permission: "activity.manage" },
  { to: "/admin/sbm", label: "Kelola SBM", icon: Coins, permission: "sbm.manage" },
  { to: "/admin/sbu", label: "Kelola SBU", icon: Wallet, permission: "sbu.manage" },
  { to: "/admin/analytics", label: "Analytics", icon: PieChart, permission: "analytics.view" },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText, permission: "audit.view" },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin, hasPermission } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // For User role: hide "/settings" (Pengaturan Akun).
  // For Admin role: hide all User Workspace menus completely.
  const visibleUserNav = isAdmin
    ? []
    : USER_NAV.filter(
        (item) =>
          item.to !== "/settings" &&
          (!("permission" in item) || !item.permission || hasPermission(item.permission)),
      );

  const visibleAdminNav = ADMIN_NAV.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {!isAdmin && visibleUserNav.length > 0 ? (
        <div className="space-y-1">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-sidebar-foreground/50 uppercase">
            Ruang Kerja
          </p>
          {visibleUserNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === item.to && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}

      {isAdmin || visibleAdminNav.length > 0 ? (
        <div className="space-y-1">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-sidebar-foreground/50 uppercase">
            Administrasi
          </p>
          {visibleAdminNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === item.to && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Leaf className="size-4" />
      </span>
      <div>
        <p className="font-display text-sm font-semibold text-sidebar-foreground">EcoGrant AI</p>
        <p className="text-[11px] text-sidebar-foreground/60">Generator Proposal Hibah</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, user, isAdmin, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  async function handleSignOut() {
    await logAudit({ action: "logout", entityType: "auth" });
    await signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <Brand />
        <NavList />
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-0">
                <SheetTitle className="sr-only">Navigasi</SheetTitle>
                <Brand />
                <NavList onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold flex items-center">
                <span>{profile?.full_name || "Pengguna"}</span>
                {isAdmin ? <Badge className="ml-2 align-middle">Administrator</Badge> : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.organization_name || "Organisasi belum diisi"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Ubah mode tampilan">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Link to="/notifications" className="relative">
              <Button variant="ghost" size="icon" aria-label="Notifikasi">
                <Bell className="size-4" />
              </Button>
              {unread > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Keluar" className="lg:hidden">
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = FileText,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="surface-panel flex flex-col items-center gap-3 px-6 py-14 text-center rounded-xl border border-dashed">
      <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
        <Icon className="size-6" />
      </span>
      <p className="font-display text-base font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground leading-relaxed">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-2 border-b last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 bg-muted/60 animate-pulse rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 rounded-xl bg-muted/60 animate-pulse p-4 border" />
      ))}
    </div>
  );
}