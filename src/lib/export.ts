import type { BudgetItem, LfaRow, Proposal, Section } from "@/hooks/useProposalData";
import { NARRATIVE_SECTIONS, EXECUTIVE_SUMMARY_KEY } from "./constants";
import { formatCurrency, formatDate } from "./format";

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
  const base = title.replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 60) || "Proposal";
  return `${base}_${new Date().toISOString().slice(0, 10)}.${ext}`;
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
          `Baseline: ${row.baseline ?? "-"} | Target: ${row.target ?? "-"}`,
          `Verifikasi: ${row.means_of_verification ?? "-"}`,
          `Asumsi: ${row.assumption ?? "-"}`,
        ].join("\n"),
      );
    }
  }

  if (bundle.budget.length) {
    heading("Rencana Anggaran Biaya");
    for (const item of bundle.budget) {
      paragraph(
        `${item.category} — ${item.description} | ${item.volume} ${item.unit} x ${item.frequency} x ${formatCurrency(item.unit_price)} = ${formatCurrency(item.total ?? 0)}`,
      );
    }
    const total = bundle.budget.reduce((a, b) => a + Number(b.total ?? 0), 0);
    heading(`Total Anggaran: ${formatCurrency(total)}`, 12);
  }

  download(doc.output("blob"), safeFileName(p.title, "pdf"));
}

export async function exportDocx(bundle: ExportBundle) {
  const { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun, WidthType } = await import(
    "docx"
  );
  const p = bundle.proposal;

  const children: unknown[] = [];
  children.push(new Paragraph({ text: p.title, heading: HeadingLevel.TITLE }));
  children.push(
    new Paragraph({
      children: [
        new TextRun(`Organisasi: ${p.organization_name ?? "-"}`),
        new TextRun({ text: `Penanggung jawab: ${p.pic_name ?? "-"}`, break: 1 }),
        new TextRun({
          text: `Lokasi: ${[p.location, p.city, p.province].filter(Boolean).join(", ") || "-"}`,
          break: 1,
        }),
        new TextRun({
          text: `Periode: ${formatDate(p.start_date)} sampai ${formatDate(p.end_date)} (${p.duration_months} bulan)`,
          break: 1,
        }),
        new TextRun({ text: `Lembaga donor: ${bundle.donorName ?? "-"}`, break: 1 }),
        new TextRun({ text: `Nilai hibah: ${formatCurrency(p.grant_amount, p.currency)}`, break: 1 }),
      ],
    }),
  );

  const summary = sectionContent(bundle.sections, EXECUTIVE_SUMMARY_KEY);
  if (summary) {
    children.push(new Paragraph({ text: "Executive Summary", heading: HeadingLevel.HEADING_1 }));
    summary.split(/\n+/).forEach((t) => children.push(new Paragraph({ text: t })));
  }

  NARRATIVE_SECTIONS.forEach((s, i) => {
    const content = sectionContent(bundle.sections, s.key);
    if (!content) return;
    children.push(new Paragraph({ text: `${i + 1}. ${s.label}`, heading: HeadingLevel.HEADING_1 }));
    content.split(/\n+/).forEach((t) => children.push(new Paragraph({ text: t })));
  });

  if (bundle.lfa.length) {
    children.push(new Paragraph({ text: "Logical Framework Matrix", heading: HeadingLevel.HEADING_1 }));
    const header = ["Tingkat", "Uraian", "Indikator", "Target", "Verifikasi", "Asumsi"];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: header.map(
              (h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] }),
            ),
          }),
          ...bundle.lfa.map(
            (row) =>
              new TableRow({
                children: [
                  row.row_type,
                  row.goal || row.outcome || row.output || row.activity || "-",
                  row.indicator ?? "-",
                  row.target ?? "-",
                  row.means_of_verification ?? "-",
                  row.assumption ?? "-",
                ].map((v) => new TableCell({ children: [new Paragraph({ text: String(v) })] })),
              }),
          ),
        ],
      }),
    );
  }

  if (bundle.budget.length) {
    children.push(new Paragraph({ text: "Rencana Anggaran Biaya", heading: HeadingLevel.HEADING_1 }));
    const header = ["Kategori", "Uraian", "Volume", "Satuan", "Frekuensi", "Harga Satuan", "Total"];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: header.map(
              (h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] }),
            ),
          }),
          ...bundle.budget.map(
            (item) =>
              new TableRow({
                children: [
                  item.category,
                  item.description,
                  String(item.volume),
                  item.unit,
                  String(item.frequency),
                  formatCurrency(item.unit_price),
                  formatCurrency(item.total ?? 0),
                ].map((v) => new TableCell({ children: [new Paragraph({ text: String(v) })] })),
              }),
          ),
        ],
      }),
    );
  }

  const doc = new Document({ sections: [{ children: children as never }] });
  const blob = await Packer.toBlob(doc);
  download(blob, safeFileName(p.title, "docx"));
}

export async function exportXlsx(bundle: ExportBundle) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const rab = bundle.budget.map((item, i) => ({
    No: i + 1,
    Kode: item.code ?? "",
    Kategori: item.category,
    Aktivitas: item.activity_name ?? "",
    Uraian: item.description,
    Volume: Number(item.volume),
    Satuan: item.unit,
    Frekuensi: Number(item.frequency),
    "Harga Satuan": Number(item.unit_price),
    Subtotal: Number(item.subtotal ?? 0),
    "Pajak (persen)": Number(item.tax_rate),
    "Nilai Pajak": Number(item.tax_amount ?? 0),
    Total: Number(item.total ?? 0),
    Validasi: item.validation_status,
  }));
  const total = bundle.budget.reduce((a, b) => a + Number(b.total ?? 0), 0);
  rab.push({
    No: "" as never,
    Kode: "",
    Kategori: "TOTAL",
    Aktivitas: "",
    Uraian: "",
    Volume: "" as never,
    Satuan: "",
    Frekuensi: "" as never,
    "Harga Satuan": "" as never,
    Subtotal: "" as never,
    "Pajak (persen)": "" as never,
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
      { Field: "Judul", Nilai: p.title },
      { Field: "Organisasi", Nilai: p.organization_name ?? "" },
      { Field: "Penanggung jawab", Nilai: p.pic_name ?? "" },
      { Field: "Provinsi", Nilai: p.province ?? "" },
      { Field: "Lokasi", Nilai: p.location ?? "" },
      { Field: "Donor", Nilai: bundle.donorName ?? "" },
      { Field: "Nilai hibah", Nilai: Number(p.grant_amount) },
      { Field: "Durasi (bulan)", Nilai: p.duration_months },
    ]),
    "Informasi",
  );

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    safeFileName(p.title, "xlsx"),
  );
}