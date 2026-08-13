import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FileType,
  History,
  ImageIcon,
  Layout,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { exportDocx, exportPdf, exportXlsx, type ExportBundle } from "@/lib/export";
import { logAudit } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StepProps } from "./shared";

const TEMPLATES = [
  {
    id: "classic",
    name: "Klasik Hijau EcoGrant",
    desc: "Format standar laporan hibah lingkungan dengan aksen warna hijau.",
  },
  {
    id: "modern",
    name: "Modern Minimalis",
    desc: "Format bersih dan kontemporer untuk hibah internasional.",
  },
  {
    id: "formal",
    name: "Formal Kementerian / Lembaga",
    desc: "Format baku sesuai tata naskah dinas kementerian.",
  },
];

const FORMAT_OPTIONS = [
  {
    key: "pdf",
    label: "PDF Proposal Lengkap",
    desc: "Naskah lengkap + LFA + RAB dengan halaman dan watermark DRAFT.",
    icon: FileText,
  },
  {
    key: "docx",
    label: "DOCX Word Proposal",
    desc: "Dokumen yang dapat disunting kembali untuk format donor khusus.",
    icon: FileType,
  },
  {
    key: "xlsx_proposal",
    label: "XLSX Proposal Complete",
    desc: "Tabel narasi, LFA, dan RAB dalam satu workbook Excel.",
    icon: FileSpreadsheet,
  },
  {
    key: "xlsx_rab",
    label: "XLSX RAB Khusus",
    desc: "Formulasi Rencana Anggaran Biaya lengkap dengan formula & PPN.",
    icon: FileSpreadsheet,
  },
  {
    key: "xlsx_lfa",
    label: "XLSX Logical Framework",
    desc: "Matriks LFA lengkap dengan Goal, Outcome, Output, & Activity.",
    icon: FileSpreadsheet,
  },
] as const;

interface ExportJob {
  id: string;
  format: string;
  template: string;
  status: "antre" | "diproses" | "berhasil" | "gagal";
  created_at: string;
}

export function StepExport({ proposal, sections, lfa, budget, donor }: StepProps) {
  const [template, setTemplate] = useState("classic");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(
    proposal.status !== "disetujui" && proposal.status !== "selesai",
  );
  const [busy, setBusy] = useState<string | null>(null);

  // Background export job history log
  const [exportHistory, setExportHistory] = useState<ExportJob[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  async function handleExport(formatKey: string) {
    setBusy(formatKey);

    const jobId = Math.random().toString(36).substring(2, 9);
    const newJob: ExportJob = {
      id: jobId,
      format: formatKey,
      template,
      status: "diproses",
      created_at: new Date().toISOString(),
    };
    setExportHistory((prev) => [newJob, ...prev]);

    try {
      const bundle: ExportBundle = {
        proposal,
        sections,
        lfa,
        budget,
        donorName: donor?.name ?? null,
      };

      if (formatKey === "pdf") {
        await exportPdf(bundle);
      } else if (formatKey === "docx") {
        await exportDocx(bundle);
      } else {
        await exportXlsx(bundle);
      }

      setExportHistory((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: "berhasil" } : j)),
      );

      await logAudit({
        action: "export",
        entityType: "proposal",
        entityId: proposal.id,
        newValues: { formatKey, template },
      });
      toast.success(`Ekspor dokumen ${formatKey.toUpperCase()} berhasil diunduh!`);
    } catch (error) {
      setExportHistory((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "gagal" } : j)));
      toast.error(error instanceof Error ? error.message : "Ekspor dokumen gagal.");
    } finally {
      setBusy(null);
    }
  }

  const isDraft = proposal.status !== "disetujui" && proposal.status !== "selesai";

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="size-5 text-primary" /> Step 10: Ekspor & Penerbitan Dokumen
                Proposal
              </CardTitle>
              <CardDescription>
                Pilih format keluaran (PDF, DOCX, XLSX), templat desain, watermark, dan opsi
                pratinjau sebelum mengunduh.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isDraft && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-mono text-xs"
                >
                  Watermark "DRAFT" Aktif
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Layout className="size-3.5 text-primary" /> Pratinjau Ekspor
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Template & Option Settings */}
          <div className="grid gap-4 sm:grid-cols-3 rounded-lg border bg-muted/30 p-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold">Pilih Templat Desain Dokumen</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2 sm:pt-0">
              <Label className="text-xs font-semibold block">Opsi Halaman & Layout</Label>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={includeLogo} onCheckedChange={(c) => setIncludeLogo(!!c)} />
                  <span>Sematkan Logo Organisasi</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={includeToc} onCheckedChange={(c) => setIncludeToc(!!c)} />
                  <span>Sematkan Daftar Isi & Nomor Halaman</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={includeWatermark}
                    onCheckedChange={(c) => setIncludeWatermark(!!c)}
                    disabled={!isDraft}
                  />
                  <span>Watermark DRAFT (Otomatis untuk non-approval)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Export Formats Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FORMAT_OPTIONS.map((f) => (
              <Card
                key={f.key}
                className="hover:border-primary/50 transition-all flex flex-col justify-between p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <f.icon className="size-5 text-primary" />
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {f.key.split("_")[0]}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm">{f.label}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>

                <Button
                  size="sm"
                  className="mt-4 w-full text-xs gap-1.5 shadow-sm"
                  disabled={busy !== null}
                  onClick={() => void handleExport(f.key)}
                >
                  {busy === f.key ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Unduh {f.label.split(" ")[0]}
                </Button>
              </Card>
            ))}
          </div>

          {/* Background Job Export History Log (PRD 11.10) */}
          {exportHistory.length > 0 && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
              <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                <History className="size-4 text-primary" /> Riwayat Job Ekspor Dokumen
              </h4>
              <div className="space-y-1.5">
                {exportHistory.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-2 rounded bg-background border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="size-3.5 text-muted-foreground" />
                      <span className="font-mono uppercase font-semibold">{job.format}</span>
                      <span className="text-muted-foreground">({job.template})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateTime(job.created_at)}
                      </span>
                      <Badge
                        variant={job.status === "berhasil" ? "default" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {job.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pratinjau Ekspor Modal (PRD 11.10) */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layout className="size-5 text-primary" /> Pratinjau Tata Letak Ekspor (
              {template.toUpperCase()})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tampilan simulasi halaman sampul dan header dokumen proposal sebelum dicetak.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Simulated Cover Page */}
            <div className="rounded-lg border-2 border-dashed p-8 bg-card text-center space-y-4 relative overflow-hidden">
              {includeWatermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                  <span className="text-7xl font-bold font-mono tracking-widest text-destructive rotate-45">
                    DRAFT
                  </span>
                </div>
              )}
              {includeLogo && (
                <div className="mx-auto size-12 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                  LOGO
                </div>
              )}
              <h3 className="font-display text-lg font-bold text-foreground max-w-md mx-auto">
                {proposal.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                Diajukan Oleh: {proposal.organization_name || "Organisasi Pelaksana"}
              </p>
              <p className="text-xs text-primary font-semibold">
                Lembaga Donor Sasaran: {donor?.name || "Lembaga Donor"}
              </p>
              <div className="pt-6 text-[10px] text-muted-foreground border-t">
                {includeToc && "• Termasuk Daftar Isi & Nomor Halaman Otomatis"}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
