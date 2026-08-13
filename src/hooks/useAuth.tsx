import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  organization_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  status: string;
};

const ALL_PERMISSIONS = [
  "dashboard.user.view",
  "dashboard.admin.view",
  "proposal.create",
  "proposal.view.own",
  "proposal.view.all",
  "proposal.update.own",
  "proposal.update.all",
  "proposal.delete.own",
  "proposal.delete.all",
  "proposal.approve",
  "proposal.export",
  "ai.generate",
  "donor.manage",
  "sbm.manage",
  "sbu.manage",
  "activity.manage",
  "user.manage",
  "community.manage",
  "analytics.view",
  "audit.view",
  "settings.manage",
];

const DEFAULT_USER_PERMISSIONS = [
  "dashboard.user.view",
  "proposal.create",
  "proposal.view.own",
  "proposal.update.own",
  "proposal.delete.own",
  "proposal.export",
  "ai.generate",
];

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  roles: string[];
  permissions: string[];
  hasPermission: (permissionName: string) => boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadUserData(userId: string) {
    try {
      // Load profile first
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      setProfile((p as Profile) ?? null);

      // Load roles - may fail if tables don't exist yet
      const assignedRoles: string[] = [];
      let roleIds: string[] = [];
      try {
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role, role_id, roles(name)")
          .eq("user_id", userId);

        for (const ur of userRoles ?? []) {
          if (ur.roles && typeof ur.roles === "object" && "name" in ur.roles && ur.roles.name) {
            assignedRoles.push(ur.roles.name);
          } else if (ur.role) {
            assignedRoles.push(ur.role);
          }
        }
        roleIds = (userRoles ?? []).map((ur) => ur.role_id).filter(Boolean) as string[];
      } catch {
        // Tables may not exist yet — silently fallback
        console.warn("[useAuth] user_roles query failed — tables may not exist yet");
      }

      const adminFlag = assignedRoles.includes("admin");
      setIsAdmin(adminFlag);
      setRoles(assignedRoles.length > 0 ? assignedRoles : ["user"]);

      // Fetch permissions from role_permissions
      let fetchedPerms: string[] = [];

      if (roleIds.length > 0) {
        try {
          const { data: rp } = await supabase
            .from("role_permissions")
            .select("permissions(name)")
            .in("role_id", roleIds);

          if (rp) {
            fetchedPerms = rp
              .map((item) =>
                item.permissions &&
                typeof item.permissions === "object" &&
                "name" in item.permissions
                  ? item.permissions.name
                  : null,
              )
              .filter(Boolean) as string[];
          }
        } catch {
          console.warn("[useAuth] role_permissions query failed — tables may not exist yet");
        }
      }

      if (fetchedPerms.length === 0) {
        fetchedPerms = adminFlag ? ALL_PERMISSIONS : DEFAULT_USER_PERMISSIONS;
      }

      setPermissions(Array.from(new Set(fetchedPerms)));
    } catch (err) {
      console.error("Error loading user RBAC data:", err);
    }
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const uid = s.user.id;
        setTimeout(() => void loadUserData(uid), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setRoles([]);
        setPermissions([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) void loadUserData(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const hasPermission = (permissionName: string) => {
    if (isAdmin) return true;
    return permissions.includes(permissionName);
  };

  const value: AuthState = {
    user,
    session,
    profile,
    isAdmin,
    roles,
    permissions,
    hasPermission,
    loading,
    refreshProfile: async () => {
      if (user) await loadUserData(user.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setIsAdmin(false);
      setRoles([]);
      setPermissions([]);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus digunakan di dalam AuthProvider");
  return ctx;
}
