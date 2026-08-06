import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { generateBudgetPlan } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { budgetTotals, validateItem, type StandardRow } from "@/lib/budget";
import { BUDGET_CATEGORIES, UNITS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { aiErrorMessage, buildContext, type StepProps } from "./shared";
import type { BudgetItem } from "@/hooks/useProposalData";

export function StepBudget({ proposal, lfa, budget, donor, refetch }: StepProps) {
  const run = useServerFn(generateBudgetPlan);
  const [busy, setBusy] = useState(false);

  const { data: standards } = useQuery({
    queryKey: ["standards", "all"],
    queryFn: async () => {
      const [sbm, sbu] = await Promise.all([
        supabase.from("sbm").select("id,code,description,category,unit,price").eq("is_active", true),
        supabase.from("sbu").select("id,code,description,category,unit,price").eq("is_active", true),
      ]);
      return { sbm: sbm.data ?? [], sbu: sbu.data ?? [] };
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

  async function update(item: BudgetItem, patch: Partial<BudgetItem>) {
    const merged = { ...item, ...patch };
    const volume = Number(merged.volume ?? 0);
    const frequency = Number(merged.frequency ?? 1);
    const price = Number(merged.unit_price ?? 0);
    const subtotal = volume * frequency * price;
    const taxAmount = subtotal * (Number(merged.tax_rate ?? 0) / 100);
    const validation = validateItem(merged as never, maps);
    const { error } = await supabase
      .from("budget_items")
      .update({ ...patch, subtotal, tax_amount: taxAmount, total: subtotal + taxAmount, ...validation })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else refetch();
  }

  async function addItem() {
    const { error } = await supabase.from("budget_items").insert({
      proposal_id: proposal.id,
      category: BUDGET_CATEGORIES[0],
      description: "",
      unit: "Paket",
      volume: 1,
      frequency: 1,
      unit_price: 0,
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
          activities: lfa.filter((r) => r.row_type === "activity").map((r) => r.activity ?? "").filter(Boolean),
          standards: standardList.slice(0, 120),
        },
      });

      const byCode = new Map<string, { id: string; source: string; price: number }>();
      for (const s of standards?.sbm ?? []) byCode.set(s.code, { id: s.id, source: "sbm", price: Number(s.price) });
      for (const s of standards?.sbu ?? []) byCode.set(s.code, { id: s.id, source: "sbu", price: Number(s.price) });

      const rows = (result?.items ?? []).map((item, i) => {
        const std = item.standard_code ? byCode.get(item.standard_code) : undefined;
        const volume = Number(item.volume ?? 1);
        const frequency = Number(item.frequency ?? 1);
        const price = Number(item.unit_price ?? 0);
        const subtotal = volume * frequency * price;
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
          tax_amount: 0,
          total: subtotal,
          sort_order: i + 1,
        };
        return { ...draft, ...validateItem({ ...draft, override_reason: null } as never, maps) };
      });

      await supabase.from("budget_items").delete().eq("proposal_id", proposal.id);
      const { error } = await supabase.from("budget_items").insert(rows);
      if (error) throw error;
      refetch();
      toast.success(`${rows.length} item anggaran berhasil disusun.`);
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
          Setiap item divalidasi terhadap standar biaya. Item yang melebihi standar wajib diberi alasan override.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void addItem()}>
            <Plus className="size-4" /> Tambah Item
          </Button>
          <Button size="sm" onClick={() => void handleGenerate()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Susun RAB dengan AI
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Subtotal</p>
          <p className="text-lg font-semibold">{formatCurrency(totals.subtotal)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Pajak</p>
          <p className="text-lg font-semibold">{formatCurrency(totals.tax)}</p>
        </CardContent></Card>
        <Card className={overBudget ? "border-destructive" : undefined}><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Total terhadap nilai hibah</p>
          <p className="text-lg font-semibold">{formatCurrency(totals.grandTotal)}</p>
          <p className="text-xs text-muted-foreground">dari {formatCurrency(grantAmount)}</p>
        </CardContent></Card>
      </div>

      {budget.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Belum ada item anggaran. Susun otomatis dari aktivitas Logical Framework atau tambah manual.
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Kategori</TableHead>
                <TableHead className="min-w-64">Uraian</TableHead>
                <TableHead className="w-28">Satuan</TableHead>
                <TableHead className="w-20">Vol</TableHead>
                <TableHead className="w-20">Frek</TableHead>
                <TableHead className="w-36">Harga Satuan</TableHead>
                <TableHead className="w-36 text-right">Total</TableHead>
                <TableHead className="w-44">Validasi</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {budget.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Select value={item.category} onValueChange={(v) => void update(item, { category: v })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BUDGET_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      defaultValue={item.description}
                      onBlur={(e) => void update(item, { description: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={item.unit} onValueChange={(v) => void update(item, { unit: v })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      type="number"
                      defaultValue={Number(item.volume)}
                      onBlur={(e) => void update(item, { volume: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      type="number"
                      defaultValue={Number(item.frequency)}
                      onBlur={(e) => void update(item, { frequency: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      type="number"
                      defaultValue={Number(item.unit_price)}
                      onBlur={(e) => void update(item, { unit_price: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(item.total ?? 0)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge
                        variant={
                          item.validation_status === "sesuai"
                            ? "default"
                            : item.validation_status === "melebihi_standar"
                              ? "destructive"
                              : "outline"
                        }
                        className="gap-1 text-[10px]"
                      >
                        {item.validation_status === "sesuai" ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <AlertTriangle className="size-3" />
                        )}
                        {item.validation_status}
                      </Badge>
                      {item.validation_status === "melebihi_standar" && (
                        <Input
                          className="h-7 text-xs"
                          placeholder="Alasan override"
                          defaultValue={item.override_reason ?? ""}
                          onBlur={(e) => void update(item, { override_reason: e.target.value || null })}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => void removeItem(item.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}