import type { BudgetItem, LfaRow, Proposal, Section } from "@/hooks/useProposalData";
import type { Donor } from "@/components/wizard/shared";

export type ValidationIssue = {
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type ProposalSubmissionValidation = {
  canSubmit: boolean;
  issues: ValidationIssue[];
};

export function validateProposalCompleteness(
  proposal: Partial<Proposal> | null,
  sections: Section[] = [],
  lfaRows: LfaRow[] = [],
  budgetItems: BudgetItem[] = [],
  donor: Donor | null = null,
  isAdminOverride: boolean = false
): ProposalSubmissionValidation {
  const issues: ValidationIssue[] = [];

  if (!proposal) {
    return { canSubmit: false, issues: [{ field: "proposal", message: "Data proposal tidak ditemukan.", severity: "error" }] };
  }

  // Rule 1: Completeness
  if (!proposal.title?.trim()) {
    issues.push({ field: "title", message: "Judul proposal belum diisi.", severity: "error" });
  }

  // Rule 2: Mandatory Donor
  if (!proposal.donor_id || !donor) {
    issues.push({ field: "donor_id", message: "Lembaga donor wajib dipilih sebelum mengajukan proposal.", severity: "error" });
  }

  // Rule 3: Donor Deadline Check
  if (donor?.deadline) {
    const deadlineDate = new Date(donor.deadline);
    const now = new Date();
    if (deadlineDate < now && !isAdminOverride) {
      issues.push({
        field: "deadline",
        message: `Tenggat pengajuan donor (${donor.deadline}) telah terlewati. Diperlukan persetujuan override dari Admin.`,
        severity: "error",
      });
    }
  }

  // Narrative Sections Completeness Check
  const completedSections = sections.filter((s) => (s.content?.trim().length ?? 0) > 30);
  if (completedSections.length < 3) {
    issues.push({
      field: "sections",
      message: `Minimal 3 bab narasi proposal harus diisi lengkap. (Saat ini: ${completedSections.length})`,
      severity: "error",
    });
  }

  // LFA Matrix Check
  if (lfaRows.length === 0) {
    issues.push({ field: "lfa", message: "Matriks Kerangka Logis (LFA) belum berisi indikator kegiatan.", severity: "error" });
  }

  // RAB Budget Check
  if (budgetItems.length === 0) {
    issues.push({ field: "budget", message: "Rencana Anggaran Biaya (RAB) belum berisi rincian item.", severity: "error" });
  }

  // Rule 4: Non-negative Grand Total
  const grandTotal = budgetItems.reduce((acc, item) => acc + Number(item.total ?? 0), 0);
  if (grandTotal < 0) {
    issues.push({ field: "grand_total", message: "Grand Total RAB tidak boleh bernilai negatif.", severity: "error" });
  }

  // Rule 5: Grand Total vs Grant Amount
  const grantAmount = Number(proposal.grant_amount ?? 0);
  if (grantAmount > 0 && grandTotal > grantAmount) {
    issues.push({
      field: "grant_amount",
      message: `Grand Total RAB (Rp ${grandTotal.toLocaleString("id-ID")}) melebihi nilai hibah maksimal (Rp ${grantAmount.toLocaleString("id-ID")}).`,
      severity: "warning",
    });
  }

  // Rule 6: RAB SBM/SBU Exceeded Status Check
  const unvalidatedExceeded = budgetItems.filter((i) => i.validation_status === "melebihi" && !i.override_reason);
  if (unvalidatedExceeded.length > 0) {
    issues.push({
      field: "sbm_sbu_validation",
      message: `${unvalidatedExceeded.length} item RAB melebihi batas SBM/SBU tanpa alasan override resmi.`,
      severity: "error",
    });
  }

  // Rule 7: Approved proposal lock check
  if (proposal.status === "disetujui") {
    issues.push({
      field: "status",
      message: "Proposal yang sudah disetujui hanya dapat diedit setelah dikembalikan ke status 'Perlu Revisi'.",
      severity: "error",
    });
  }

  const hasErrors = issues.some((i) => i.severity === "error");

  return {
    canSubmit: !hasErrors,
    issues,
  };
}

export function validateUniqueStandardsConstraint(
  year: number,
  version: string,
  code: string,
  regionOrProvince: string,
  existingItems: Array<{ year: number; version: string; code: string; region_code?: string; province_code?: string; id?: string }>,
  currentId?: string
): { isDuplicate: boolean; message?: string } {
  const isDuplicate = existingItems.some(
    (item) =>
      item.id !== currentId &&
      item.year === year &&
      item.version.toLowerCase() === version.toLowerCase() &&
      item.code.toUpperCase() === code.toUpperCase() &&
      (item.region_code?.toUpperCase() === regionOrProvince.toUpperCase() || item.province_code?.toUpperCase() === regionOrProvince.toUpperCase())
  );

  if (isDuplicate) {
    return {
      isDuplicate: true,
      message: `Kode standar ${code.toUpperCase()} sudah ada pada Tahun ${year}, Versi ${version}, dan Wilayah/Provinsi ${regionOrProvince.toUpperCase()}.`,
    };
  }

  return { isDuplicate: false };
}
