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
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
    kpis: [
      "30 Peserta Desa Terlatih",
      "85% Nilai Pemahaman Post-Test",
      "1 Unit Bank Sampah Desa Terbentuk",
    ],
    sbmItems: [
      {
        kategori: "Honorarium",
        item: "Honorarium Narasumber Pakar Pengelolaan Sampah",
        satuan: "O-J (Orang-Jam)",
        volumeDefault: 12,
        rateBase: 350000,
      },
      {
        kategori: "Honorarium",
        item: "Honorarium Fasilitator Lapangan Pemberdayaan",
        satuan: "O-H (Orang-Hari)",
        volumeDefault: 3,
        rateBase: 450000,
      },
      {
        kategori: "Logistik Acara",
        item: "Uang Harian Peserta Pelatihan Desa",
        satuan: "O-H (Orang-Hari)",
        volumeDefault: 90,
        rateBase: 120000,
      },
      {
        kategori: "Logistik Acara",
        item: "Konsumsi Pelatihan (Makan & Break)",
        satuan: "O-K (Orang-Kali)",
        volumeDefault: 180,
        rateBase: 45000,
      },
      {
        kategori: "Sewa Peralatan",
        item: "Sewa Mesin Pencacah Organik Lapangan",
        satuan: "Unit-Hari",
        volumeDefault: 3,
        rateBase: 650000,
      },
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
    kpis: [
      "150 Ha Tutupan Agroforestri Terdaftar",
      "2.500 Bibit Pohon Tertanam",
      "50 Anggota LPHD Terlibat",
    ],
    sbmItems: [
      {
        kategori: "Honorarium",
        item: "Honorarium Tenaga Ahli Pemetaan GIS Kehutanan",
        satuan: "O-B (Orang-Bulan)",
        volumeDefault: 1,
        rateBase: 7500000,
      },
      {
        kategori: "Honorarium",
        item: "Honorarium Pendamping Lapangan Agroforestri",
        satuan: "O-B (Orang-Bulan)",
        volumeDefault: 2,
        rateBase: 4000000,
      },
      {
        kategori: "Bahan & Bibit",
        item: "Bibit Pohon Endemik & Buah Lokal Berkualitas",
        satuan: "Batang",
        volumeDefault: 2500,
        rateBase: 18000,
      },
      {
        kategori: "Transportasi",
        item: "Sewa Kendaraan Operasional Lapangan 4x4",
        satuan: "Unit-Hari",
        volumeDefault: 10,
        rateBase: 1200000,
      },
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
    kpis: [
      "100.000 Digital Impressions",
      "12 Seri Content Kit Terpublikasi",
      "1.500 Download Buku Saku",
    ],
    sbmItems: [
      {
        kategori: "Honorarium",
        item: "Honorarium Desain Grafis Kampanye Edukasi",
        satuan: "Paket",
        volumeDefault: 1,
        rateBase: 5000000,
      },
      {
        kategori: "Honorarium",
        item: "Honorarium Penulis Narasi & Riset Kampanye",
        satuan: "Paket",
        volumeDefault: 1,
        rateBase: 3500000,
      },
      {
        kategori: "Publikasi",
        item: "Promosi & Distribusi Media Digital Kampanye",
        satuan: "Kegiatan",
        volumeDefault: 1,
        rateBase: 2500000,
      },
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
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  }

  return (
    <div className="surface-panel overflow-hidden border-2 border-foreground/20 bg-card shadow-xl transition-all">
      {/* Header Widget */}
      <div className="flex flex-col border-b border-slate-300 bg-gradient-to-r from-emerald-950/15 via-emerald-900/10 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#1B4332] text-white shadow-sm">
            <Calculator className="size-5 text-[#52B788]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base sm:text-lg font-extrabold tracking-tight text-[#0F172A]">
                Simulator Costing & Proposal Interactive
              </h3>
              <Badge
                variant="secondary"
                className="gap-1 bg-[#1B4332] text-white border-[#2D6A4F] text-xs font-extrabold px-2.5 py-0.5"
              >
                <Sparkles className="size-3.5 text-[#52B788]" /> Live PRD Engine
              </Badge>
            </div>
            <p className="text-xs sm:text-sm font-medium text-[#334155]">
              Uji coba penerjemahan Scope of Work & perhitungan SBM regional secara real-time.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 sm:mt-0">
          <Badge variant="outline" className="gap-1.5 text-xs sm:text-sm font-bold border-slate-300 bg-white text-[#0F172A] px-3 py-1 shadow-xs">
            <MapPin className="size-3.5 text-[#1B4332]" /> {region?.label?.split(" ")[0] ?? ""}
          </Badge>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {/* Step 1: Controls Row */}
        <div className="grid gap-4 md:grid-cols-12">
          {/* Preset Selector */}
          <div className="md:col-span-6">
            <label className="mb-1.5 block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#0F172A]">
              1. Pilih Preset Scope of Work (Brief Inisial)
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => {
                setSelectedPresetId(e.target.value);
                setCustomOverrideRate(null);
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4332] shadow-xs"
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
            <label className="mb-1.5 block text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#0F172A]">
              2. Filter SBM Regional (Database Indeks Harga)
            </label>
            <select
              value={selectedRegionKey}
              onChange={(e) => setSelectedRegionKey(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1B4332] shadow-xs"
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
        <div className="mt-3 flex items-center gap-2 rounded-md bg-emerald-50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#1B4332] border border-emerald-200">
          <ShieldCheck className="size-4 shrink-0 text-[#2D6A4F]" />
          <span>
            <strong>Acuan SBM:</strong> {region?.sbmNote ?? "Standard nasional"}
          </span>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="costing" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1.5 border border-slate-300 rounded-xl">
            <TabsTrigger value="scope" className="text-xs sm:text-sm font-extrabold text-[#0F172A] py-2">
              <FileText className="mr-1.5 size-4 text-[#1B4332]" /> Scope & Timeline
            </TabsTrigger>
            <TabsTrigger value="costing" className="text-xs sm:text-sm font-extrabold text-[#0F172A] py-2">
              <Calculator className="mr-1.5 size-4 text-[#1B4332]" /> RAB SBM Regional
            </TabsTrigger>
            <TabsTrigger value="workspace" className="text-xs sm:text-sm font-extrabold text-[#0F172A] py-2">
              <SlidersHorizontal className="mr-1.5 size-4 text-[#1B4332]" /> Modul & Asset Vault
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Scope & Timeline */}
          <TabsContent value="scope" className="mt-4 space-y-4">
            <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-xs">
              <h4 className="font-display text-base sm:text-lg font-extrabold text-[#0F172A]">
                {preset?.title}
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-[#334155] leading-relaxed font-medium">
                {preset?.description}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#1B4332]">
                    Deliverables Utama
                  </span>
                  <ul className="mt-2 space-y-2 text-xs sm:text-sm font-medium text-[#0F172A]">
                    {(preset?.deliverables ?? []).map((d, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-[#2D6A4F] shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#1B4332]">
                    Milestones & Tahapan
                  </span>
                  <ul className="mt-2 space-y-2 text-xs sm:text-sm font-medium text-[#0F172A]">
                    {(preset?.milestones ?? []).map((m, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="size-4 text-[#2D6A4F] shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#1B4332]">
                    KPI Indikator Keberhasilan
                  </span>
                  <ul className="mt-2 space-y-2 text-xs sm:text-sm font-medium text-[#0F172A]">
                    {(preset?.kpis ?? []).map((k, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0.5 text-xs font-extrabold bg-[#1B4332] text-white"
                        >
                          KPI
                        </Badge>
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
            <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-xs">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-300 bg-slate-100 font-extrabold text-[#0F172A] uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-3">Kategori</th>
                    <th className="px-3.5 py-3">Item Pembiayaan SBM</th>
                    <th className="px-3.5 py-3 text-center">Satuan</th>
                    <th className="px-3.5 py-3 text-center">Volume</th>
                    <th className="px-3.5 py-3 text-right">Harga Satuan (SBM)</th>
                    <th className="px-3.5 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[#0F172A]">
                  {calculatedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-3 font-bold text-[#0F172A]">
                        <Badge variant="outline" className="text-xs font-bold py-0.5 border-slate-300 text-[#0F172A]">
                          {item.kategori}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-3 text-[#0F172A] font-bold">
                        {item.item}
                        {idx === 0 && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-xs text-[#334155] font-semibold">
                              Override Harga Manual:
                            </span>
                            <input
                              type="number"
                              placeholder={item.finalRate.toString()}
                              value={customOverrideRate ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                setCustomOverrideRate(val);
                              }}
                              className="w-32 rounded border border-slate-300 px-2 py-1 text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                            />
                            {item.isOverridden && (
                              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-extrabold">
                                Custom Rate Active
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center font-medium text-[#334155]">
                        {item.satuan}
                      </td>
                      <td className="px-3.5 py-3 text-center font-mono font-bold text-[#0F172A]">
                        {item.volumeDefault}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-medium text-[#0F172A]">
                        {formatRupiah(item.finalRate)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-extrabold text-[#1B4332]">
                        {formatRupiah(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                  <tr>
                    <td colSpan={5} className="px-3.5 py-3.5 text-right font-display text-sm sm:text-base text-[#0F172A]">
                      Total Rencana Anggaran Biaya (RAB):
                    </td>
                    <td className="px-3.5 py-3.5 text-right font-mono text-base sm:text-lg font-black text-[#1B4332]">
                      {formatRupiah(totalRab)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-[#334155] px-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-[#2D6A4F]" /> Auto-mapped to target
                institution guidelines ({preset?.targetOrg ?? ""})
              </span>
              <span className="font-mono text-xs text-slate-600">
                Database Schema: `sbm_rates` (Version 2026)
              </span>
            </div>
          </TabsContent>

          {/* TAB 3: Modul WYSIWYG & Asset Vault */}
          <TabsContent value="workspace" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* WYSIWYG Modular Toggles */}
              <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-xs">
                <h4 className="font-display text-sm sm:text-base font-extrabold flex items-center gap-2 text-[#0F172A]">
                  <SlidersHorizontal className="size-4.5 text-[#1B4332]" /> Sakelar Bab Opsional
                  (WYSIWYG Editor)
                </h4>
                <p className="mt-1 text-xs sm:text-sm text-[#334155] font-medium">
                  Aktifkan bab sesuai kebutuhan donor tanpa perlu merombak struktur utama.
                </p>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center justify-between rounded-md border border-slate-300 p-3 hover:bg-slate-50 cursor-pointer text-xs sm:text-sm font-bold text-[#0F172A]">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-[#2D6A4F]" /> Bab "Manajemen Risiko &
                      Mitigasi Bencana"
                    </span>
                    <input
                      type="checkbox"
                      checked={enableRiskManagement}
                      onChange={(e) => setEnableRiskManagement(e.target.checked)}
                      className="size-4 accent-[#1B4332]"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-md border border-slate-300 p-3 hover:bg-slate-50 cursor-pointer text-xs sm:text-sm font-bold text-[#0F172A]">
                    <span className="flex items-center gap-2">
                      <Building2 className="size-4 text-[#2D6A4F]" /> Bab "Struktur Tim & Tata
                      Kelola Organisasi"
                    </span>
                    <input
                      type="checkbox"
                      checked={enableTeamStructure}
                      onChange={(e) => setEnableTeamStructure(e.target.checked)}
                      className="size-4 accent-[#1B4332]"
                    />
                  </label>
                </div>
              </div>

              {/* Asset Vault & Branding Integrator */}
              <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-xs">
                <h4 className="font-display text-sm sm:text-base font-extrabold flex items-center gap-2 text-[#0F172A]">
                  <ImageIcon className="size-4.5 text-[#1B4332]" /> Modul Asset Vault & Portfolio
                  Integrator
                </h4>
                <p className="mt-1 text-xs sm:text-sm text-[#334155] font-medium">
                  Sematkan logo lembaga & rekam jejak infografis langsung ke lampiran proposal.
                </p>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center justify-between rounded-md border border-slate-300 p-3 hover:bg-slate-50 cursor-pointer text-xs sm:text-sm font-bold text-[#0F172A]">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded bg-[#1B4332] text-white font-extrabold text-xs">
                        NGO
                      </span>
                      <div>
                        <span className="block font-bold">Logo Lembaga ("The Guardian of The Earth")</span>
                        <span className="text-xs text-[#334155] font-medium">
                          Header & Footer Dokumen Otomatis
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableCustomBranding}
                      onChange={(e) => setEnableCustomBranding(e.target.checked)}
                      className="size-4 accent-[#1B4332]"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-md border border-slate-300 p-3 hover:bg-slate-50 cursor-pointer text-xs sm:text-sm font-bold text-[#0F172A]">
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className="size-5 text-[#2D6A4F]" />
                      <div>
                        <span className="block font-bold">Portofolio Instagram & Kampanye Visual</span>
                        <span className="text-xs text-[#334155] font-medium">
                          Disematkan ke Halaman Lampiran
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enablePortfolioAttachment}
                      onChange={(e) => setEnablePortfolioAttachment(e.target.checked)}
                      className="size-4 accent-[#1B4332]"
                    />
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Action Card: Magic Link Delivery */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border-2 border-[#1B4332]/40 bg-[#1B4332]/5 p-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#1B4332] text-white shadow-sm">
              <Send className="size-4.5 text-[#52B788]" />
            </div>
            <div>
              <h4 className="font-display text-sm sm:text-base font-extrabold text-[#0F172A]">
                Modul Magic Link & Interactive Client Portal
              </h4>
              <p className="text-xs sm:text-sm text-[#334155] font-medium">
                Kirim proposal dalam bentuk tautan web interaktif aman dengan pelacak rekam baca.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowMagicLinkModal(true)}
            size="sm"
            className="w-full sm:w-auto font-extrabold gap-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white px-5 py-2.5 text-xs sm:text-sm"
          >
            <Eye className="size-4" /> Preview Magic Link Client Portal
          </Button>
        </div>
      </div>

      {/* Modal Dialog Interactive Magic Link Portal */}
      <Dialog open={showMagicLinkModal} onOpenChange={setShowMagicLinkModal}>
        <DialogContent className="max-w-2xl sm:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#1B4332]">
              <Sparkles className="size-4 text-[#2D6A4F]" /> Interactive Magic Link Portal
            </div>
            <DialogTitle className="font-display text-xl sm:text-2xl font-black text-[#0F172A]">
              [Preview Client Portal] Proposal Hibah {preset?.title ?? ""}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-[#334155] font-medium">
              Tampilan interaktif yang diterima oleh pihak donor/kementerian melalui Magic Link
              aman.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 rounded-lg border border-slate-300 bg-white p-5 text-xs sm:text-sm">
            {/* Header Document Preview */}
            <div className="flex items-center justify-between border-b border-slate-300 pb-3">
              <div className="flex items-center gap-2">
                {enableCustomBranding && (
                  <Badge className="bg-[#1B4332] text-white font-extrabold text-xs px-2.5 py-0.5">
                    THE GUARDIAN OF THE EARTH
                  </Badge>
                )}
                <span className="font-mono text-[#334155] text-xs font-bold">
                  Ref: EXP-2026-KALSAL-09
                </span>
              </div>
              <Badge
                variant="outline"
                className="gap-1 border-emerald-400 bg-emerald-50 text-[#1B4332] text-xs font-extrabold"
              >
                <CheckCircle2 className="size-3.5 text-[#2D6A4F]" /> Status: Terriset & Validasi SBM
              </Badge>
            </div>

            <div className="space-y-2">
              <h5 className="font-extrabold text-[#0F172A] text-sm sm:text-base">Ringkasan Eksekutif Program</h5>
              <p className="text-[#334155] leading-relaxed font-medium">{preset?.description ?? ""}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded bg-slate-50 p-3 border border-slate-300">
                <span className="font-bold text-[#0F172A]">Wilayah Operasional:</span>
                <p className="text-[#334155] font-medium mt-0.5">{region?.label ?? ""}</p>
              </div>
              <div className="rounded bg-slate-50 p-3 border border-slate-300">
                <span className="font-bold text-[#0F172A]">
                  Total Pengajuan Anggaran (RAB):
                </span>
                <p className="font-mono text-base font-extrabold text-[#1B4332] mt-0.5">
                  {formatRupiah(totalRab)}
                </p>
              </div>
            </div>

            {/* Optional Modules Attached Indicator */}
            <div className="flex flex-wrap gap-2 pt-1">
              {enableRiskManagement && (
                <Badge variant="secondary" className="text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                  + Lampiran Manajemen Risiko & Mitigasi
                </Badge>
              )}
              {enableTeamStructure && (
                <Badge variant="secondary" className="text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                  + Lampiran Struktur Tim Pengelola
                </Badge>
              )}
              {enablePortfolioAttachment && (
                <Badge variant="secondary" className="text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                  + Lampiran Portofolio Visual Instagram
                </Badge>
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
              className="font-bold text-slate-800 border-slate-300"
            >
              Tutup Preview
            </Button>
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-1.5 text-xs sm:text-sm font-extrabold bg-[#1B4332] text-white hover:bg-[#2D6A4F]">
                <Download className="size-4" /> Unduh Dokumen (PDF/DOCX)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
