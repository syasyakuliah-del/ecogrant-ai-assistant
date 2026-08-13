import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Database, FileText, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateExecutiveSummary } from "@/lib/ai.functions";
import { EXECUTIVE_SUMMARY_KEY, NARRATIVE_SECTIONS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { aiErrorMessage, buildContext, upsertSection, type StepProps } from "./shared";

export function StepSummary({ proposal, sections, lfa, budget, donor, refetch }: StepProps) {
  const run = useServerFn(generateExecutiveSummary);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [maxWords, setMaxWords] = useState<number>(400);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);

  const stored = sections.find((s) => s.section_type === EXECUTIVE_SUMMARY_KEY)?.content ?? "";
  const content = draft ?? stored;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  const filledNarrativesCount = NARRATIVE_SECTIONS.filter(
    (s) => (sections.find((x) => x.section_type === s.key)?.content ?? "").trim().length > 0,
  ).length;

  const rabTotal = budget.reduce((a, b) => a + Number(b.total ?? 0), 0);

  async function persist(value: string, ai: boolean) {
    await upsertSection(proposal.id, sections, EXECUTIVE_SUMMARY_KEY, value, 0, ai);
    refetch();
  }

  async function handleGenerate() {
    setBusy(true);
    try {
      const result = await run({
        data: {
          context: buildContext(proposal, donor),
          narratives: NARRATIVE_SECTIONS.map((s) => ({
            label: s.label,
            content: sections.find((x) => x.section_type === s.key)?.content ?? "",
          })).filter((n) => n.content.trim().length > 0),
          lfaSummary: lfa
            .map((r) => `${r.row_type}: ${r.goal || r.outcome || r.output || r.activity || "-"}`)
            .join("\n"),
          budgetTotal: rabTotal,
          maxWords,
        },
      });
      setDraft(result.content);
      await persist(result.content, true);
      toast.success("Executive Summary berhasil disusun ulang oleh AI.");
    } catch (error) {
      toast.error(aiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="size-5 text-primary" /> Step 3: Executive Summary (Ringkasan
                Eksekutif)
              </CardTitle>
              <CardDescription>
                Ringkasan komprehensif dirangkum dari informasi dasar, 12 bagian narasi, LFA, dan
                anggaran RAB.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={words > 0 && words <= maxWords ? "default" : "outline"}
                className="font-mono text-xs"
              >
                {words} / {maxWords} Kata
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSourceModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Database className="size-3.5 text-primary" /> Sumber Data
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                Target Maksimal Panjang:
              </Label>
              <Select value={String(maxWords)} onValueChange={(v) => setMaxWords(Number(v))}>
                <SelectTrigger className="w-32 text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="250">250 Kata (Singkat)</SelectItem>
                  <SelectItem value="400">400 Kata (Standar)</SelectItem>
                  <SelectItem value="600">600 Kata (Detail)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => void handleGenerate()}
                disabled={busy}
                size="sm"
                className="gap-1.5 shadow-sm text-xs"
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {content.trim() ? "Regenerate AI Summary" : "Generate Executive Summary"}
              </Button>
            </div>
          </div>

          <Textarea
            rows={16}
            value={content}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void persist(content, false)}
            placeholder="Executive Summary akan dihasilkan otomatis dari sumber data proposal Anda, atau tulis manual..."
            className="text-xs sm:text-sm leading-relaxed"
          />
        </CardContent>
      </Card>

      {/* Modal Sumber Data Pembentuk Ringkasan (PRD 11.3) */}
      <Dialog open={sourceModalOpen} onOpenChange={setSourceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="size-5 text-primary" /> Breakdown Sumber Data Ringkasan
            </DialogTitle>
            <DialogDescription className="text-xs">
              AI merangkum Executive Summary berdasarkan data aktif berikut di dalam proposal Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-md border p-2.5 bg-muted/30 space-y-1">
              <span className="font-semibold text-foreground">1. Informasi Dasar Proposal:</span>
              <p className="text-muted-foreground">
                {proposal.title || "Tanpa Judul"} ({proposal.organization_name || "Individu"})
              </p>
            </div>

            <div className="rounded-md border p-2.5 bg-muted/30 space-y-1">
              <span className="font-semibold text-foreground">2. Narasi Terisi:</span>
              <p className="text-muted-foreground">
                {filledNarrativesCount} dari 12 Bagian Narasi Siap Rangkum
              </p>
            </div>

            <div className="rounded-md border p-2.5 bg-muted/30 space-y-1">
              <span className="font-semibold text-foreground">
                3. Logical Framework Matrix (LFA):
              </span>
              <p className="text-muted-foreground">
                {lfa.length} Baris Matriks Logframe Dikalkulasi
              </p>
            </div>

            <div className="rounded-md border p-2.5 bg-muted/30 space-y-1">
              <span className="font-semibold text-foreground">
                4. Rencana Anggaran Biaya (RAB):
              </span>
              <p className="font-mono font-bold text-primary">
                {formatCurrency(rabTotal, proposal.currency)} ({budget.length} Item)
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
