import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateExecutiveSummary } from "@/lib/ai.functions";
import { EXECUTIVE_SUMMARY_KEY, NARRATIVE_SECTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { aiErrorMessage, buildContext, upsertSection, type StepProps } from "./shared";

export function StepSummary({ proposal, sections, lfa, budget, donor, refetch }: StepProps) {
  const run = useServerFn(generateExecutiveSummary);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const stored = sections.find((s) => s.section_type === EXECUTIVE_SUMMARY_KEY)?.content ?? "";
  const content = draft ?? stored;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

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
          budgetTotal: budget.reduce((a, b) => a + Number(b.total ?? 0), 0),
          maxWords: 400,
        },
      });
      setDraft(result.content);
      await persist(result.content, true);
      toast.success("Executive Summary berhasil disusun.");
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
          Ringkasan eksekutif dirangkum dari seluruh narasi, Logical Framework, dan total anggaran.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant={words > 0 && words <= 400 ? "default" : "outline"}>{words} kata</Badge>
          <Button onClick={() => void handleGenerate()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Susun dengan AI
          </Button>
        </div>
      </div>
      <Textarea
        rows={18}
        value={content}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void persist(content, false)}
        placeholder="Executive Summary akan muncul di sini setelah disusun AI, atau tulis manual."
      />
    </div>
  );
}