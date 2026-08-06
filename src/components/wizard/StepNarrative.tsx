import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateNarrative } from "@/lib/ai.functions";
import { NARRATIVE_SECTIONS } from "@/lib/constants";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { aiErrorMessage, buildContext, upsertSection, type StepProps } from "./shared";

const MODES = [
  { value: "generate", label: "Buat" },
  { value: "rewrite", label: "Tulis Ulang" },
  { value: "shorten", label: "Ringkas" },
  { value: "expand", label: "Perluas" },
  { value: "restructure", label: "Restrukturisasi" },
  { value: "donor", label: "Selaraskan Donor" },
] as const;

export function StepNarrative({ proposal, sections, donor, refetch }: StepProps) {
  const run = useServerFn(generateNarrative);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const valueOf = (key: string) =>
    drafts[key] ?? sections.find((s) => s.section_type === key)?.content ?? "";

  async function persist(key: string, content: string, order: number, ai: boolean) {
    await upsertSection(proposal.id, sections, key, content, order, ai);
    refetch();
  }

  async function handleAi(key: string, label: string, order: number, mode: string) {
    setBusy(`${key}:${mode}`);
    try {
      const result = await run({
        data: {
          context: buildContext(proposal, donor),
          sectionKey: key,
          sectionLabel: label,
          mode,
          currentContent: valueOf(key),
        },
      });
      setDrafts((d) => ({ ...d, [key]: result.content }));
      await persist(key, result.content, order, true);
      toast.success(`${label} berhasil disusun AI.`);
    } catch (error) {
      toast.error(aiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  const filled = NARRATIVE_SECTIONS.filter((s) => valueOf(s.key).trim().length > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Susun dua belas bagian narasi. Gunakan AI untuk menulis lalu sunting sesuai kondisi lapangan.
        </p>
        <Badge variant="secondary">
          {filled} dari {NARRATIVE_SECTIONS.length} bagian terisi
        </Badge>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {NARRATIVE_SECTIONS.map((section, index) => {
          const content = valueOf(section.key);
          return (
            <AccordionItem key={section.key} value={section.key} className="rounded-lg border px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-3 text-left">
                  <span className="text-sm font-medium">
                    {index + 1}. {section.label}
                  </span>
                  <Badge variant={content.trim() ? "default" : "outline"} className="text-[10px]">
                    {content.trim() ? `${content.trim().split(/\s+/).length} kata` : "kosong"}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                <div className="flex flex-wrap gap-2">
                  {MODES.map((mode) => (
                    <Button
                      key={mode.value}
                      size="sm"
                      variant={mode.value === "generate" ? "default" : "outline"}
                      disabled={busy !== null || (mode.value !== "generate" && !content.trim())}
                      onClick={() => void handleAi(section.key, section.label, index + 1, mode.value)}
                    >
                      {busy === `${section.key}:${mode.value}` ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      {mode.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  rows={12}
                  value={content}
                  onChange={(e) => setDrafts((d) => ({ ...d, [section.key]: e.target.value }))}
                  onBlur={() => void persist(section.key, content, index + 1, false)}
                  placeholder={`Tulis ${section.label.toLowerCase()} atau gunakan tombol AI di atas.`}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}