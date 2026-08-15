import type { BudgetItem, LfaRow, Proposal, Section } from "@/hooks/useProposalData";
import { NARRATIVE_SECTIONS, EXECUTIVE_SUMMARY_KEY } from "./constants";
import { formatCurrency, formatDate } from "./format";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";


export type ExportBundle = {
  proposal: Proposal;
  sections: Section[];
  lfa: LfaRow[];
  budget: BudgetItem[];
  donorName?: string | null;
};

function sectionContent(sections: Section[], key: string) {
  return sections.find((s) => s.section_type === key)?.content?.trim() ?? "";
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function safeFileName(title: string, ext: string) {
  const base =
    title
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 60) || "Proposal";
  return `${base}_v1.0_${new Date().toISOString().slice(0, 10)}.${ext}`;
}

async function recordExport(proposalId: string, format: string, exportType: string = "proposal") {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    await supabase.from("exports").insert({
      user_id: userRes.user.id,
      proposal_id: proposalId,
      export_type: exportType,
      format,
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    await logAudit({
      action: "data.export",
      entityType: "export",
      entityId: proposalId,
      newValues: { format, exportType },
    });
  } catch {
    // non-blocking
  }
}

export async function exportPdf(bundle: ExportBundle) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  function ensure(space: number) {
    if (y + space > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text: string, size = 13) {
    ensure(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.text(text, margin, y);
    y += size + 8;
  }

  function paragraph(text: string) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(text, width) as string[];
    for (const line of lines) {
      ensure(16);
      doc.text(line, margin, y);
      y += 15;
    }
    y += 8;
  }

  const p = bundle.proposal;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(doc.splitTextToSize(p.title, width) as string[], margin, y);
  y += 34;

  paragraph(
    [
      `Organisasi: ${p.organization_name ?? "-"}`,
      `Penanggung jawab: ${p.pic_name ?? "-"}`,
      `Lokasi: ${[p.location, p.city, p.province].filter(Boolean).join(", ") || "-"}`,
      `Periode: ${formatDate(p.start_date)} sampai ${formatDate(p.end_date)} (${p.duration_months} bulan)`,
      `Lembaga donor: ${bundle.donorName ?? "-"}`,
      `Nilai hibah: ${formatCurrency(p.grant_amount, p.currency)}`,
    ].join("\n"),
  );

  const summary = sectionContent(bundle.sections, EXECUTIVE_SUMMARY_KEY);
  if (summary) {
    heading("Executive Summary");
    paragraph(summary);
  }

  NARRATIVE_SECTIONS.forEach((s, i) => {
    const content = sectionContent(bundle.sections, s.key);
    if (!content) return;
    heading(`${i + 1}. ${s.label}`);
    paragraph(content);
  });

  if (bundle.lfa.length) {
    heading("Logical Framework Matrix");
    for (const row of bundle.lfa) {
      paragraph(
        [
          `Tingkat: ${row.row_type}`,
          `Uraian: ${row.goal || row.outcome || row.output || row.activity || "-"}`,
          `Indikator: ${row.indicator ?? "-"}`,
          `Target: ${row.target ?? "-"}`,
          `Verifikasi: ${row.means_of_verification ?? "-"}`,
        ].join("\n"),
      );
    }
  }

  const pdfBlob = doc.output("blob");
  download(pdfBlob, safeFileName(p.title, "pdf"));
  await recordExport(p.id, "pdf");
}

export async function exportDocx(bundle: ExportBundle) {
  const docx = await import("docx");
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
  } = docx;
  const p = bundle.proposal;

  const children: (typeof Paragraph.prototype | typeof Table.prototype)[] = [
    new Paragraph({
      text: p.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Organisasi: ${p.organization_name ?? "-"}`, break: 1 }),
        new TextRun({ text: `Penanggung jawab: ${p.pic_name ?? "-"}`, break: 1 }),
        new TextRun({
          text: `Lokasi: ${[p.location, p.city, p.province].filter(Boolean).join(", ") || "-"}`,
          break: 1,
        }),
        new TextRun({
          text: `Periode: ${formatDate(p.start_date)} - ${formatDate(p.end_date)} (${p.duration_months} bulan)`,
          break: 1,
        }),
        new TextRun({ text: `Lembaga donor: ${bundle.donorName ?? "-"}`, break: 1 }),
        new TextRun({
          text: `Nilai hibah: ${formatCurrency(p.grant_amount, p.currency)}`,
          break: 1,
        }),
      ],
      spacing: { after: 300 },
    }),
  ];

  const summary = sectionContent(bundle.sections, EXECUTIVE_SUMMARY_KEY);
  if (summary) {
    children.push(
      new Paragraph({
        text: "Executive Summary",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      }),
      new Paragraph({ text: summary, spacing: { after: 200 } }),
    );
  }

  NARRATIVE_SECTIONS.forEach((s, i) => {
    const content = sectionContent(bundle.sections, s.key);
    if (!content) return;
    children.push(
      new Paragraph({
        text: `${i + 1}. ${s.label}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      }),
      new Paragraph({ text: content, spacing: { after: 200 } }),
    );
  });

  const doc = new Document({
    sections: [{ properties: {}, children: children as never }],
  });

  const blob = await Packer.toBlob(doc);
  download(blob, safeFileName(p.title, "docx"));
  await recordExport(p.id, "docx");
}

export async function exportXlsx(bundle: ExportBundle) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const rab = bundle.budget.map((b, i) => ({
    No: i + 1,
    Kode: b.code ?? "-",
    Kategori: b.category,
    Aktivitas: b.activity_name ?? "-",
    Uraian: b.description,
    Volume: Number(b.volume),
    Satuan: b.unit,
    Frekuensi: Number(b.frequency),
    "Harga Satuan": Number(b.unit_price),
    Subtotal: Number(b.subtotal ?? Number(b.volume) * Number(b.frequency) * Number(b.unit_price)),
    "Pajak (%)": Number(b.tax_rate) * 100,
    "Nilai Pajak": Number(b.tax_amount ?? 0),
    Total: Number(b.total ?? 0),
    Validasi: b.validation_status ?? "belum_divalidasi",
  }));

  const total = bundle.budget.reduce((a, b) => a + Number(b.total ?? 0), 0);
  rab.push({
    No: "" as never,
    Kode: "",
    Kategori: "TOTAL PROPOSAL",
    Aktivitas: "",
    Uraian: "",
    Volume: "" as never,
    Satuan: "",
    Frekuensi: "" as never,
    "Harga Satuan": "" as never,
    Subtotal: "" as never,
    "Pajak (%)": "" as never,
    "Nilai Pajak": "" as never,
    Total: total,
    Validasi: "",
  });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rab), "RAB");

  const lfa = bundle.lfa.map((row) => ({
    Tingkat: row.row_type,
    Uraian: row.goal || row.outcome || row.output || row.activity || "",
    Indikator: row.indicator ?? "",
    Baseline: row.baseline ?? "",
    Target: row.target ?? "",
    Verifikasi: row.means_of_verification ?? "",
    Asumsi: row.assumption ?? "",
  }));
  if (lfa.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lfa), "LFA");

  const p = bundle.proposal;
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { Field: "Judul Proposal", Nilai: p.title },
      { Field: "Organisasi", Nilai: p.organization_name ?? "" },
      { Field: "Penanggung Jawab", Nilai: p.pic_name ?? "" },
      { Field: "Provinsi", Nilai: p.province ?? "" },
      { Field: "Lokasi", Nilai: p.location ?? "" },
      { Field: "Donor Target", Nilai: bundle.donorName ?? "" },
      { Field: "Nilai Hibah (IDR)", Nilai: Number(p.grant_amount) },
      { Field: "Durasi (Bulan)", Nilai: p.duration_months },
    ]),
    "Informasi",
  );

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    safeFileName(p.title, "xlsx"),
  );
  await recordExport(p.id, "xlsx");
}
