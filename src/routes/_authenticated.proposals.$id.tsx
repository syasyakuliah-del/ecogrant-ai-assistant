import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import { useProposalData, useAutosave, computeProgress } from "@/hooks/useProposalData";
import { WIZARD_STEPS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { StepProps, Donor } from "@/components/wizard/shared";
import { StepInfo } from "@/components/wizard/StepInfo";
import { StepNarrative } from "@/components/wizard/StepNarrative";
import { StepSummary } from "@/components/wizard/StepSummary";
import { StepDonor } from "@/components/wizard/StepDonor";
import { StepLfa } from "@/components/wizard/StepLfa";
import { StepStandards } from "@/components/wizard/StepStandards";
import { StepBudget } from "@/components/wizard/StepBudget";
import { StepReview } from "@/components/wizard/StepReview";
import { StepExport } from "@/components/wizard/StepExport";
import { ProposalMembersModal } from "@/components/ProposalMembersModal";

export const Route = createFileRoute("/_authenticated/proposals/$id")({
  head: () => ({
    meta: [
      { title: "Wizard Penyusunan Proposal — EcoGrant AI" },
      { name: "description", content: "Susun proposal hibah 10 langkah lengkap dengan Asisten AI, LFA, SBM/SBU sync, RAB, & Export." },
      { property: "og:title", content: "Wizard Penyusunan Proposal — EcoGrant AI" },
      { property: "og:description", content: "Penyusunan narasi, Logical Framework Matrix, dan RAB proposal hibah." },
    ],
  }),
  component: WizardPage,
});

function WizardPage() {
  const { id } = Route.useParams();
  const { data, isLoading, refetch } = useProposalData(id);

  const currentVersion = data?.proposal?.version_number ?? 1;
  const { save, retrySave, state: autosaveState, lastError } = useAutosave(id, currentVersion);
  const [step, setStep] = useState(1);

  const donorId = data?.proposal?.donor_id ?? null;
  const { data: donor } = useQuery({
    queryKey: ["donor", donorId],
    enabled: Boolean(donorId),
    queryFn: async () => {
      const { data, error } = await supabase.from("donors").select("*").eq("id", donorId!).maybeSingle();
      if (error) throw error;
      return data as Donor | null;
    },
  });

  if (isLoading || !data?.proposal) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Memuat data proposal wizard...
      </div>
    );
  }

  const p = data.proposal;
  const progress = computeProgress({ proposal: p, sections: data.sections, lfa: data.lfa, budget: data.budget });
  const stepProps: StepProps = {
    proposal: p,
    sections: data.sections,
    lfa: data.lfa,
    budget: data.budget,
    donor: donor ?? null,
    refetch: () => void refetch(),
    save,
  };
  const currentStepInfo = WIZARD_STEPS.find((s) => s.step === step) ?? WIZARD_STEPS[0]!;

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.title || "Proposal Tanpa Judul"}
        description={`Wizard Penyusunan Proposal — Step ${currentStepInfo.step}: ${currentStepInfo.title}`}
        actions={
            <ProposalMembersModal proposalId={p.id} proposalTitle={p.title} />

            <Badge
              variant={
                autosaveState === "saving"
                  ? "secondary"
                  : autosaveState === "saved"
                  ? "default"
                  : autosaveState === "error" || autosaveState === "conflict"
                  ? "destructive"
                  : "outline"
              }
              className="text-xs font-medium gap-1 px-2.5 py-1"
            >
              {autosaveState === "saving" && <Loader2 className="size-3 animate-spin" />}
              {autosaveState === "saved" && <CheckCircle2 className="size-3 text-emerald-400" />}
              {autosaveState === "error" && <AlertCircle className="size-3" />}
              {autosaveState === "conflict" && <AlertTriangle className="size-3" />}

              {autosaveState === "saving"
                ? "Menyimpan (Autosave 3s)..."
                : autosaveState === "saved"
                ? "Tersimpan"
                : autosaveState === "error"
                ? "Gagal Menyimpan"
                : autosaveState === "conflict"
                ? "Konflik Versi"
                : "Autosave Aktif"}
            </Badge>

            {(autosaveState === "error" || autosaveState === "conflict") && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={retrySave}>
                <RotateCcw className="size-3" /> Coba Lagi
              </Button>
            )}
          </div>
        }
      />

      {/* Optimistic Locking Conflict Warning Alert */}
      {autosaveState === "conflict" && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Terjadi Konflik Versi (Optimistic Lock)</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Data proposal di server telah diperbarui oleh sesi lain. Muat ulang halaman untuk menyelaraskan versi terbaru.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress & Step Navigation */}
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
            <span className="text-muted-foreground flex items-center gap-1.5">
              Kelengkapan Berkas Proposal
            </span>
            <span className="font-mono text-primary font-bold">{progress.percent}% Selesai</span>
          </div>
          <Progress value={progress.percent} className="h-2" />

          {/* 10 Step Buttons Grid */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {WIZARD_STEPS.map((s) => {
              const isCurrent = s.step === step;
              const isChecked = progress.checks[s.step - 1];
              return (
                <button key={s.step} type="button" onClick={() => setStep(s.step)}>
                  <Badge
                    variant={isCurrent ? "default" : isChecked ? "secondary" : "outline"}
                    className={`cursor-pointer transition-colors text-xs py-1 px-2.5 ${
                      isCurrent
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : isChecked
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "hover:bg-muted"
                    }`}
                  >
                    {s.step}. {s.short}
                  </Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Render Area */}
      <div>
        {step === 1 && <StepInfo {...stepProps} />}
        {step === 2 && <StepNarrative {...stepProps} />}
        {step === 3 && <StepSummary {...stepProps} />}
        {step === 4 && <StepDonor {...stepProps} />}
        {step === 5 && <StepLfa {...stepProps} />}
        {step === 6 && <StepStandards {...stepProps} source="sbm" />}
        {step === 7 && <StepStandards {...stepProps} source="sbu" />}
        {step === 8 && <StepBudget {...stepProps} />}
        {step === 9 && <StepReview {...stepProps} />}
        {step === 10 && <StepExport {...stepProps} />}
      </div>

      {/* Previous & Next Navigation Controls */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className="gap-1.5 text-xs sm:text-sm"
        >
          <ChevronLeft className="size-4" /> Langkah Sebelumnya ({step > 1 ? WIZARD_STEPS[step - 2]?.short : ""})
        </Button>

        <span className="text-xs font-semibold text-muted-foreground font-mono">
          Langkah {step} dari 10
        </span>

        <Button
          disabled={step === 10}
          onClick={() => setStep((s) => Math.min(10, s + 1))}
          className="gap-1.5 text-xs sm:text-sm shadow-sm"
        >
          Langkah Selanjutnya ({step < 10 ? WIZARD_STEPS[step]?.short : ""}) <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}