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

export type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";

export function useAutosave(id: string, currentVersion = 1) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<TablesUpdate<"proposals">>({});
  const lastFailedPayload = useRef<TablesUpdate<"proposals">>({});

  const flush = useCallback(async () => {
    const payload = { ...pending.current };
    if (Object.keys(payload).length === 0) return;

    setState("saving");
    setLastError(null);
    lastFailedPayload.current = payload;
    pending.current = {};

    // Backup pending to LocalStorage before network attempt
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`ecogrant_draft_${id}`, JSON.stringify(payload));
      }
    } catch {
      // LocalStorage quota/access fallback
    }

    // Optimistic locking: Increment version_number on update
    const updatePayload = {
      ...payload,
      version_number: currentVersion + 1,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from("proposals")
      .update(updatePayload)
      .eq("id", id)
      .select("version_number, updated_at")
      .maybeSingle();

    if (error) {
      console.error("Autosave error:", error);
      pending.current = { ...lastFailedPayload.current, ...pending.current };
      setState("error");
      setLastError(error.message);
      return;
    }

    if (!updated) {
      // Optimistic lock conflict
      console.warn("Autosave conflict detected!");
      setState("conflict");
      setLastError("Konflik versi: Data di server telah diperbarui oleh pengguna lain.");
      return;
    }

    // Clear local backup draft on successful server sync
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(`ecogrant_draft_${id}`);
      }
    } catch {
      // Ignore
    }

    setState("saved");
    setSavedAt(new Date());
    void queryClient.invalidateQueries({ queryKey: ["proposal", id] });
  }, [id, currentVersion, queryClient]);

  const save = useCallback(
    (patch: TablesUpdate<"proposals">, immediate = false) => {
      pending.current = { ...pending.current, ...patch };
      // Save draft immediately to LocalStorage on edit
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(`ecogrant_draft_${id}`, JSON.stringify(pending.current));
        }
      } catch {
        // Ignore
      }

      if (timer.current) clearTimeout(timer.current);
      if (immediate) {
        void flush();
        return;
      }
      // Debounce 3.000 milliseconds for network efficiency & LocalStorage fallback
      timer.current = setTimeout(() => void flush(), 3000);
    },
    [flush, id],
  );

  const retrySave = useCallback(() => {
    if (Object.keys(lastFailedPayload.current).length > 0) {
      pending.current = { ...lastFailedPayload.current, ...pending.current };
      void flush();
    }
  }, [flush]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { save, flush, retrySave, state, savedAt, lastError };
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
    sections.filter((s) => s.section_type !== "executive_summary" && s.content.trim().length > 0)
      .length >= 6,
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
