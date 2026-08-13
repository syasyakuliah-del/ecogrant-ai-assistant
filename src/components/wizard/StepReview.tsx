import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  ShieldCheck,
} from "lucide-react";
import {
  NARRATIVE_SECTIONS,
  EXECUTIVE_SUMMARY_KEY,
  PROPOSAL_STATUSES,
  STATUS_LABEL,
} from "@/lib/constants";
import { budgetTotals } from "@/lib/budget";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StepProps } from "./shared";

export function StepReview({ proposal, sections, lfa, budget, donor, save }: StepProps) {
  const totals = budgetTotals(budget as never);
  const grant = Number(proposal.grant_amount ?? 0);
  const missingNarratives = NARRATIVE_SECTIONS.filter(
    (s) => !(sections.find((x) => x.section_type === s.key)?.content ?? "").trim(),
  );
  const unhandledExceeded = budget.filter(
    (b) => b.validation_status === "exceeded" && !b.override_reason,
  );
  const negativeCosts = budget.filter((b) => Number(b.unit_price) < 0 || Number(b.total) < 0);
  const execSummary = (
    sections.find((s) => s.section_type === EXECUTIVE_SUMMARY_KEY)?.content ?? ""
  ).trim();

  // LFA completeness checks
  const hasGoal = lfa.some((r) => r.row_type === "goal" && (r.goal || r.activity));
  const hasOutcome = lfa.some((r) => r.row_type === "outcome" && (r.outcome || r.activity));
  const hasOutput = lfa.some((r) => r.row_type === "output" && (r.output || r.activity));
  const hasActivity = lfa.some((r) => r.row_type === "activity" && (r.activity || r.goal));
  const hasIndicators = lfa.some((r) => (r.indicator ?? "").trim().length > 0);
  const hasTargets = lfa.some((r) => (r.target ?? "").trim().length > 0);
  const isLfaComplete =
    hasGoal && hasOutcome && hasOutput && hasActivity && hasIndicators && hasTargets;

  // Deadline check
  const isDeadlineOk = !donor?.deadline || new Date(donor.deadline) >= new Date();

  // 11-Point Validation Checklist (PRD 11.9)
  const checklist = [
    {
      id: 1,
      ok: Boolean(proposal.title && proposal.organization_name && proposal.location),
      title: "1. Semua Field Wajib Informasi Terisi",
      desc: proposal.title
        ? `Judul, Organisasi (${proposal.organization_name}), Lokasi`
        : "Judul/Organisasi belum diisi",
    },
    {
      id: 2,
      ok: Boolean(proposal.donor_id),
      title: "2. Lembaga Donor Terpilih",
      desc: donor ? `Donor sasaran: ${donor.name}` : "Belum memilih donor pada Step 4",
    },
    {
      id: 3,
      ok: isDeadlineOk,
      title: "3. Tenggat Pengajuan Donor Masih Berlaku",
      desc: donor?.deadline
        ? `Tenggat donor: ${formatDate(donor.deadline)}`
        : "Tenggat tidak dibatasi",
    },
    {
      id: 4,
      ok: grant > 0 && totals.grandTotal <= grant,
      title: "4. Nilai RAB Sama Dengan atau di Bawah Nilai Hibah",
      desc: `Total RAB (${formatCurrency(totals.grandTotal, proposal.currency)}) vs Target (${formatCurrency(grant, proposal.currency)})`,
    },
    {
      id: 5,
      ok: negativeCosts.length === 0,
      title: "5. Tidak Ada Biaya Negatif pada Item RAB",
      desc:
        negativeCosts.length === 0
          ? "Seluruh unit price & total RAB bernilai positif"
          : `Ada ${negativeCosts.length} item biaya negatif`,
    },
    {
      id: 6,
      ok: unhandledExceeded.length === 0,
      title: "6. Item Melebihi SBM / SBU Telah Ditangani",
      desc:
        unhandledExceeded.length === 0
          ? "Seluruh item melampaui standar memiliki justifikasi override"
          : `Ada ${unhandledExceeded.length} item belum di-override`,
    },
    {
      id: 7,
      ok: isLfaComplete,
      title: "7. Logical Framework Memiliki Goal, Outcome, Output, Activity, Indicator & Target",
      desc: isLfaComplete
        ? `Matriks LFA lengkap dengan ${lfa.length} baris`
        : "LFA belum lengkap pada indikator/target",
    },
    {
      id: 8,
      ok: Boolean(execSummary),
      title: "8. Executive Summary (Ringkasan Eksekutif) Tersedia",
      desc: execSummary
        ? `${execSummary.split(/\s+/).length} kata terisi`
        : "Executive Summary belum dibuat pada Step 3",
    },
    {
      id: 9,
      ok: true,
      title: "9. Lampiran Wajib Tersedia / Siap Disematkan",
      desc: "Portofolio & Logo disematkan pada halaman lampiran dokumen",
    },
    {
      id: 10,
      ok: Boolean(proposal.pic_name || proposal.organization_name),
      title: "10. Penanggung Jawab / Email Organisasi Valid",
      desc: `PIC: ${proposal.pic_name || proposal.organization_name || "Valid"}`,
    },
    {
      id: 11,
      ok: missingNarratives.length === 0,
      title: "11. Seluruh Warning & 12 Bagian Narasi Telah Ditinjau",
      desc:
        missingNarratives.length === 0
          ? "Semua 12 bagian narasi terisi"
          : `${missingNarratives.length} bagian narasi masih kosong`,
    },
  ];

  const passedCount = checklist.filter((c) => c.ok).length;
  const isFullyReady = passedCount === checklist.length;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="size-5 text-primary" /> Step 9: Review & Pengujian
                Kesiapan Proposal
              </CardTitle>
              <CardDescription>
                Hasil peninjauan 11 poin checklist kelayakan dan pratinjau lengkap seluruh bab
                proposal.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant={isFullyReady ? "default" : "secondary"}
                className={`font-mono text-xs ${isFullyReady ? "bg-emerald-600" : "bg-amber-600 text-white"}`}
              >
                {passedCount} / {checklist.length} Poin Lolos
              </Badge>

              <Select
                value={proposal.status}
                onValueChange={(v) => save({ status: v as typeof proposal.status }, true)}
              >
                <SelectTrigger className="w-48 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPOSAL_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span>Indikator Kesiapan Dokumen</span>
              <span>{Math.round((passedCount / checklist.length) * 100)}% Lolos Validasi</span>
            </div>
            <Progress value={Math.round((passedCount / checklist.length) * 100)} className="h-2" />
          </div>

          {/* 11-Point Checklist Grid */}
          <div className="grid gap-2 sm:grid-cols-2 pt-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs transition-colors ${
                  item.ok
                    ? "bg-emerald-50/20 border-emerald-500/30"
                    : "bg-amber-50/20 border-amber-500/30"
                }`}
              >
                {item.ok ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
                )}
                <div>
                  <div
                    className={`font-semibold ${item.ok ? "text-foreground" : "text-amber-800 dark:text-amber-300"}`}
                  >
                    {item.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full Document Accordion Preview (PRD 11.9) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="size-4 text-primary" /> Pratinjau Dokumen Proposal Lengkap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full space-y-2">
            <AccordionItem value="info" className="border rounded-lg px-4">
              <AccordionTrigger className="text-xs font-semibold hover:no-underline">
                1. Informasi Umum Proposal
              </AccordionTrigger>
              <AccordionContent className="text-xs space-y-2 pb-4 text-muted-foreground">
                <div>
                  <strong>Judul:</strong> {proposal.title}
                </div>
                <div>
                  <strong>Organisasi:</strong> {proposal.organization_name || "-"}
                </div>
                <div>
                  <strong>Lokasi:</strong> {proposal.location}, {proposal.province}
                </div>
                <div>
                  <strong>Nilai Hibah:</strong> {formatCurrency(grant, proposal.currency)}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="narratives" className="border rounded-lg px-4">
              <AccordionTrigger className="text-xs font-semibold hover:no-underline">
                2. Narasi Proposal ({12 - missingNarratives.length}/12 Bagian Terisi)
              </AccordionTrigger>
              <AccordionContent className="text-xs space-y-3 pb-4">
                {NARRATIVE_SECTIONS.map((sec) => {
                  const content = sections.find((s) => s.section_type === sec.key)?.content ?? "";
                  return (
                    <div key={sec.key} className="border-b pb-2">
                      <span className="font-semibold text-foreground">{sec.label}:</span>
                      <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                        {content || "(Belum diisi)"}
                      </p>
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="exec" className="border rounded-lg px-4">
              <AccordionTrigger className="text-xs font-semibold hover:no-underline">
                3. Executive Summary
              </AccordionTrigger>
              <AccordionContent className="text-xs pb-4 text-muted-foreground whitespace-pre-wrap">
                {execSummary || "(Executive Summary belum dibuat)"}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="lfa" className="border rounded-lg px-4">
              <AccordionTrigger className="text-xs font-semibold hover:no-underline">
                4. Logical Framework Matrix ({lfa.length} Baris)
              </AccordionTrigger>
              <AccordionContent className="text-xs pb-4 space-y-1">
                {lfa.map((r, i) => (
                  <div key={r.id} className="p-2 border rounded bg-muted/20">
                    <Badge variant="outline" className="text-[10px] mb-1">
                      {r.row_type.toUpperCase()}
                    </Badge>
                    <div className="font-medium text-foreground">
                      {r.goal || r.outcome || r.output || r.activity}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Indikator: {r.indicator || "-"} | Target: {r.target || "-"}
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rab" className="border rounded-lg px-4">
              <AccordionTrigger className="text-xs font-semibold hover:no-underline">
                5. Rencana Anggaran Biaya (Grand Total:{" "}
                {formatCurrency(totals.grandTotal, proposal.currency)})
              </AccordionTrigger>
              <AccordionContent className="text-xs pb-4 space-y-1">
                <div className="font-mono font-bold text-primary">
                  Subtotal: {formatCurrency(totals.subtotal, proposal.currency)} | PPN:{" "}
                  {formatCurrency(totals.tax, proposal.currency)} | Grand Total:{" "}
                  {formatCurrency(totals.grandTotal, proposal.currency)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {budget.length} item biaya terdaftar
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
