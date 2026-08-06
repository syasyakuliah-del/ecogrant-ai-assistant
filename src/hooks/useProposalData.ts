import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type Proposal = Tables<"proposals">;
export type Section = Tables<"proposal_sections">;
export type LfaRow = Tables<"lfa_rows">;
export type BudgetItem = Tables<"budget_items">;
export type Donor = Tables<"donors">;

export function useProposalData(id: string) {
  const query = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const [proposal, sections, lfa, budget] = await Promise.all([
        supabase.from("proposals").select("*").eq("id", id).maybeSingle(),
        supabase.from("proposal_sections").select("*").eq("proposal_id", id).order("sort_order"),
        supabase.from("lfa_rows").select("*").eq("proposal_id", id).order("sort_order"),
        supabase.from("budget_items").select("*").eq("proposal_id", id).order("sort_order"),
      ]);
      if (proposal.error) throw proposal.error;
      return {
        proposal: proposal.data as Proposal | null,
        sections: (sections.data ?? []) as Section[],
        lfa: (lfa.data ?? []) as LfaRow[],
        budget: (budget.data ?? []) as BudgetItem[],
      };
    },
  });

  return query;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useAutosave(id: string) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<TablesUpdate<"proposals">>({});

  const flush = useCallback(async () => {
    const payload = pending.current;
    pending.current = {};
    if (Object.keys(payload).length === 0) return;
    setState("saving");
    const { error } = await supabase.from("proposals").update(payload).eq("id", id);
    if (error) {
      setState("error");
      return;
    }
    setState("saved");
    setSavedAt(new Date());
    void queryClient.invalidateQueries({ queryKey: ["proposal", id] });
  }, [id, queryClient]);

  const save = useCallback(
    (patch: TablesUpdate<"proposals">, immediate = false) => {
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      if (immediate) {
        void flush();
        return;
      }
      timer.current = setTimeout(() => void flush(), 1200);
    },
    [flush],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { save, flush, state, savedAt };
}

export function computeProgress(input: {
  proposal: Proposal;
  sections: Section[];
  lfa: LfaRow[];
  budget: BudgetItem[];
}) {
  const { proposal, sections, lfa, budget } = input;
  const checks = [
    Boolean(proposal.title && proposal.organization_name && proposal.province && proposal.category),
    sections.filter((s) => s.section_type !== "executive_summary" && s.content.trim().length > 0).length >= 6,
    sections.some((s) => s.section_type === "executive_summary" && s.content.trim().length > 0),
    Boolean(proposal.donor_id),
    lfa.length > 0,
    budget.some((b) => b.sbm_id),
    budget.some((b) => b.sbu_id),
    budget.length > 0,
    Boolean(proposal.grant_amount > 0 && budget.length > 0),
    proposal.status === "selesai" || proposal.status === "siap_ditinjau",
  ];
  const done = checks.filter(Boolean).length;
  return { percent: Math.round((done / checks.length) * 100), checks };
}