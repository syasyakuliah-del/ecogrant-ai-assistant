import { useState } from "react";
import { FileSpreadsheet, FileText, FileType, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportDocx, exportPdf, exportXlsx, type ExportBundle } from "@/lib/export";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StepProps } from "./shared";

const FORMATS = [
  {
    key: "pdf" as const,
    label: "Dokumen PDF",
    description: "Dokumen naratif siap kirim lengkap dengan Logical Framework dan ringkasan anggaran.",
    icon: FileText,
  },
  {
    key: "docx" as const,
    label: "Dokumen Word",
    description: "Versi yang dapat disunting kembali untuk penyesuaian format lembaga donor.",
    icon: FileType,
  },
  {
    key: "xlsx" as const,
    label: "Lembar Kerja Excel",
    description: "Rencana Anggaran Biaya dan Logical Framework dalam format tabel perhitungan.",
    icon: FileSpreadsheet,
  },
];

export function StepExport({ proposal, sections, lfa, budget, donor }: StepProps) {
  const [busy, setBusy] = useState<string | null>(null);

  async function handleExport(format: "pdf" | "docx" | "xlsx") {
    setBusy(format);
    try {
      const bundle: ExportBundle = { proposal, sections, lfa, budget, donorName: donor?.name ?? null };
      if (format === "pdf") await exportPdf(bundle);
      else if (format === "docx") await exportDocx(bundle);
      else await exportXlsx(bundle);
      void logAudit("export", "proposal", proposal.id, { format });
      toast.success(`Dokumen ${format.toUpperCase()} berhasil diunduh.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ekspor dokumen gagal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Seluruh format diambil dari data proposal yang sama sehingga narasi, Logical Framework, dan anggaran selalu
        konsisten antar dokumen.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {FORMATS.map((f) => (
          <Card key={f.key}>
            <CardHeader className="pb-3">
              <f.icon className="size-6 text-primary" />
              <CardTitle className="text-base">{f.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{f.description}</p>
              <Button
                className="w-full"
                disabled={busy !== null}
                onClick={() => void handleExport(f.key)}
              >
                {busy === f.key ? <Loader2 className="size-4 animate-spin" /> : <f.icon className="size-4" />}
                Unduh {f.key.toUpperCase()}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}