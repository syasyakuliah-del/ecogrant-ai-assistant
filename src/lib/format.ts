export function formatCurrency(value: number | string | null | undefined, currency = "IDR") {
  const n = Number(value ?? 0);
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  }
  return new Intl.NumberFormat("id-ID", { style: "currency", currency }).format(n);
}

export function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function monthsBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(0, months + (e.getDate() >= s.getDate() ? 1 : 0));
}
