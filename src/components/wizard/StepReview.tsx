import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { NARRATIVE_SECTIONS, EXECUTIVE_SUMMARY_KEY, PROPOSAL_STATUSES } from "@/lib/constants";
import { budgetTotals } from "@/lib/budget";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StepProps } from "./shared";

export function StepReview({ proposal, sections, lfa, budget, donor, save }: StepProps) {
  const totals = budgetTotals(budget as never);
  const grant = Number(proposal.grant_amount ?? 0);
  const missingNarratives = NARRATIVE_SECTIONS.filter(
    (s) => !(sections.find((x) => x.section_type === s.key)?.content ?? "").trim(),
  );
  const overItems = budget.filter((b) => b.validation_status === "melebihi_standar");

  const checks = [
    { ok: Boolean(proposal.title && proposal.organization_name && proposal.province && proposal.category), label: "Informasi dasar proposal lengkap" },
    { ok: missingNarratives.length === 0, label: `Seluruh bagian narasi terisi${missingNarratives.length ? ` (kurang ${missingNarratives.length} bagian)` : ""}` },
    { ok: Boolean((sections.find((s) => s.section_type === EXECUTIVE_SUMMARY_KEY)?.content ?? "").trim()), label: "Executive Summary tersedia" },
    { ok: Boolean(proposal.donor_id), label: donor ? `Donor tujuan: ${donor.name}` : "Donor tujuan belum dipilih" },
    { ok: lfa.length >= 4, label: `Logical Framework memiliki ${lfa.length} baris` },
    { ok: budget.length > 0, label: `Rencana Anggaran Biaya memiliki ${budget.length} item` },
    { ok: overItems.length === 0, label: overItems.length ? `${overItems.length} item melebihi standar biaya tanpa alasan override` : "Seluruh item anggaran lolos validasi standar biaya" },
    { ok: grant > 0 && totals.grandTotal <= grant, label: `Total anggaran ${formatCurrency(totals.grandTotal)} terhadap nilai hibah ${formatCurrency(grant)}` },
  ];

  const passed = checks.filter((c) => c.ok).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Pemeriksaan akhir kelengkapan dan konsistensi dokumen sebelum diekspor.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant={passed === checks.length ? "default" : "secondary"}>
            {passed} dari {checks.length} pemeriksaan lolos
          </Badge>
          <Select
            value={proposal.status}
            onValueChange={(v) => save({ status: v as typeof proposal.status }, true)}
          >
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROPOSAL_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Daftar Periksa</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-start gap-2 text-sm">
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              )}
              <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {missingNarratives.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Bagian Narasi Belum Terisi</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {missingNarratives.map((s) => (
              <Badge key={s.key} variant="outline">{s.label}</Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}