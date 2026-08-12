import React, { useState } from "react";
import {
  Sparkles,
  Calculator,
  MapPin,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Send,
  Building2,
  Image as ImageIcon,
  PenTool,
  Download,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const REGIONS: Record<string, { label: string; multiplier: number; sbmNote: string }> = {
  kalsel: {
    label: "Kalimantan Selatan (Balai BPHL XI Banjarbaru)",
    multiplier: 1.0,
    sbmNote: "Pergub Kalsel & Standar Biaya Masukan Balai BPHL XI Banjarbaru 2026",
  },
  dki: {
    label: "DKI Jakarta (Pusat Kemenhut / BPDLH)",
    multiplier: 1.25,
    sbmNote: "PMK SBM Nasional & Pagu BPDLH Jakarta 2026",
  },
  papua: {
    label: "Papua Barat (Wilayah Khusus Konservasi)",
    multiplier: 1.45,
    sbmNote: "SBM Wilayah Khusus Kehutanan & Papua 2026",
  },
  nasional: {
    label: "Nasional (Standar Rata-rata Donor)",
    multiplier: 1.1,
    sbmNote: "Standar Umum Lembaga Donor Internasional 2026",
  },
};

const PRESETS = [
  {
    id: "kompos",
    title: "Pelatihan Kompos & Pengelolaan Sampah Desa (3 Hari)",
    domain: "Pemberdayaan Masyarakat & Lingkungan",
    targetOrg: "Kelompok Tani Desa & Komunitas Lokal",
    description:
      "Pelatihan praktek pembuatan pupuk organik kompos limbah pertanian dan manajemen tempat pengelolaan sampah desa terpadu.",
    deliverables: [
      "120kg pupuk kompos kualitas tinggi siap pakai",
      "Dokumen SOP Pengelolaan Sampah Mandiri Desa",
      "Modul Infografis Panduan Visual Pemilahan Sampah",
    ],
    milestones: [
      "Hari 1: Orientasi & Pemilahan Bahan Organik",
      "Hari 2: Praktek Pencampuran & Aktivator Bio-kompos",
      "Hari 3: Pengemasan & Evaluasi SOP Desa",
    ],
    kpis: ["30 Peserta Desa Terlatih", "85% Nilai Pemahaman Post-Test", "1 Unit Bank Sampah Desa Terbentuk"],
    sbmItems: [
      { kategori: "Honorarium", item: "Honorarium Narasumber Pakar Pengelolaan Sampah", satuan: "O-J (Orang-Jam)", volumeDefault: 12, rateBase: 350000 },
      { kategori: "Honorarium", item: "Honorarium Fasilitator Lapangan Pemberdayaan", satuan: "O-H (Orang-Hari)", volumeDefault: 3, rateBase: 450000 },
      { kategori: "Logistik Acara", item: "Uang Harian Peserta Pelatihan Desa", satuan: "O-H (Orang-Hari)", volumeDefault: 90, rateBase: 120000 },
      { kategori: "Logistik Acara", item: "Konsumsi Pelatihan (Makan & Break)", satuan: "O-K (Orang-Kali)", volumeDefault: 180, rateBase: 45000 },
      { kategori: "Sewa Peralatan", item: "Sewa Mesin Pencacah Organik Lapangan", satuan: "Unit-Hari", volumeDefault: 3, rateBase: 650000 },
    ],
  },
  {
    id: "dukuh",
    title: "Restorasi Agroforestri Tradisional Sistem Dukuh",
    domain: "Kehutanan & Pelestarian Hutan",
    targetOrg: "Lembaga Pengelola Hutan Desa (LPHD)",
    description:
      "Pendampingan masyarakat adat dalam memetakan dan mengembalikan keanekaragaman hayati kebun buah & pohon hutan lokal (sistem Dukuh Kalsel).",
    deliverables: [
      "Peta Geospatial 150 Ha Plot Agroforestri Dukuh",
      "Penyediaan 2.500 Bibit Pohon Endemik & Buah Lokal",
      "Buku Panduan Tata Kelola Hutan Adat",
    ],
    milestones: [
      "Bulan 1: Pemetaan Participatory Mapping & Grid GPS",
      "Bulan 2: Pengadaan & Pemeliharaan Persemaian Bibit",
      "Bulan 3: Penanaman Bersama & Konsolidasi Kelompok",
    ],
    kpis: ["150 Ha Tutupan Agroforestri Terdaftar", "2.500 Bibit Pohon Tertanam", "50 Anggota LPHD Terlibat"],
    sbmItems: [
      { kategori: "Honorarium", item: "Honorarium Tenaga Ahli Pemetaan GIS Kehutanan", satuan: "O-B (Orang-Bulan)", volumeDefault: 1, rateBase: 7500000 },
      { kategori: "Honorarium", item: "Honorarium Pendamping Lapangan Agroforestri", satuan: "O-B (Orang-Bulan)", volumeDefault: 2, rateBase: 4000000 },
      { kategori: "Bahan & Bibit", item: "Bibit Pohon Endemik & Buah Lokal Berkualitas", satuan: "Batang", volumeDefault: 2500, rateBase: 18000 },
      { kategori: "Transportasi", item: "Sewa Kendaraan Operasional Lapangan 4x4", satuan: "Unit-Hari", volumeDefault: 10, rateBase: 1200000 },
    ],
  },
  {
    id: "kampanye",
    title: "Kampanye Visual Edukasi Infografis Hutan Lestari",
    domain: "Media, Publikasi & Kampanye Lingkungan",
    targetOrg: "NGO Lingkungan & Generasi Muda",
    description:
      "Penyusunan paket edukasi publik berbasis media sosial dan infografis cetak untuk meningkatkan kepedulian pelestarian hutan.",
    deliverables: [
      "12 Konten Infografis Serial Instagram & Web",
      "2 Video Short Motion Graphics Kampanye",
      "Buku Saku Digital Edukasi Konservasi PDF",
    ],
    milestones: [
      "Minggu 1: Riset Data & Penyusunan Storyline",
      "Minggu 2: Produksi Aset Visual & Motion Design",
      "Minggu 3: Launching Digital & Evaluasi Jangkauan",
    ],
    kpis: ["100.000 Digital Impressions", "12 Seri Content Kit Terpublikasi", "1.500 Download Buku Saku"],
    sbmItems: [
      { kategori: "Honorarium", item: "Honorarium Desain Grafis Kampanye Edukasi", satuan: "Paket", volumeDefault: 1, rateBase: 5000000 },
      { kategori: "Honorarium", item: "Honorarium Penulis Narasi & Riset Kampanye", satuan: "Paket", volumeDefault: 1, rateBase: 3500000 },
      { kategori: "Publikasi", item: "Promosi & Distribusi Media Digital Kampanye", satuan: "Kegiatan", volumeDefault: 1, rateBase: 2500000 },
    ],
  },
];

export function SbmSimulator() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("dukuh");
  const [selectedRegionKey, setSelectedRegionKey] = useState<string>("kalsel");
  const [enableRiskManagement, setEnableRiskManagement] = useState(true);
  const [enableTeamStructure, setEnableTeamStructure] = useState(true);
  const [enableCustomBranding, setEnableCustomBranding] = useState(true);
  const [enablePortfolioAttachment, setEnablePortfolioAttachment] = useState(true);
  const [customOverrideRate, setCustomOverrideRate] = useState<number | null>(null);
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
  const [signedState, setSignedState] = useState(false);

  const preset = PRESETS.find((p) => p.id === selectedPresetId) ?? PRESETS[0];
  const region = REGIONS[selectedRegionKey] ?? REGIONS["kalsel"];

  const calculatedItems = (preset?.sbmItems ?? []).map((item, idx) => {
    const baseRate = Math.round(item.rateBase * (region?.multiplier ?? 1));
    const finalRate = idx === 0 && customOverrideRate !== null ? customOverrideRate : baseRate;
    const total = finalRate * item.volumeDefault;
    return { ...item, finalRate, total, isOverridden: idx === 0 && customOverrideRate !== null };
  });

  const totalRab = calculatedItems.reduce((acc, curr) => acc + curr.total, 0);

  function formatRupiah(num: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  }

  return (
    <div className="surface-panel overflow-hidden border-2 border-foreground/20 bg-card shadow-xl transition-all">
      {/* Header Widget */}
      <div className="flex flex-col border-b border-border bg-gradient-to-r from-emerald-950/10 via-emerald-900/5 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Calculator className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
                Simulator Costing & Proposal Interactive
              </h3>
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                <Sparkles className="size-3" /> Live PRD Engine
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Uji coba penerjemahan Scope of Work & perhitungan SBM regional secara real-time.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 sm:mt-0">
          <Badge variant="outline" className="gap-1 text-xs border-border bg-background">
            <MapPin className="size-3 text-primary" /> {region?.label?.split(" ")[0] ?? ""}
          </Badge>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {/* Step 1: Controls Row */}
        <div className="grid gap-4 md:grid-cols-12">
          {/* Preset Selector */}
          <div className="md:col-span-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1. Pilih Preset Scope of Work (Brief Inisial)
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => {
                setSelectedPresetId(e.target.value);
                setCustomOverrideRate(null);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.domain})
                </option>
              ))}
            </select>
          </div>

          {/* Region SBM Selector */}
          <div className="md:col-span-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              2. Filter SBM Regional (Database Indeks Harga)
            </label>
            <select
              value={selectedRegionKey}
              onChange={(e) => setSelectedRegionKey(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(REGIONS).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info Note about current SBM standard */}
        <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground border border-border/50">
          <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            <strong>Acuan SBM:</strong> {region?.sbmNote ?? "Standard nasional"}
          </span>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="costing" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 bg-muted/80 p-1">
            <TabsTrigger value="scope" className="text-xs sm:text-sm font-medium">
              <FileText className="mr-1.5 size-3.5" /> Scope & Timeline
            </TabsTrigger>
            <TabsTrigger value="costing" className="text-xs sm:text-sm font-medium">
              <Calculator className="mr-1.5 size-3.5" /> RAB SBM Regional
            </TabsTrigger>
            <TabsTrigger value="workspace" className="text-xs sm:text-sm font-medium">
              <SlidersHorizontal className="mr-1.5 size-3.5" /> Modul & Asset Vault
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Scope & Timeline */}
          <TabsContent value="scope" className="mt-4 space-y-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <h4 className="font-display text-sm font-semibold text-foreground">{preset?.title}</h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{preset?.description}</p>
              
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-border/80 bg-muted/30 p-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Deliverables Utama</span>
                  <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                    {(preset?.deliverables ?? []).map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-md border border-border/80 bg-muted/30 p-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Milestones & Tahapan</span>
                  <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                    {(preset?.milestones ?? []).map((m, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <ChevronRight className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-md border border-border/80 bg-muted/30 p-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">KPI Indikator Keberhasilan</span>
                  <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                    {(preset?.kpis ?? []).map((k, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Badge variant="secondary" className="px-1 py-0 text-[10px] bg-primary/10 text-primary">KPI</Badge>
                        <span>{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Costing SBM */}
          <TabsContent value="costing" className="mt-4 space-y-4">
            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/60 font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">Kategori</th>
                    <th className="px-3 py-2.5">Item Pembiayaan SBM</th>
                    <th className="px-3 py-2.5 text-center">Satuan</th>
                    <th className="px-3 py-2.5 text-center">Volume</th>
                    <th className="px-3 py-2.5 text-right">Harga Satuan (SBM)</th>
                    <th className="px-3 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {calculatedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        <Badge variant="outline" className="text-[10px] py-0">{item.kategori}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {item.item}
                        {idx === 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Override Harga Manual:</span>
                            <input
                              type="number"
                              placeholder={item.finalRate.toString()}
                              value={customOverrideRate ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                setCustomOverrideRate(val);
                              }}
                              className="w-28 rounded border border-input px-1.5 py-0.5 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            {item.isOverridden && (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[9px]">
                                Custom Rate Active
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">{item.satuan}</td>
                      <td className="px-3 py-2.5 text-center font-mono font-medium">{item.volumeDefault}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{formatRupiah(item.finalRate)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">
                        {formatRupiah(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-foreground/20 bg-muted/40 font-semibold">
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-right font-display text-sm">
                      Total Rencana Anggaran Biaya (RAB):
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-base text-primary">
                      {formatRupiah(totalRab)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground px-1">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-emerald-500" /> Auto-mapped to target institution guidelines ({preset?.targetOrg ?? ""})
              </span>
              <span className="font-mono text-[11px]">Database Schema: `sbm_rates` (Version 2026)</span>
            </div>
          </TabsContent>

          {/* TAB 3: Modul WYSIWYG & Asset Vault */}
          <TabsContent value="workspace" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* WYSIWYG Modular Toggles */}
              <div className="rounded-lg border border-border bg-background p-4">
                <h4 className="font-display text-sm font-semibold flex items-center gap-2 text-foreground">
                  <SlidersHorizontal className="size-4 text-primary" /> Sakelar Bab Opsional (WYSIWYG Editor)
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aktifkan bab sesuai kebutuhan donor tanpa perlu merombak struktur utama.
                </p>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center justify-between rounded-md border border-border p-2.5 hover:bg-muted/50 cursor-pointer text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-500" /> Bab "Manajemen Risiko & Mitigasi Bencana"
                    </span>
                    <input
                      type="checkbox"
                      checked={enableRiskManagement}
                      onChange={(e) => setEnableRiskManagement(e.target.checked)}
                      className="size-4 accent-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-md border border-border p-2.5 hover:bg-muted/50 cursor-pointer text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <Building2 className="size-4 text-emerald-500" /> Bab "Struktur Tim & Tata Kelola Organisasi"
                    </span>
                    <input
                      type="checkbox"
                      checked={enableTeamStructure}
                      onChange={(e) => setEnableTeamStructure(e.target.checked)}
                      className="size-4 accent-primary"
                    />
                  </label>
                </div>
              </div>

              {/* Asset Vault & Branding Integrator */}
              <div className="rounded-lg border border-border bg-background p-4">
                <h4 className="font-display text-sm font-semibold flex items-center gap-2 text-foreground">
                  <ImageIcon className="size-4 text-primary" /> Modul Asset Vault & Portfolio Integrator
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sematkan logo lembaga & rekam jejak infografis langsung ke lampiran proposal.
                </p>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center justify-between rounded-md border border-border p-2.5 hover:bg-muted/50 cursor-pointer text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                        NGO
                      </span>
                      <div>
                        <span className="block">Logo Lembaga ("The Guardian of The Earth")</span>
                        <span className="text-[10px] text-muted-foreground">Header & Footer Dokumen Otomatis</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableCustomBranding}
                      onChange={(e) => setEnableCustomBranding(e.target.checked)}
                      className="size-4 accent-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-md border border-border p-2.5 hover:bg-muted/50 cursor-pointer text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="size-4 text-emerald-500" />
                      <div>
                        <span className="block">Portofolio Instagram & Kampanye Visual</span>
                        <span className="text-[10px] text-muted-foreground">Disematkan ke Halaman Lampiran</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enablePortfolioAttachment}
                      onChange={(e) => setEnablePortfolioAttachment(e.target.checked)}
                      className="size-4 accent-primary"
                    />
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Action Card: Magic Link Delivery */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Send className="size-4" />
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold text-foreground">
                Modul Magic Link & Digital E-Signature Ready
              </h4>
              <p className="text-xs text-muted-foreground">
                Kirim proposal dalam bentuk tautan web interaktif aman dengan pelacak rekam baca & e-signature.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowMagicLinkModal(true)}
            size="sm"
            className="w-full sm:w-auto font-medium gap-2"
          >
            <Eye className="size-4" /> Preview Magic Link Client Portal
          </Button>
        </div>
      </div>

      {/* Modal Dialog Interactive Magic Link Portal */}
      <Dialog open={showMagicLinkModal} onOpenChange={setShowMagicLinkModal}>
        <DialogContent className="max-w-2xl sm:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Interactive Magic Link Portal
            </div>
            <DialogTitle className="font-display text-xl">
              [Preview Client Portal] Proposal Hibah {preset?.title ?? ""}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tampilan interaktif yang diterima oleh pihak donor/kementerian melalui Magic Link aman.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-xs">
            {/* Header Document Preview */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                {enableCustomBranding && (
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                    THE GUARDIAN OF THE EARTH
                  </Badge>
                )}
                <span className="font-mono text-muted-foreground text-[11px]">Ref: EXP-2026-KALSAL-09</span>
              </div>
              <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> Status: Terriset & Validasi SBM
              </Badge>
            </div>

            <div className="space-y-2">
              <h5 className="font-semibold text-foreground text-sm">Ringkasan Eksekutif Program</h5>
              <p className="text-muted-foreground leading-relaxed">{preset?.description ?? ""}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded bg-muted/40 p-2.5 border border-border/60">
                <span className="font-semibold text-foreground">Wilayah Operasional:</span>
                <p className="text-muted-foreground mt-0.5">{region?.label ?? ""}</p>
              </div>
              <div className="rounded bg-muted/40 p-2.5 border border-border/60">
                <span className="font-semibold text-foreground">Total Pengajuan Anggaran (RAB):</span>
                <p className="font-mono text-sm font-bold text-primary mt-0.5">{formatRupiah(totalRab)}</p>
              </div>
            </div>

            {/* Optional Modules Attached Indicator */}
            <div className="flex flex-wrap gap-2 pt-1">
              {enableRiskManagement && (
                <Badge variant="secondary" className="text-[10px]">
                  + Lampiran Manajemen Risiko & Mitigasi
                </Badge>
              )}
              {enableTeamStructure && (
                <Badge variant="secondary" className="text-[10px]">
                  + Lampiran Struktur Tim Pengelola
                </Badge>
              )}
              {enablePortfolioAttachment && (
                <Badge variant="secondary" className="text-[10px]">
                  + Lampiran Portofolio Visual Instagram
                </Badge>
              )}
            </div>

            {/* E-Signature Simulator Section */}
            <div className="mt-4 rounded-lg border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-4 text-center">
              <h6 className="font-semibold text-foreground">Digital E-Signature Approval</h6>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Donor dapat langsung menandatangani proposal ini secara sah & digital dari tautan web.
              </p>

              {signedState ? (
                <div className="mt-3 flex items-center justify-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-5" /> Tanda Tangan Digital Diverifikasi oleh Balai / Donor Target (13 Agu 2026)
                </div>
              ) : (
                <Button
                  onClick={() => setSignedState(true)}
                  size="sm"
                  className="mt-3 bg-emerald-700 hover:bg-emerald-800 text-white font-medium gap-2"
                >
                  <PenTool className="size-4" /> Bubuhkan Tanda Tangan Digital (Simulasi Instan)
                </Button>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSignedState(false);
                setShowMagicLinkModal(false);
              }}
            >
              Tutup Preview
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="gap-1 text-xs">
                <Download className="size-3.5" /> Unduh Dokumen (PDF/DOCX)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
