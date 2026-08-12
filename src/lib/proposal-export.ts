import * as XLSX from "xlsx";
import { formatCurrency, formatDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/constants";

export interface ProposalExportRow {
  id: string;
  title: string;
  organization_name?: string | null;
  donor_name?: string | null;
  grant_amount: number;
  currency: string;
  status: string;
  progress_percent: number;
  created_at: string;
  updated_at: string;
}

export function exportProposalsToXLSX(proposals: ProposalExportRow[], filename = "ecogrant_proposals.xlsx") {
  const data = proposals.map((p, idx) => ({
    No: idx + 1,
    "ID Proposal": p.id,
    "Judul Proposal": p.title,
    Organisasi: p.organization_name || "-",
    Donor: p.donor_name || "-",
    "Nilai Hibah": formatCurrency(p.grant_amount, p.currency),
    Status: STATUS_LABEL[p.status] || p.status,
    "Progress (%)": `${p.progress_percent}%`,
    "Tanggal Dibuat": formatDate(p.created_at),
    "Terakhir Diperbarui": formatDate(p.updated_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Proposal");
  XLSX.writeFile(workbook, filename);
}

export function exportProposalsToJSON(proposals: ProposalExportRow[], filename = "ecogrant_proposals.json") {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(proposals, null, 2))}`;
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", jsonString);
  downloadAnchor.setAttribute("download", filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
