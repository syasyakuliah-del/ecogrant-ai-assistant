import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { generateLogicalFramework } from "@/lib/ai.functions";
import { NARRATIVE_SECTIONS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiErrorMessage, buildContext, type StepProps } from "./shared";
import type { LfaRow } from "@/hooks/useProposalData";

const ROW_TYPES = [
  { value: "goal", label: "Goal" },
  { value: "outcome", label: "Outcome" },
  { value: "output", label: "Output" },
  { value: "activity", label: "Activity" },
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
      toast.success(`${rows.length} baris Logical Framework berhasil disusun.`);
    } catch (error) {
      toast.error(aiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Matriks kerangka logis menautkan goal, outcome, output, dan aktivitas beserta indikatornya.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void addRow()}>
            <Plus className="size-4" /> Tambah Baris
          </Button>
          <Button size="sm" onClick={() => void handleGenerate()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Susun dengan AI
          </Button>
        </div>
      </div>

      {lfa.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Belum ada baris Logical Framework. Susun otomatis dari narasi proposal atau tambah manual.
        </div>
      ) : (
        <div className="space-y-3">
          {lfa.map((row) => (
            <div key={row.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2 pb-3">
                <Select value={row.row_type} onValueChange={(v) => void update(row, { row_type: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROW_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline">Urutan {row.sort_order}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto text-muted-foreground"
                  onClick={() => void removeRow(row.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input
                    defaultValue={statementOf(row)}
                    placeholder="Uraian pernyataan"
                    onBlur={(e) => void update(row, { [statementField(row.row_type)]: e.target.value } as Partial<LfaRow>)}
                  />
                </div>
                <Input
                  defaultValue={row.indicator ?? ""}
                  placeholder="Indikator terukur"
                  onBlur={(e) => void update(row, { indicator: e.target.value })}
                />
                <Input
                  defaultValue={row.means_of_verification ?? ""}
                  placeholder="Alat verifikasi"
                  onBlur={(e) => void update(row, { means_of_verification: e.target.value })}
                />
                <Input
                  defaultValue={row.baseline ?? ""}
                  placeholder="Baseline"
                  onBlur={(e) => void update(row, { baseline: e.target.value })}
                />
                <Input
                  defaultValue={row.target ?? ""}
                  placeholder="Target"
                  onBlur={(e) => void update(row, { target: e.target.value })}
                />
                <div className="md:col-span-2">
                  <Input
                    defaultValue={row.assumption ?? ""}
                    placeholder="Asumsi dan risiko"
                    onBlur={(e) => void update(row, { assumption: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}