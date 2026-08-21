import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

export type PlanId = "starter" | "basic" | "premium";

export type MembershipPlan = {
  id: PlanId;
  name: string;
  priceMonthly: number;
  currency: string;
  description: string;
  popular: boolean;
  ctaText: string;
  badgeText?: string;
  limits: {
    proposalQuota: number; // e.g. 3, 10, 999
    aiQuota: number; // e.g. 50, 200, 1000
    priorityProcessing: boolean;
    advancedAi: boolean;
    premiumSupport: boolean;
  };
};

export const MEMBERSHIP_PLANS: Record<PlanId, MembershipPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthly: 49000,
    currency: "IDR",
    description: "Untuk pengguna yang baru mulai menyusun proposal pendanaan lingkungan.",
    popular: false,
    ctaText: "Pilih Starter",
    limits: {
      proposalQuota: 2,
      aiQuota: 50,
      priorityProcessing: false,
      advancedAi: false,
      premiumSupport: false,
    },
  },
  basic: {
    id: "basic",
    name: "Basic",
    priceMonthly: 79000,
    currency: "IDR",
    description: "Untuk pengguna yang membutuhkan workflow proposal yang lebih lengkap dan cepat.",
    popular: true,
    badgeText: "PALING POPULER",
    ctaText: "Pilih Basic",
    limits: {
      proposalQuota: 5,
      aiQuota: 200,
      priorityProcessing: true,
      advancedAi: true,
      premiumSupport: false,
    },
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceMonthly: 149000,
    currency: "IDR",
    description: "Untuk pengguna dengan kebutuhan penyusunan proposal intensif dan profesional.",
    popular: false,
    ctaText: "Pilih Premium",
    limits: {
      proposalQuota: 10,
      aiQuota: 1000,
      priorityProcessing: true,
      advancedAi: true,
      premiumSupport: true,
    },
  },
};

export type UserSubscription = {
  id?: string;
  userId: string;
  planId: PlanId;
  status: "active" | "pending" | "expired" | "cancelled";
  startedAt: string;
  expiresAt: string | null;
};

type MembershipContextType = {
  currentPlan: MembershipPlan;
  subscription: UserSubscription | null;
  isLoading: boolean;
  proposalCount: number;
  canUseFeature: (featureKey: string) => boolean;
  upgradePlan: (targetPlanId: PlanId) => Promise<boolean>;
};

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query User Subscription from Supabase
  const { data: subData, isLoading: isSubLoading } = useQuery({
    queryKey: ["user-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (error) {
          console.warn("[useMembership] DB Query warning:", error.message);
          return null;
        }

        if (data) {
          return {
            id: data.id,
            userId: data.user_id,
            planId: (data.plan_id as PlanId) || "starter",
            status: data.status || "active",
            startedAt: data.started_at,
            expiresAt: data.expires_at,
          } as UserSubscription;
        }
      } catch (err) {
        console.warn("[useMembership] Failed to fetch subscription:", err);
      }
      return null;
    },
  });

  // Query actual user proposal count for usage quota calculations
  const { data: proposalCount = 0 } = useQuery({
    queryKey: ["user-proposal-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user!.id)
        .is("deleted_at", null);
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Active Plan determination
  const activePlanId: PlanId = subData?.planId || "starter";
  const currentPlan = MEMBERSHIP_PLANS[activePlanId] || MEMBERSHIP_PLANS.starter;

  // Feature Entitlement Check
  const canUseFeature = (featureKey: string): boolean => {
    if (!user) return false;
    switch (featureKey) {
      case "proposal_generation":
        return proposalCount < currentPlan.limits.proposalQuota;
      case "priority_processing":
        return currentPlan.limits.priorityProcessing;
      case "advanced_ai":
        return currentPlan.limits.advancedAi;
      case "premium_support":
        return currentPlan.limits.premiumSupport;
      case "lfa_generation":
      case "costing_engine":
      case "export_pdf":
      case "export_docx":
      case "export_xlsx":
        return true;
      default:
        return true;
    }
  };

  // Mutation: Upgrade Plan
  const upgradeMutation = useMutation({
    mutationFn: async (targetPlanId: PlanId) => {
      if (!user) throw new Error("Pengguna belum terautentikasi.");

      const previousPlanId = currentPlan.id;

      // Attempt to upsert subscription in Supabase
      const { data, error } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan_id: targetPlanId,
            status: "active",
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) {
        console.warn("[useMembership] Upsert warning:", error.message);
      }

      // Log Audit Event
      await logAudit({
        action: "membership_upgraded",
        entityType: "subscription",
        entityId: data?.id || user.id,
        details: {
          previousPlan: previousPlanId,
          newPlan: targetPlanId,
          priceMonthly: MEMBERSHIP_PLANS[targetPlanId].priceMonthly,
        },
      });

      return targetPlanId;
    },
    onSuccess: (targetPlanId) => {
      void queryClient.invalidateQueries({ queryKey: ["user-subscription", user?.id] });
      toast.success(
        `Membership berhasil diperbarui! Paket Anda sekarang adalah ${MEMBERSHIP_PLANS[targetPlanId].name}.`,
        { duration: 5000 }
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || "Upgrade belum berhasil. Silakan coba kembali.");
    },
  });

  const upgradePlan = async (targetPlanId: PlanId): Promise<boolean> => {
    try {
      await upgradeMutation.mutateAsync(targetPlanId);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <MembershipContext.Provider
      value={{
        currentPlan,
        subscription: subData ?? null,
        isLoading: isSubLoading,
        proposalCount,
        canUseFeature,
        upgradePlan,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error("useMembership harus digunakan di dalam MembershipProvider");
  }
  return context;
}
