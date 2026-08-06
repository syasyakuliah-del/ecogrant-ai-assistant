export type BudgetItemRow = {
  id: string;
  proposal_id: string;
  code: string | null;
  category: string;
  activity_name: string | null;
  description: string;
  source_type: string;
  sbm_id: string | null;
  sbu_id: string | null;
  volume: number | string;
  unit: string;
  frequency: number | string;
  unit_price: number | string;
  tax_rate: number | string;
  subtotal: number | string;
  tax_amount: number | string;
  total: number | string;
  validation_status: string;
  validation_message: string | null;
  override_reason: string | null;
  sort_order: number;
};

export type StandardRow = { id: string; code: string; price: number | string; description: string };

export function validateItem(
  item: Pick<BudgetItemRow, "unit_price" | "sbm_id" | "sbu_id" | "override_reason">,
  standards: { sbm: Map<string, StandardRow>; sbu: Map<string, StandardRow> },
): { validation_status: string; validation_message: string | null } {
  const price = Number(item.unit_price ?? 0);
  const std = item.sbm_id
    ? standards.sbm.get(item.sbm_id)
    : item.sbu_id
      ? standards.sbu.get(item.sbu_id)
      : undefined;

  if (!std) {
    return { validation_status: "manual", validation_message: "Item tidak mengacu pada standar biaya." };
  }
  const stdPrice = Number(std.price);
  if (price <= stdPrice) {
    return { validation_status: "sesuai", validation_message: `Sesuai standar ${std.code}.` };
  }
  const diff = price - stdPrice;
  const pct = stdPrice > 0 ? (diff / stdPrice) * 100 : 100;
  const message = `Melebihi standar ${std.code} sebesar Rp ${diff.toLocaleString("id-ID")} (${pct.toFixed(1)} persen).`;
  if (item.override_reason) {
    return { validation_status: "override", validation_message: `${message} Override disetujui.` };
  }
  return { validation_status: "melebihi_standar", validation_message: message };
}

export function budgetTotals(items: BudgetItemRow[]) {
  const subtotal = items.reduce((a, i) => a + Number(i.subtotal ?? 0), 0);
  const tax = items.reduce((a, i) => a + Number(i.tax_amount ?? 0), 0);
  return { subtotal, tax, grandTotal: subtotal + tax };
}

export function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row) || "Lainnya";
    map.set(k, [...(map.get(k) ?? []), row]);
  }
  return map;
}