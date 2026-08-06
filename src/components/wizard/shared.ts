import type { BudgetItem, LfaRow, Proposal, Section } from "@/hooks/useProposalData";
import type { Tables } from "@/integrations/supabase/types";

export type Donor = Tables<"donors">;

export type StepProps = {
  proposal: Proposal;
  sections: Section[];
  lfa: LfaRow[];
  budget: BudgetItem[];
  donor: Donor | null;
  refetch: () => void;
  save: (patch: Partial<Proposal>, immediate?: boolean) => void;
};

export function buildContext(p: Proposal, donor: Donor | null) {
  return {
    title: p.title ?? "",
    organization: p.organization_name ?? "",
    location: p.location ?? "",
    province: p.province ?? "",
    category: p.category ?? "",
    ideaSummary: p.idea_summary ?? "",
    durationMonths: Number(p.duration_months ?? 0),
    grantAmount: Number(p.grant_amount ?? 0),
    donorName: donor?.name ?? "",
    donorPriorities: donor?.priorities ?? [],
  };
}

export function aiErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/^Error:\s*/, "").slice(0, 200) || "Permintaan AI gagal.";
}