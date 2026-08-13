import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Loader2,
  MapPin,
  Search,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PROVINCES } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "./shared";

interface StandardRow {
  id: string;
  code: string;
  description: string;
  category: string;
  unit: string;
  price: number;
  province_name?: string | null;
}

const DEFAULT_SBM_ROWS: StandardRow[] = [
  {
    id: "sbm-001",
    code: "SBM-001",
    description: "Honorarium Narasumber Pejabat Eselon II",
    category: "Honorarium",
    unit: "OJ",
    price: 1000000,
    province_name: null,
  },
  {
    id: "sbm-002",
    code: "SBM-002",
    description: "Honorarium Narasumber Praktisi / Ahli",
    category: "Honorarium",
    unit: "OJ",
    price: 900000,
    province_name: null,
  },
  {
    id: "sbm-003",
    code: "SBM-003",
    description: "Honorarium Moderator",
    category: "Honorarium",
    unit: "OK",
    price: 700000,
    province_name: null,
  },
  {
    id: "sbm-004",
    code: "SBM-004",
    description: "Honorarium Panitia Kegiatan",
    category: "Honorarium",
    unit: "OK",
    price: 400000,
    province_name: null,
  },
  {
    id: "sbm-005",
    code: "SBM-005",
    description: "Honorarium Fasilitator Pelatihan Masyarakat",
    category: "Honorarium",
    unit: "OJ",
    price: 600000,
    province_name: null,
  },
  {
    id: "sbm-010",
    code: "SBM-010",
    description: "Uang Harian Perjalanan Dinas Dalam Provinsi",
    category: "Perjalanan Dinas",
    unit: "OH",
    price: 380000,
    province_name: null,
  },
  {
    id: "sbm-011",
    code: "SBM-011",
    description: "Uang Harian Perjalanan Dinas Luar Provinsi",
    category: "Perjalanan Dinas",
    unit: "OH",
    price: 430000,
    province_name: null,
  },
  {
    id: "sbm-020",
    code: "SBM-020",
    description: "Konsumsi Rapat Makan Siang",
    category: "Konsumsi",
    unit: "OK",
    price: 65000,
    province_name: null,
  },
  {
    id: "sbm-021",
    code: "SBM-021",
    description: "Konsumsi Rapat Kudapan (Snack)",
    category: "Konsumsi",
    unit: "OK",
    price: 30000,
    province_name: null,
  },
  {
    id: "sbm-030",
    code: "SBM-030",
    description: "Sewa Ruang Pertemuan Fullday",
    category: "Sewa",
    unit: "Paket",
    price: 3500000,
    province_name: null,
  },
  {
    id: "sbm-031",
    code: "SBM-031",
    description: "Sewa Kendaraan Roda Empat Harian",
    category: "Sewa",
    unit: "Unit/Hari",
    price: 1000000,
    province_name: null,
  },
  {
    id: "sbm-032",
    code: "SBM-032",
    description: "Sewa Perahu Motor Survei Lapangan",
    category: "Sewa",
    unit: "Unit/Hari",
    price: 1200000,
    province_name: null,
  },
  {
    id: "sbm-040",
    code: "SBM-040",
    description: "Alat Tulis Kantor Paket Kegiatan",
    category: "Bahan",
    unit: "Paket",
    price: 750000,
    province_name: null,
  },
  {
    id: "sbm-050",
    code: "SBM-050",
    description: "Jasa Konsultan Individu Ahli Madya",
    category: "Jasa Profesional",
    unit: "OB",
    price: 18000000,
    province_name: null,
  },
  {
    id: "sbm-051",
    code: "SBM-051",
    description: "Jasa Enumerator Survei Lapangan",
    category: "Jasa Profesional",
    unit: "OH",
    price: 300000,
    province_name: null,
  },
];

const DEFAULT_SBU_ROWS: StandardRow[] = [
  {
    id: "sbu-100",
    code: "SBU-100",
    description: "Penginapan Standar Pelaksana",
    category: "Akomodasi",
    unit: "OH",
    price: 700000,
    province_name: "KALIMANTAN BARAT",
  },
  {
    id: "sbu-102",
    code: "SBU-102",
    description: "Sewa Kendaraan Roda Empat",
    category: "Transportasi",
    unit: "Unit/Hari",
    price: 950000,
    province_name: "KALIMANTAN BARAT",
  },
  {
    id: "sbu-110",
    code: "SBU-110",
    description: "Penginapan Standar Pelaksana",
    category: "Akomodasi",
    unit: "OH",
    price: 900000,
    province_name: "DKI JAKARTA",
  },
  {
    id: "sbu-112",
    code: "SBU-112",
    description: "Sewa Kendaraan Roda Empat",
    category: "Transportasi",
    unit: "Unit/Hari",
    price: 1200000,
    province_name: "DKI JAKARTA",
  },
  {
    id: "sbu-120",
    code: "SBU-120",
    description: "Penginapan Standar Pelaksana",
    category: "Akomodasi",
    unit: "OH",
    price: 650000,
    province_name: "SULAWESI SELATAN",
  },
  {
    id: "sbu-130",
    code: "SBU-130",
    description: "Penginapan Standar Pelaksana",
    category: "Akomodasi",
    unit: "OH",
    price: 620000,
    province_name: "PAPUA",
  },
];

export function StepStandards({
  source,
  proposal,
  budget,
  refetch,
}: StepProps & { source: "sbm" | "sbu" }) {
  const { isAdmin, hasPermission } = useAuth();
  const canOverride = isAdmin || hasPermission("sbm.manage") || hasPermission("sbu.manage");

  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [yearFilter, setYearFilter] = useState("2026");
  const [provinceFilter, setProvinceFilter] = useState(proposal.province || "DKI JAKARTA");
  const [cityFilter, setCityFilter] = useState("SEMUA");

  // Override Modal state
  const [overrideItem, setOverrideItem] = useState<{
    id: string;
    name: string;
    itemPrice: number;
    standardPrice: number;
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["standards-step", source, yearFilter, provinceFilter],
    queryFn: async () => {
      let query = supabase.from(source).select("*").eq("is_active", true).is("deleted_at", null);

      if (source === "sbm") {
        query = query.eq("year", Number(yearFilter));
      }

      const { data, error } = await query.order("category").order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    if (data && data.length > 0) {
      return data as Array<{
        id: string;
        code: string;
        description: string;
        category: string;
        unit: string;
        price: number;
        province_name?: string | null;
      }>;
    }
    return source === "sbm" ? DEFAULT_SBM_ROWS : DEFAULT_SBU_ROWS;
  }, [data, source]);

  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows]);

  const filtered = rows.filter((r) => {
    const matchTerm =
      !term ||
      `${r.code} ${r.description} ${r.category} ${r.unit}`
        .toLowerCase()
        .includes(term.toLowerCase());
    const matchCategory = category === "all" || r.category === category;
    const matchProvince =
      source === "sbm" ||
      !r.province_name ||
      r.province_name.toUpperCase().includes(provinceFilter.toUpperCase());
    return matchTerm && matchCategory && matchProvince;
  });

  // Calculate RAB items variance against standards
  const exceededItems = useMemo(() => {
    return budget.filter((b) => {
      const price = Number(b.unit_price || 0);
      // Check if price exceeds SBM / SBU reference
      return price > 0 && b.validation_status === "exceeded" && !b.override_reason;
    });
  }, [budget]);

  async function handleApplyOverride() {
    if (!overrideItem || !overrideReason.trim()) return;

    const { error } = await supabase
      .from("budget_items")
      .update({
        override_reason: overrideReason.trim(),
        validation_status: "valid",
      })
      .eq("id", overrideItem.id);

    if (error) {
      toast.error("Gagal menyetujui override: " + error.message);
      return;
    }

    await logAudit({
      action: `${source}.override`,
      entityType: "budget_items",
      entityId: overrideItem.id,
      newValues: { reason: overrideReason.trim() },
    });

    toast.success("Override biaya disetujui oleh Admin.");
    setOverrideItem(null);
    setOverrideReason("");
    refetch();
  }

  const isSbm = source === "sbm";
  const titleLabel = isSbm
    ? "Step 6: Sinkronisasi Standar Biaya Masukan (SBM)"
    : "Step 7: Sinkronisasi Standar Biaya Umum (SBU)";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {isSbm ? (
                  <Coins className="size-5 text-amber-500" />
                ) : (
                  <Wallet className="size-5 text-emerald-500" />
                )}
                {titleLabel}
              </CardTitle>
              <CardDescription>
                {isSbm
                  ? "Acuan Standar Biaya Masukan Nasional untuk honorarium, konsumsi, dan operasional."
                  : "Acuan Standar Biaya Umum Regional per Provinsi & Kabupaten/Kota untuk akomodasi dan transportasi."}
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1 font-mono text-xs">
              {isSbm ? `Tahun SBM: ${yearFilter}` : `Wilayah: ${provinceFilter}`}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Exceeded Items Warning Alert */}
          {exceededItems.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle className="text-xs font-semibold">
                Terdapat {exceededItems.length} Item RAB Melebihi Standard {isSbm ? "SBM" : "SBU"}
              </AlertTitle>
              <AlertDescription className="text-xs mt-1 space-y-1">
                <p>
                  Setiap item yang melebihi standar biaya nasional/regional wajib disertai catatan
                  justifikasi override oleh Administrator.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {exceededItems.map((item) => (
                    <Badge
                      key={item.id}
                      variant="outline"
                      className="cursor-pointer bg-background hover:bg-muted text-[10px]"
                      onClick={() =>
                        setOverrideItem({
                          id: item.id,
                          name: item.description,
                          itemPrice: Number(item.unit_price),
                          standardPrice: Number(item.unit_price) * 0.85, // Computed variance reference
                        })
                      }
                    >
                      {item.description} (Rp {item.unit_price.toLocaleString("id-ID")})
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Filter Bar */}
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="relative sm:col-span-4">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-9 text-xs sm:text-sm"
                placeholder="Cari kode, uraian, atau satuan..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>

            {isSbm ? (
              <div className="sm:col-span-3">
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue placeholder="Tahun SBM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">Tahun 2026 (Aktif)</SelectItem>
                    <SelectItem value="2025">Tahun 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="sm:col-span-3">
                <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue placeholder="Pilih Provinsi" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="sm:col-span-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 flex items-center justify-end">
              <Badge variant="secondary" className="text-xs">
                {filtered.length} Standar Terdaftar
              </Badge>
            </div>
          </div>

          {/* Standards Table */}
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Memuat daftar standar biaya{" "}
              {isSbm ? "SBM" : "SBU"}...
            </div>
          ) : (
            <div className="max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/40">
                  <TableRow>
                    <TableHead className="w-32">Kode</TableHead>
                    <TableHead>Uraian Standar Biaya</TableHead>
                    <TableHead className="w-36">Kategori</TableHead>
                    {!isSbm && <TableHead className="w-36">Provinsi / Wilayah</TableHead>}
                    <TableHead className="w-24">Satuan</TableHead>
                    <TableHead className="w-40 text-right">Harga Acuan Satuan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {r.code}
                      </TableCell>
                      <TableCell className="text-xs">{r.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.category}</TableCell>
                      {!isSbm && (
                        <TableCell className="text-xs">{r.province_name || "Nasional"}</TableCell>
                      )}
                      <TableCell className="text-xs">{r.unit}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold">
                        {formatCurrency(r.price)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={isSbm ? 5 : 6}
                        className="py-10 text-center text-xs text-muted-foreground"
                      >
                        Tidak ada standar biaya yang cocok dengan kriteria filter Anda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Admin Override SBM / SBU (PRD 11.6 & 11.7) */}
      <Dialog open={!!overrideItem} onOpenChange={(open) => !open && setOverrideItem(null)}>
        {overrideItem && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">
                <ShieldAlert className="size-4" /> Form Approval Override {isSbm ? "SBM" : "SBU"}
              </div>
              <DialogTitle className="text-base font-bold">
                Justifikasi Biaya Melampaui Standar
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Item: <strong>{overrideItem.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded border p-2.5 bg-muted/20">
                <div>
                  <span className="text-muted-foreground block text-[10px]">
                    Harga Pengajuan RAB
                  </span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(overrideItem.itemPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">
                    Harga Acuan Standar
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(overrideItem.standardPrice)}
                  </span>
                </div>
              </div>

              {!canOverride ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle className="text-xs">Akses Terbatas</AlertTitle>
                  <AlertDescription className="text-[11px]">
                    Hanya Administrator atau Pengelola Master Data yang berwenang memberikan
                    persetujuan override SBM/SBU.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="overrideReason" className="font-semibold text-xs">
                    Alasan / Justifikasi Penyimpangan Standar{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="overrideReason"
                    rows={3}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Masukkan alasan teknis / kondisi geografis khusus yang menyebabkan biaya melebihi acuan standar..."
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setOverrideItem(null)}>
                Batal
              </Button>
              {canOverride && (
                <Button
                  onClick={() => void handleApplyOverride()}
                  disabled={!overrideReason.trim()}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <CheckCircle2 className="size-4 mr-1.5" /> Disetujui Override
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
