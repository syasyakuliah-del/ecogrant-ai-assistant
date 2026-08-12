import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  CheckCircle2,
  Clock,
  Diff,
  FileText,
  History,
  Loader2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateNarrative } from "@/lib/ai.functions";
import { NARRATIVE_SECTIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aiErrorMessage, buildContext, upsertSection, type StepProps } from "./shared";

const MODES = [
  { value: "generate", label: "Buat Draf" },
  { value: "rewrite", label: "Rewrite Formal" },
  { value: "shorten", label: "Ringkas" },
  { value: "expand", label: "Perpanjang" },
  { value: "restructure", label: "Perbaiki Struktur" },
  { value: "donor", label: "Sesuaikan Donor" },
] as const;

interface AiPreviewState {
  sectionKey: string;
  sectionLabel: string;
  order: number;
  original: string;
  generated: string;
  mode: string;
}

interface VersionItem {
  id: string;
  version_number: number;
  change_summary: string;
  created_at: string;
  snapshot: { section_key?: string; content?: string };
}

export function StepNarrative({ proposal, sections, donor, refetch }: StepProps) {
  const run = useServerFn(generateNarrative);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});

  // AI Diff Confirmation state
  const [aiPreview, setAiPreview] = useState<AiPreviewState | null>(null);

  // Version history modal state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const valueOf = (key: string) =>
    drafts[key] ?? sections.find((s) => s.section_type === key)?.content ?? "";

  async function persist(key: string, content: string, order: number, ai: boolean) {
    await upsertSection(proposal.id, sections, key, content, order, ai);
    // Create version snapshot
    await supabase.from("proposal_versions").insert({
      proposal_id: proposal.id,
      change_summary: `Pembaruan section ${key} (${ai ? "AI Generated" : "Manual Edit"})`,
      snapshot: { section_key: key, content, updated_at: new Date().toISOString() },
    });
    refetch();
  }

  async function handleAiRequest(key: string, label: string, order: number, mode: string) {
    setBusy(`${key}:${mode}`);
    const current = valueOf(key);
    try {
      const result = await run({
        data: {
          context: buildContext(proposal, donor),
          sectionKey: key,
          sectionLabel: label,
          mode,
          currentContent: current,
        },
      });

      // Present AI Diff Confirmation modal (PRD 11.2: AI result doesn't overwrite without confirmation)
      setAiPreview({
        sectionKey: key,
        sectionLabel: label,
        order,
        original: current,
        generated: result.content,
        mode,
      });
    } catch (error) {
      toast.error(aiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function applyAiPreview() {
    if (!aiPreview) return;
    const { sectionKey, generated, order } = aiPreview;
    setDrafts((d) => ({ ...d, [sectionKey]: generated }));
    await persist(sectionKey, generated, order, true);
    toast.success(`Narasi ${aiPreview.sectionLabel} berhasil diperbarui dari AI.`);
    setAiPreview(null);
  }

  async function handleGenerateAll() {
    setBusy("all");
    try {
      for (let i = 0; i < NARRATIVE_SECTIONS.length; i++) {
        const sec = NARRATIVE_SECTIONS[i];
        if (!sec) continue;
        const res = await run({
          data: {
            context: buildContext(proposal, donor),
            sectionKey: sec.key,
            sectionLabel: sec.label,
            mode: "generate",
            currentContent: valueOf(sec.key),
          },
        });
        setDrafts((d) => ({ ...d, [sec.key]: res.content }));
        await upsertSection(proposal.id, sections, sec.key, res.content, i + 1, true);
      }
      refetch();
      toast.success("Seluruh 12 bagian narasi berhasil disusun otomatis oleh AI!");
    } catch (err) {
      toast.error(aiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function openVersionHistory(key: string) {
    setSelectedSectionKey(key);
    setHistoryOpen(true);
    setLoadingVersions(true);
    const { data } = await supabase
      .from("proposal_versions")
      .select("*")
      .eq("proposal_id", proposal.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const rows = (data ?? []) as unknown as VersionItem[];
    const filtered = rows.filter(
      (v) => v.snapshot && typeof v.snapshot === "object" && v.snapshot.section_key === key,
    );
    setVersions(filtered);
    setLoadingVersions(false);
  }

  async function restoreVersion(content: string, order: number) {
    if (!selectedSectionKey) return;
    setDrafts((d) => ({ ...d, [selectedSectionKey]: content }));
    await persist(selectedSectionKey, content, order, false);
    toast.success("Versi narasi berhasil dikembalikan.");
    setHistoryOpen(false);
  }

  function addComment(key: string) {
    const text = (newComment[key] || "").trim();
    if (!text) return;
    setComments((c) => ({
      ...c,
      [key]: [...(c[key] || []), `${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}: ${text}`],
    }));
    setNewComment((n) => ({ ...n, [key]: "" }));
    toast.success("Komentar internal ditambahkan.");
  }

  const filled = NARRATIVE_SECTIONS.filter((s) => valueOf(s.key).trim().length > 0).length;

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Step 2: Penyusunan 12 Bagian Narasi Proposal
          </h3>
          <p className="text-xs text-muted-foreground">
            Gunakan Asisten AI untuk menyusun, memperbaiki struktur, atau menyunting teks secara manual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {filled} / {NARRATIVE_SECTIONS.length} Bagian Terisi
          </Badge>
          <Button
            size="sm"
            onClick={() => void handleGenerateAll()}
            disabled={busy !== null}
            className="gap-1.5 shadow-sm"
          >
            {busy === "all" ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            Generate Seluruh Narasi AI
          </Button>
        </div>
      </div>

      {/* Accordion 12 Narrative Sections */}
      <Accordion type="multiple" defaultValue={["latar_belakang"]} className="space-y-3">
        {NARRATIVE_SECTIONS.map((section, index) => {
          const content = valueOf(section.key);
          const words = content.trim() ? content.trim().split(/\s+/).length : 0;
          const chars = content.length;
          const sectionComments = comments[section.key] || [];

          return (
            <AccordionItem key={section.key} value={section.key} className="rounded-lg border px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex flex-1 items-center justify-between pr-4">
                  <span className="flex items-center gap-3 text-left">
                    <span className="text-sm font-semibold">
                      {index + 1}. {section.label}
                    </span>
                    {content.trim() ? (
                      <Badge variant="default" className="text-[10px] bg-emerald-600">
                        {words} Kata ({chars} karakter)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Belum Diisi
                      </Badge>
                    )}
                  </span>
                  {sectionComments.length > 0 && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <MessageSquare className="size-3" /> {sectionComments.length} Komentar
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4 pt-1">
                {/* AI Feature Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 pr-1">
                      <Sparkles className="size-3 text-primary" /> Fitur AI:
                    </span>
                    {MODES.map((mode) => (
                      <Button
                        key={mode.value}
                        size="sm"
                        variant={mode.value === "generate" ? "default" : "outline"}
                        className="h-7 text-xs px-2.5"
                        disabled={busy !== null || (mode.value !== "generate" && !content.trim())}
                        onClick={() => void handleAiRequest(section.key, section.label, index + 1, mode.value)}
                      >
                        {busy === `${section.key}:${mode.value}` ? (
                          <Loader2 className="size-3 animate-spin mr-1" />
                        ) : null}
                        {mode.label}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => void openVersionHistory(section.key)}
                  >
                    <History className="size-3.5" /> Riwayat Versi
                  </Button>
                </div>

                {/* Editor Textarea */}
                <div className="space-y-1">
                  <Textarea
                    rows={10}
                    value={content}
                    onChange={(e) => setDrafts((d) => ({ ...d, [section.key]: e.target.value }))}
                    onBlur={() => void persist(section.key, content, index + 1, false)}
                    placeholder={`Tulis narasi ${section.label.toLowerCase()} secara rinci...`}
                    className="text-xs sm:text-sm leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground px-1 pt-1">
                    <span>Terakhir disimpan otomatis pada sesi aktif</span>
                    <span>{words} Kata | {chars} Karakter</span>
                  </div>
                </div>

                {/* Internal Comments Sub-section */}
                <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <MessageSquare className="size-3.5 text-primary" /> Catatan & Komentar Internal Tim
                  </div>
                  {sectionComments.length > 0 && (
                    <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
                      {sectionComments.map((c, ci) => (
                        <div key={ci} className="text-xs text-muted-foreground bg-background p-1.5 rounded border">
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Input
                      value={newComment[section.key] || ""}
                      onChange={(e) => setNewComment((n) => ({ ...n, [section.key]: e.target.value }))}
                      placeholder="Tambah komentar atau catatan koreksi..."
                      className="text-xs h-8"
                      onKeyDown={(e) => e.key === "Enter" && addComment(section.key)}
                    />
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => addComment(section.key)}>
                      Kirim
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* AI Diff Preview Modal (PRD 11.2) */}
      <Dialog open={!!aiPreview} onOpenChange={(open) => !open && setAiPreview(null)}>
        {aiPreview && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase">
                <Diff className="size-4" /> Konfirmasi Hasil Generasi AI
              </div>
              <DialogTitle className="text-lg">
                Saran AI untuk {aiPreview.sectionLabel} ({aiPreview.mode})
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tinjau perbandingan antara konten awal dengan hasil AI sebelum menerapkan ke dokumen proposal Anda.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2 py-2">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <X className="size-3.5 text-destructive" /> Konten Awal
                </span>
                <div className="h-64 overflow-y-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed font-mono whitespace-pre-wrap">
                  {aiPreview.original || "(Belum ada konten awal)"}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="size-3.5" /> Hasil Generasi AI Baru
                </span>
                <div className="h-64 overflow-y-auto rounded-md border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 p-3 text-xs leading-relaxed font-mono whitespace-pre-wrap">
                  {aiPreview.generated}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setAiPreview(null)}>
                Tolak & Batal
              </Button>
              <Button onClick={() => void applyAiPreview()} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="size-4" /> Gunakan Hasil AI
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Version History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" /> Riwayat Versi Narasi
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftar versi tersimpan untuk bagian ini. Anda dapat mengembalikan versi sebelumnya kapan saja.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
            {loadingVersions ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Memuat riwayat versi...</div>
            ) : versions.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Belum ada riwayat versi tersimpan.</div>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="rounded-lg border p-3 text-xs space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary" /> {formatDateTime(v.created_at)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => void restoreVersion(v.snapshot.content ?? "", 1)}
                    >
                      <RotateCcw className="size-3" /> Restore Versi Ini
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-[11px]">{v.change_summary}</p>
                  <div className="bg-background p-2 rounded border text-[11px] line-clamp-3 font-mono">
                    {v.snapshot.content ?? ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}