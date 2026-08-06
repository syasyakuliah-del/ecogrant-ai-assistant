import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  NarrativeInput,
  SummaryInput,
  LfaInput,
  BudgetInput,
  runNarrative,
  runSummary,
  runLfa,
  runBudget,
} from "./ai.server";

export const generateNarrative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NarrativeInput.parse(d))
  .handler(async ({ data }) => runNarrative(data));

export const generateExecutiveSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SummaryInput.parse(d))
  .handler(async ({ data }) => runSummary(data));

export const generateLogicalFramework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LfaInput.parse(d))
  .handler(async ({ data }) => runLfa(data));

export const generateBudgetPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BudgetInput.parse(d))
  .handler(async ({ data }) => runBudget(data));

export type NarrativeRequest = z.infer<typeof NarrativeInput>;