import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Layers,
  Loader2,
  PieChart,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { generateBudgetPlan } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { budgetTotals, validateItem, type StandardRow } from "@/lib/budget";
import { BUDGET_CATEGORIES, UNITS } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import sbmMasterData from "@/data/sbm_master.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { aiErrorMessage, buildContext, type StepProps } from "./shared";
import type { BudgetItem } from "@/hooks/useProposalData";

const CATEGORY_TOOLTIPS: Record<string, string> = {
  Honorarium: "SBM PMK: Honorarium pengelola, narasumber, atau pakar sesuai batas jam/orang.",
  "Perjalanan Dinas": "SBM PMK: Uang harian & tiket perjalanan dinas per orang/hari per kota.",
  Penginapan: "SBM PMK: Pagu kamar hotel per malam sesuai golongan & kota tujuan.",
  Konsumsi: "SBM PMK: Pagu rapat & kudapan (snack) per porsi/peserta.",
  "Sewa Equipment & Tempat": "SBU: Sewa lokasi, venue, atau alat teknis sesuai harga pasar.",
  "Bahan & Operasional": "SBU/SBM: ATK, perlengkapan lapangan, pencetakan, & komunikasi.",
  Lainnya: "Biaya operasional pendukung yang tetap harus mematuhi aturan 15-20% pagu.",
};

export function StepBudget({ proposal, lfa, budget, donor, refetch }: StepProps) {
  const run = useServerFn(generateBudgetPlan);
  const [busy, setBusy] = useState(false);
  const [ppnRate, setPpnRate] = useState<number>(proposal.tax_rate ?? 11);
  const [activeTab, setActiveTab] = useState("items");

  const { data: standards } = useQuery({
    queryKey: ["standards", "all"],
    queryFn: async () => {
      let allSbm: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("sbm")
          .select("id,code,description,category,unit,price")
          .eq("is_active", true)
          .range(from, from + step - 1);

        if (error) break;
        if (!data || data.length === 0) break;

        allSbm = allSbm.concat(data);
        if (data.length < step) hasMore = false;
        from += step;
      }

      if (allSbm.length === 0) {
        allSbm = sbmMasterData as any[];
      }

      const { data: sbuData } = await supabase
        .from("sbu")
        .select("id,code,description,category,unit,price")
        .eq("is_active", true);

      return { sbm: allSbm, sbu: sbuData ?? [] };
    },
  });

  const maps = useMemo(() => {
    const sbm = new Map<string, StandardRow>();
    const sbu = new Map<string, StandardRow>();
    for (const r of standards?.sbm ?? []) sbm.set(r.id, r as StandardRow);
    for (const r of standards?.sbu ?? []) sbu.set(r.id, r as StandardRow);
    return { sbm, sbu };
  }, [standards]);

  const totals = budgetTotals(budget as never);
  const grantAmount = Number(proposal.grant_amount ?? 0);
  const overBudget = grantAmount > 0 && totals.grandTotal > grantAmount;

  // Duplicate item check
  const duplicateWarnings = useMemo(() => {
    const descriptions = budget.map((b) => b.description.trim().toLowerCase());
    const duplicates = new Set<string>();
    descriptions.forEach((desc, idx) => {
      if (desc && descriptions.indexOf(desc) !== idx) duplicates.add(desc);
    });
    return Array.from(duplicates);
  }, [budget]);

  // Recaps per Category
  const categoryRecaps = useMemo(() => {
    const map = new Map<string, { subtotal: number; tax: number; total: number; count: number }>();
    for (const b of budget) {
      const cat = b.category || "Lainnya";
      const current = map.get(cat) || { subtotal: 0, tax: 0, total: 0, count: 0 };
      const sub = Number(b.subtotal ?? 0);
      const tx = Number(b.tax_amount ?? 0);
      const tot = Number(b.total ?? 0);
      map.set(cat, {
        subtotal: current.subtotal + sub,
        tax: current.tax + tx,
        total: current.total + tot,
        count: current.count + 1,
      });
    }
    return Array.from(map.entries()).map(([category, stats]) => ({ category, ...stats }));
  }, [budget]);

  async function update(item: BudgetItem, patch: Partial<BudgetItem>) {
    const merged = { ...item, ...patch };
    const volume = Number(merged.volume ?? 0);
    const frequency = Number(merged.frequency ?? 1);
    const price = Number(merged.unit_price ?? 0);
    const subtotal = volume * frequency * price;
    const currentTaxRate = patch.tax_rate !== undefined ? Number(patch.tax_rate) : ppnRate;
    const taxAmount = subtotal * (currentTaxRate / 100);
    const validation = validateItem(merged as never, maps);

    const { error } = await supabase
      .from("budget_items")
      .update({
        ...patch,
        subtotal,
        tax_rate: currentTaxRate,
        tax_amount: taxAmount,
        total: subtotal + taxAmount,
        ...validation,
      })
      .eq("id", item.id);

    if (error) toast.error(error.message);
    else refetch();
  }

  async function updateGlobalPpnRate(newRate: number) {
    setPpnRate(newRate);
    // Update proposal tax_rate
    await supabase.from("proposals").update({ tax_rate: newRate }).eq("id", proposal.id);

    // Update all budget items PPN rate
    for (const item of budget) {
      const subtotal = Number(item.subtotal ?? 0);
      const taxAmount = subtotal * (newRate / 100);
      await supabase
        .from("budget_items")
        .update({
          tax_rate: newRate,
          tax_amount: taxAmount,
          total: subtotal + taxAmount,
        })
        .eq("id", item.id);
    }
    toast.success(`Tarif PPN diperbarui menjadi ${newRate}%.`);
    refetch();
  }

  async function addItem() {
    const { error } = await supabase.from("budget_items").insert({
      proposal_id: proposal.id,
      category: BUDGET_CATEGORIES[0] ?? "Lainnya",
      description: "",
      unit: "Paket",
      volume: 1,
      frequency: 1,
      unit_price: 0,
      tax_rate: ppnRate,
      source_type: "manual",
      sort_order: budget.length + 1,
    });
    if (error) toast.error(error.message);
    else refetch();
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from("budget_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  }

  async function handleGenerate() {
    setBusy(true);
    try {
      const standardList = [
        ...(standards?.sbm ?? []).map((s) => ({ ...s, source: "SBM" })),
        ...(standards?.sbu ?? []).map((s) => ({ ...s, source: "SBU" })),
      ].map((s) => ({
        source: s.source,
        code: s.code,
        category: s.category,
        description: s.description,
        unit: s.unit,
        price: Number(s.price),
      }));

      const result = await run({
        data: {
          context: buildContext(proposal, donor),
          activities: lfa
            .filter((r) => r.row_type === "activity")
            .map((r) => r.activity ?? "")
            .filter(Boolean),
          standards: standardList.slice(0, 120),
        },
      });

      const byCode = new Map<string, { id: string; source: string; price: number }>();
      for (const s of standards?.sbm ?? [])
        byCode.set(s.code, { id: s.id, source: "sbm", price: Number(s.price) });
      for (const s of standards?.sbu ?? [])
        byCode.set(s.code, { id: s.id, source: "sbu", price: Number(s.price) });

      const rows = (result?.items ?? []).map((item, i) => {
        const std = item.standard_code ? byCode.get(item.standard_code) : undefined;
        const volume = Number(item.volume ?? 1);
        const frequency = Number(item.frequency ?? 1);
        const price = Number(item.unit_price ?? 0);
        const subtotal = volume * frequency * price;
        const taxAmount = subtotal * (ppnRate / 100);
        const draft = {
          proposal_id: proposal.id,
          category: item.category,
          activity_name: item.activity_name,
          description: item.description,
          unit: item.unit,
          volume,
          frequency,
          unit_price: price,
          code: item.standard_code || null,
          sbm_id: std?.source === "sbm" ? std.id : null,
          sbu_id: std?.source === "sbu" ? std.id : null,
          source_type: std ? std.source : "ai",
          subtotal,
          tax_rate: ppnRate,
          tax_amount: taxAmount,
          total: subtotal + taxAmount,
          sort_order: i + 1,
        };
        return { ...draft, ...validateItem({ ...draft, override_reason: null } as never, maps) };
      });

      await supabase.from("budget_items").delete().eq("proposal_id", proposal.id);
      const { error } = await supabase.from("budget_items").insert(rows);
      if (error) throw error;
      refetch();
      toast.success(`${rows.length} item Rencana Anggaran Biaya disusun otomatis oleh AI.`);
    } catch (error) {
      toast.error(aiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function exportRabXlsx() {
    const data = budget.map((b, idx) => ({
      No: idx + 1,
      Kode: b.code || "-",
      Kategori: b.category,
      "Aktivitas LFA": b.activity_name || "-",
      "Uraian Biaya": b.description,
      Satuan: b.unit,
      Volume: Number(b.volume),
      Frekuensi: Number(b.frequency),
      "Harga Satuan (IDR)": Number(b.unit_price),
      "Subtotal (IDR)": Number(b.subtotal),
      "Tarif PPN (%)": `${Number(b.tax_rate ?? ppnRate)}%`,
      "PPN (IDR)": Number(b.tax_amount),
      "Total (IDR)": Number(b.total),
      "Status Validasi": b.validation_status || "Valid",
      Catatan: b.override_reason || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RAB Proposal");
    XLSX.writeFile(workbook, `RAB_${proposal.title.slice(0, 20).replace(/\s+/g, "_")}.xlsx`);
    toast.success("File XLSX Rencana Anggaran Biaya (RAB) berhasil diunduh.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="size-5 text-primary" /> Step 8: Rencana Anggaran Biaya (RAB)
              </CardTitle>
              <CardDescription>
                Formulasi: Subtotal = Vol × Frek × Harga. Total = Subtotal + PPN. Terkunci validasi
                SBM & nilai hibah.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportRabXlsx}
                className="gap-1.5 text-xs"
              >
                <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Ekspor RAB
                XLSX
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void addItem()}
                className="gap-1.5 text-xs"
              >
                <Plus className="size-3.5" /> Tambah Item
              </Button>
              <Button
                size="sm"
                onClick={() => void handleGenerate()}
                disabled={busy}
                className="gap-1.5 text-xs shadow-sm"
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Rekomendasi AI RAB
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-3 sm:grid-cols-4">
            <Card className="p-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Total Subtotal
              </span>
              <p className="font-mono text-base font-bold text-foreground mt-0.5">
                {formatCurrency(totals.subtotal, proposal.currency)}
              </p>
            </Card>
            <Card className="p-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Total PPN
                </span>
                <Select
                  value={String(ppnRate)}
                  onValueChange={(v) => void updateGlobalPpnRate(Number(v))}
                >
                  <SelectTrigger className="w-16 h-6 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="11">11%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="font-mono text-base font-bold text-foreground mt-0.5">
                {formatCurrency(totals.tax, proposal.currency)}
              </p>
            </Card>
            <Card
              className={`p-3 ${overBudget ? "border-2 border-destructive bg-destructive/5" : ""}`}
            >
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Grand Total RAB
              </span>
              <p className="font-mono text-base font-bold text-primary mt-0.5">
                {formatCurrency(totals.grandTotal, proposal.currency)}
              </p>
            </Card>
            <Card className="p-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Target Pengajuan Hibah
              </span>
              <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(grantAmount, proposal.currency)}
              </p>
            </Card>
          </div>

          {/* Validation Warnings */}
          {overBudget && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle className="text-xs font-semibold">
                Grand Total RAB Melampaui Nilai Hibah!
              </AlertTitle>
              <AlertDescription className="text-xs mt-1">
                Grand Total RAB ({formatCurrency(totals.grandTotal, proposal.currency)}) melampaui
                nilai target hibah ({formatCurrency(grantAmount, proposal.currency)}). Sesuaikan
                volume atau harga satuan.
              </AlertDescription>
            </Alert>
          )}

          {duplicateWarnings.length > 0 && (
            <Alert
              variant="destructive"
              className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
            >
              <AlertTriangle className="size-4 text-amber-500" />
              <AlertTitle className="text-xs font-semibold">
                Peringatan Duplikasi Uraian Biaya
              </AlertTitle>
              <AlertDescription className="text-xs mt-1">
                Terdapat uraian biaya ganda: {duplicateWarnings.join(", ")}.
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs View: Table vs Recaps */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-xs">
              <TabsTrigger value="items" className="text-xs gap-1.5">
                <Calculator className="size-3.5" /> Item RAB ({budget.length})
              </TabsTrigger>
              <TabsTrigger value="recaps" className="text-xs gap-1.5">
                <PieChart className="size-3.5" /> Rekap Per Kategori
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="mt-4">
              {budget.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center text-xs text-muted-foreground">
                  Belum ada item anggaran RAB. Susun otomatis dari aktivitas LFA dengan tombol AI di
                  atas atau tambah item manual.
                </div>
              ) : (
                <TooltipProvider>
                  <div className="overflow-x-auto rounded-lg border max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-muted/90 backdrop-blur sticky top-0 z-10">
                        <TableRow className="text-xs">
                          <TableHead className="w-36">
                            <div className="flex items-center gap-1">
                              <span>Kategori</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="size-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">
                                  Kategori pengeluaran RAB terikat aturan acuan SBM/SBU PMK
                                  Kemenkeu.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableHead>
                          <TableHead className="min-w-48">Uraian Biaya</TableHead>
                          <TableHead className="w-24">Satuan</TableHead>
                          <TableHead className="w-16">Vol</TableHead>
                          <TableHead className="w-16">Frek</TableHead>
                          <TableHead className="w-32">Harga Satuan</TableHead>
                          <TableHead className="w-32 text-right">Subtotal</TableHead>
                          <TableHead className="w-32 text-right">Total (+PPN)</TableHead>
                          <TableHead className="w-28">Status SBM</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budget.map((item) => {
                          const statusStr = (item.validation_status || "valid").toLowerCase();
                          const isInvalid =
                            statusStr.includes("melebihi") ||
                            statusStr.includes("invalid") ||
                            statusStr.includes("tidak") ||
                            statusStr.includes("override");
                          const tooltipText =
                            CATEGORY_TOOLTIPS[item.category] ?? CATEGORY_TOOLTIPS["Lainnya"];

                          return (
                            <TableRow
                              key={item.id}
                              className={
                                isInvalid
                                  ? "bg-destructive/10 dark:bg-destructive/20 border-l-4 border-l-destructive"
                                  : undefined
                              }
                            >
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Select
                                        value={item.category}
                                        onValueChange={(v) => void update(item, { category: v })}
                                      >
                                        <SelectTrigger className="h-7 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {BUDGET_CATEGORIES.map((c) => (
                                            <SelectItem key={c} value={c}>
                                              {c}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs text-xs">
                                    {tooltipText}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-7 text-xs"
                                  defaultValue={item.description}
                                  onBlur={(e) => void update(item, { description: e.target.value })}
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={item.unit}
                                  onValueChange={(v) => void update(item, { unit: v })}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {UNITS.map((u) => (
                                      <SelectItem key={u} value={u}>
                                        {u}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-7 text-xs"
                                  type="number"
                                  min={1}
                                  defaultValue={Number(item.volume)}
                                  onBlur={(e) =>
                                    void update(item, { volume: Number(e.target.value) })
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-7 text-xs"
                                  type="number"
                                  min={1}
                                  defaultValue={Number(item.frequency)}
                                  onBlur={(e) =>
                                    void update(item, { frequency: Number(e.target.value) })
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-7 text-xs font-mono"
                                  type="number"
                                  min={0}
                                  defaultValue={Number(item.unit_price)}
                                  onBlur={(e) =>
                                    void update(item, { unit_price: Number(e.target.value) })
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono">
                                {formatCurrency(item.subtotal ?? 0, proposal.currency)}
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono font-bold text-primary">
                                {formatCurrency(item.total ?? 0, proposal.currency)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={isInvalid ? "destructive" : "default"}
                                  className="text-[10px]"
                                >
                                  {item.validation_status || "Valid"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => void removeItem(item.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TooltipProvider>
              )}
            </TabsContent>

            <TabsContent value="recaps" className="mt-4">
              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="size-4 text-primary" /> Rekapitulasi Rencana Anggaran Biaya
                  Per Kategori
                </h4>

                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="text-xs">
                        <TableHead>Kategori Anggaran</TableHead>
                        <TableHead className="text-center">Jumlah Item</TableHead>
                        <TableHead className="text-right">Subtotal (IDR)</TableHead>
                        <TableHead className="text-right">PPN (IDR)</TableHead>
                        <TableHead className="text-right">Total Anggaran (IDR)</TableHead>
                        <TableHead className="text-right">Proporsi (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryRecaps.map((cat) => {
                        const proportion =
                          totals.grandTotal > 0
                            ? Math.round((cat.total / totals.grandTotal) * 100)
                            : 0;
                        return (
                          <TableRow key={cat.category} className="text-xs">
                            <TableCell className="font-semibold">{cat.category}</TableCell>
                            <TableCell className="text-center font-mono">{cat.count}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(cat.subtotal)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(cat.tax)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-primary">
                              {formatCurrency(cat.total)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {proportion}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
