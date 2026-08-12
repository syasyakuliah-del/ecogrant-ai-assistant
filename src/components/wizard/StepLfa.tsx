import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { generateLogicalFramework } from "@/lib/ai.functions";
import { NARRATIVE_SECTIONS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiErrorMessage, buildContext, type StepProps } from "./shared";
import type { LfaRow } from "@/hooks/useProposalData";

const ROW_TYPES = [
  { value: "goal", label: "Goal (Dampak)" },
  { value: "outcome", label: "Outcome (Hasil)" },
  { value: "output", label: "Output (Keluaran)" },
  { value: "activity", label: "Activity (Kegiatan)" },
];

function statementOf(row: LfaRow) {
  return row.goal || row.outcome || row.output || row.activity || "";
}

function statementField(type: string) {
  return (["goal", "outcome", "output", "activity"].includes(type) ? type : "activity") as
    | "goal"
    | "outcome"
    | "output"
    | "activity";
}

export function StepLfa({ proposal, sections, lfa, donor, refetch }: StepProps) {
  const run = useServerFn(generateLogicalFramework);
  const [busy, setBusy] = useState(false);

  // Hierarchy validation check
  const hasGoal = lfa.some((r) => r.row_type === "goal" && statementOf(r).trim());
  const hasOutcome = lfa.some((r) => r.row_type === "outcome" && statementOf(r).trim());
  const hasOutput = lfa.some((r) => r.row_type === "output" && statementOf(r).trim());
  const hasActivity = lfa.some((r) => r.row_type === "activity" && statementOf(r).trim());
  const isHierarchyValid = hasGoal && hasOutcome && hasOutput && hasActivity;

  async function update(row: LfaRow, patch: Partial<LfaRow>) {
    const { error } = await supabase.from("lfa_rows").update(patch).eq("id", row.id);
    if (error) toast.error(error.message);
    else refetch();
  }

  async function addRow() {
    const { error } = await supabase.from("lfa_rows").insert({
      proposal_id: proposal.id,
      row_type: "activity",
      activity: "",
      sort_order: lfa.length + 1,
    });
    if (error) toast.error(error.message);
    else refetch();
  }

  async function removeRow(id: string) {
    const { error } = await supabase.from("lfa_rows").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
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
        },
      });
      await supabase.from("lfa_rows").delete().eq("proposal_id", proposal.id);
      const rows = (result?.rows ?? []).map((r, i) => ({ ...r, proposal_id: proposal.id, sort_order: i + 1 }));
      const { error } = await supabase.from("lfa_rows").insert(rows);
      if (error) throw error;
      refetch();
      toast.success(`${rows.length} baris Logical Framework Matrix berhasil disusun oleh AI.`);
    } catch (error) {
      toast.error(aiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  // Export LFA to XLSX
  function exportLfaXlsx() {
    const exportData = lfa.map((r, idx) => ({
      No: idx + 1,
      Tingkatan: r.row_type.toUpperCase(),
      Uraian: statementOf(r),
      Indikator: r.indicator || "-",
      Baseline: r.baseline || "-",
      Target: r.target || "-",
      "Alat Verifikasi (MOV)": r.means_of_verification || "-",
      "Asumsi & Risiko": r.assumption || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Logical Framework");
    XLSX.writeFile(workbook, `LFA_${proposal.title.slice(0, 20).replace(/\s+/g, "_")}.xlsx`);
    toast.success("File XLSX Logical Framework Matrix berhasil diunduh.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-primary" /> Step 5: Logical Framework Matrix (LFA)
              </CardTitle>
              <CardDescription>
                Matriks kerangka logis hierarkis: Goal, Outcome, Output, Activity, Indikator, Baseline, Target, MOV, dan Asumsi.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportLfaXlsx} className="gap-1.5 text-xs">
                <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Ekspor XLSX
              </Button>
              <Button variant="outline" size="sm" onClick={() => void addRow()} className="gap-1.5 text-xs">
                <Plus className="size-3.5" /> Tambah Baris
              </Button>
              <Button size="sm" onClick={() => void handleGenerate()} disabled={busy} className="gap-1.5 text-xs shadow-sm">
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                Generate LFA AI
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Hierarchy Validation Status */}
          <Alert variant={isHierarchyValid ? "default" : "destructive"}>
            {isHierarchyValid ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4" />
            )}
            <AlertTitle className="text-xs font-semibold">
              {isHierarchyValid ? "Validasi Hierarki LFA Lengkap" : "Periksa Hierarki LFA Anda"}
            </AlertTitle>
            <AlertDescription className="text-xs mt-1 flex flex-wrap gap-2">
              <Badge variant={hasGoal ? "default" : "outline"} className="text-[10px]">Goal: {hasGoal ? "OK" : "Wajib"}</Badge>
              <Badge variant={hasOutcome ? "default" : "outline"} className="text-[10px]">Outcome: {hasOutcome ? "OK" : "Wajib"}</Badge>
              <Badge variant={hasOutput ? "default" : "outline"} className="text-[10px]">Output: {hasOutput ? "OK" : "Wajib"}</Badge>
              <Badge variant={hasActivity ? "default" : "outline"} className="text-[10px]">Activity: {hasActivity ? "OK" : "Wajib"}</Badge>
            </AlertDescription>
          </Alert>

          {/* LFA Rows Grid */}
          {lfa.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-xs text-muted-foreground">
              Belum ada baris Logical Framework. Susun otomatis dari narasi proposal dengan tombol AI di atas atau tambah manual.
            </div>
          ) : (
            <div className="space-y-3">
              {lfa.map((row) => (
                <div key={row.id} className="rounded-lg border p-4 space-y-3 bg-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Select value={row.row_type} onValueChange={(v) => void update(row, { row_type: v })}>
                        <SelectTrigger className="w-44 text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROW_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant="outline" className="text-[10px]">
                        # {row.sort_order}
                      </Badge>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => void removeRow(row.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 text-xs">
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        Uraian Pernyataan ({row.row_type.toUpperCase()}):
                      </label>
                      <Input
                        defaultValue={statementOf(row)}
                        placeholder={`Masukkan uraian ${row.row_type}...`}
                        onBlur={(e) => void update(row, { [statementField(row.row_type)]: e.target.value } as Partial<LfaRow>)}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Indikator Terukur:</label>
                      <Input
                        defaultValue={row.indicator ?? ""}
                        placeholder="Indikator pencapaian..."
                        onBlur={(e) => void update(row, { indicator: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Alat Verifikasi (MOV):</label>
                      <Input
                        defaultValue={row.means_of_verification ?? ""}
                        placeholder="Dokumen / Laporan / Foto verifikasi..."
                        onBlur={(e) => void update(row, { means_of_verification: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Baseline Awal:</label>
                      <Input
                        defaultValue={row.baseline ?? ""}
                        placeholder="Kondisi awal sebelum program..."
                        onBlur={(e) => void update(row, { baseline: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Target Capaian:</label>
                      <Input
                        defaultValue={row.target ?? ""}
                        placeholder="Target numerik / kualitatif..."
                        onBlur={(e) => void update(row, { target: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Asumsi Eksternal & Risiko:</label>
                      <Input
                        defaultValue={row.assumption ?? ""}
                        placeholder="Kondisi eksternal yang diasumsikan mendukung..."
                        onBlur={(e) => void update(row, { assumption: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}