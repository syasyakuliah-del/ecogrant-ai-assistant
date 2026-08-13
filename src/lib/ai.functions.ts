import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  NarrativeInput,
  SummaryInput,
  LfaInput,
  BudgetInput,
  ActivityInput,
  ConsistencyInput,
  QualityReviewInput,
  runNarrative,
  runSummary,
  runLfa,
  runBudget,
  runActivities,
  runConsistencyCheck,
  runQualityReview,
} from "./ai.server";

export const generateNarrative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => NarrativeInput.parse(d))
  .handler(async ({ data }) => runNarrative(data));

export const generateExecutiveSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => SummaryInput.parse(d))
  .handler(async ({ data }) => runSummary(data));

export const generateLogicalFramework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => LfaInput.parse(d))
  .handler(async ({ data }) => runLfa(data));

export const generateBudgetPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => BudgetInput.parse(d))
  .handler(async ({ data }) => runBudget(data));

export const generateActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ActivityInput.parse(d))
  .handler(async ({ data }) => runActivities(data));

export const checkProposalConsistency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ConsistencyInput.parse(d))
  .handler(async ({ data }) => runConsistencyCheck(data));

export const reviewProposalQuality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => QualityReviewInput.parse(d))
  .handler(async ({ data }) => runQualityReview(data));

export type NarrativeRequest = z.infer<typeof NarrativeInput>;
