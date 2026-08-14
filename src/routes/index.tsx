import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SbmSimulator } from "@/components/SbmSimulator";
import {
  ArrowRight,
  Leaf,
  Sparkles,
  ShieldCheck,
  Cpu,
  Database,
  FileText,
  CheckCircle2,
  Calculator,
  Search,
  AlignLeft,
  FileSpreadsheet,
  Download,
  Bot,
  Zap,
  Check,
  ChevronDown,
  Play,
  Globe,
  X,
  FileCheck2,
  Building,
  GraduationCap,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoGrant AI — Proposal Hibah Lingkungan & Costing SBM Berbasis AI" },
      {
        name: "description",
        content:
          "Generator proposal hibah lingkungan, Kerangka Kerja Logis (LFA), dan Rencana Anggaran Biaya (RAB) patuh SBM regional secara otomatis dengan AI.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, isAdmin } = useAuth();
  const [activeHeroTab, setActiveHeroTab] = useState<"proposal" | "sbm" | "lfa" | "export" | "chat">("proposal");
  const [activeRoleTab, setActiveRoleTab] = useState<"ngo" | "academic" | "csr" | "asn">("ngo");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const appHref = user ? (isAdmin ? "/admin" : "/dashboard") : "/auth";
  const appLabel = user ? "Buka Ruang Kerja" : "Coba Gratis Sekarang";

  return (
    <div className="min-h-screen bg-[#F8FBF8] text-[#1E293B] font-sans selection:bg-[#52B788]/20 selection:text-[#1B4332]">
      {/* Announcement Bar */}
      <div className="bg-[#1B4332] text-white text-xs sm:text-sm py-2.5 px-4 text-center font-semibold flex items-center justify-center gap-2 border-b border-[#2D6A4F]">
        <span className="bg-[#52B788] text-[#0F172A] text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Baru v1.0
        </span>
        <span>
          Terintegrasi Database Standar Biaya Masukan (SBM) Regional Kemenhut & BPDLH 2026
        </span>
        <ArrowRight className="w-4 h-4 text-[#52B788] hidden sm:inline" />
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-[#F8FBF8]/95 backdrop-blur-md border-b border-slate-300">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#1B4332] flex items-center justify-center text-[#52B788] shadow-sm group-hover:scale-105 transition-transform">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl text-[#1B4332] tracking-tight leading-none">
                EcoGrant<span className="text-[#52B788]">.ai</span>
              </span>
              <span className="text-xs font-bold text-[#334155] uppercase tracking-widest mt-0.5">
                Grant & Costing Engine
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-bold text-[#334155]">
            <a href="#solusi" className="hover:text-[#1B4332] transition-colors">
              Keunggulan
            </a>
            <a href="#fitur" className="hover:text-[#1B4332] transition-colors">
              Modul Fitur
            </a>
            <a href="#cara-kerja" className="hover:text-[#1B4332] transition-colors">
              Cara Kerja
            </a>
            <a href="#target" className="hover:text-[#1B4332] transition-colors">
              Solusi Peran
            </a>
            <a href="#simulator" className="hover:text-[#1B4332] transition-colors">
              Live Simulator
            </a>
            <a href="#faq" className="hover:text-[#1B4332] transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="text-sm font-bold text-[#0F172A] hover:text-[#1B4332] px-3.5 py-2 transition-colors"
            >
              Masuk
            </Link>
            <Link
              to={appHref}
              className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all hover:shadow-lg flex items-center gap-2"
            >
              <span>{appLabel}</span>
              <ArrowRight className="w-4 h-4 text-[#52B788]" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-tr from-[#52B788]/20 via-[#95D5B2]/15 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-[#1B4332]/10 border border-[#1B4332]/25 px-4 py-2 rounded-full text-xs sm:text-sm font-bold text-[#1B4332] shadow-xs">
            <Sparkles className="w-4 h-4 text-[#2D6A4F]" />
            <span>Platform Proposal & Budgeting Kehutanan Berbasis AI #1</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] tracking-tight leading-[1.15]">
            Tulis Proposal Hibah Lingkungan Berstandar Donor dalam{" "}
            <span className="bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C] bg-clip-text text-transparent">
              Hitungan Menit, Bukan Hari.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-[#334155] max-w-2xl mx-auto leading-relaxed font-medium">
            Hasilkan narasi proposal hibah lingkungan lengkap, Kerangka Kerja Logis (LFA), Scope of Work (SoW), dan Rencana Anggaran Biaya (RAB) patuh SBM pemerintah secara otomatis menggunakan AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to={appHref}
              className="w-full sm:w-auto bg-[#1B4332] hover:bg-[#2D6A4F] text-white px-8 py-4 rounded-xl text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              <span>{appLabel}</span>
              <ArrowRight className="w-4 h-4 text-[#52B788] group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#simulator"
              className="w-full sm:w-auto bg-white border border-slate-400 text-[#0F172A] hover:bg-slate-100 px-7 py-4 rounded-xl text-base font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 text-[#1B4332] fill-[#1B4332]" />
              <span>Coba Demo Interaktif</span>
            </a>
          </div>

          {/* Micro trust indicators */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-bold text-[#334155]">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" /> Tanpa Kartu Kredit
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" /> Terintegrasi SBM Regional 2026
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" /> Ekspor Word, Excel & PDF
            </span>
          </div>
        </div>

        {/* HERO INTERACTIVE UI MOCKUP */}
        <div className="mt-14 max-w-5xl mx-auto bg-white rounded-2xl border border-slate-300 shadow-2xl overflow-hidden">
          {/* Window Header */}
          <div className="bg-[#0F172A] px-4 py-3 flex items-center justify-between text-white border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-xs sm:text-sm font-mono text-slate-300 ml-2 hidden sm:inline">
                ecogrant-studio.ai/workspace/proposal-agroforestri-dukuh
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-200">
              <span className="bg-[#52B788] text-[#0F172A] px-2.5 py-0.5 rounded text-xs font-black">
                PROPOSAL READY
              </span>
              <span className="hidden sm:inline">Balai BPHL XI Banjarbaru</span>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="bg-slate-100 border-b border-slate-300 px-4 flex overflow-x-auto scrollbar-none gap-1">
            {[
              { id: "proposal", label: "Generator Proposal", icon: FileText },
              { id: "sbm", label: "Budgeting SBM", icon: Calculator },
              { id: "lfa", label: "Matriks LFA", icon: AlignLeft },
              { id: "export", label: "Ekspor Hub", icon: Download },
              { id: "chat", label: "AI Assistant", icon: Bot },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeHeroTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveHeroTab(tab.id as any)}
                  className={`px-4 py-3.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? "border-[#1B4332] text-[#1B4332] bg-white shadow-xs"
                      : "border-transparent text-[#475569] hover:text-[#0F172A]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#2D6A4F]" : ""}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mockup Tab Content */}
          <div className="p-6 md:p-8 bg-[#F8FBF8] min-h-[360px]">
            {activeHeroTab === "proposal" && (
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-300 pb-3">
                  <div>
                    <h3 className="font-extrabold text-[#0F172A] text-base md:text-lg">
                      Proposal Restorasi Agroforestri Tradisional Sistem Dukuh
                    </h3>
                    <p className="text-xs sm:text-sm text-[#334155] font-medium">
                      Kategori: Konservasi Hutan & Pemberdayaan Komunitas Lokal
                    </p>
                  </div>
                  <span className="bg-emerald-100 border border-emerald-300 text-[#1B4332] text-xs sm:text-sm font-extrabold px-3 py-1 rounded-md">
                    Skor Kepatuhan SBM: 98%
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-3 bg-white p-5 rounded-xl border border-slate-300 text-xs sm:text-sm text-[#0F172A]">
                    <div className="font-extrabold text-[#1B4332] flex items-center gap-2 text-sm sm:text-base">
                      <Sparkles className="w-4 h-4 text-[#2D6A4F]" /> Latar Belakang & Justifikasi Intervensi
                    </div>
                    <p className="leading-relaxed text-[#334155] font-medium">
                      Kawasan lanskap Kalsel memiliki potensi agroforestri Sistem Dukuh sebesar 450 Ha yang rentan alih fungsi lahan. Intervensi berbasis partisipasi masyarakat akan merehabilitasi tutupan pohon produktif (Durian, Kueni, Duku) sekaligus menjaga struktur penyerapan air tanah regional.
                    </p>
                    <div className="bg-[#52B788]/15 border-l-4 border-[#1B4332] p-3 text-xs sm:text-sm text-[#1B4332] font-semibold rounded-r-md">
                      <strong>Rekomendasi AI Donor:</strong> Sangat disukai oleh BPDLH & Kehati karena mengintegrasikan kearifan lokal dengan mitigasi perubahan iklim berbasis masyarakat.
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white p-5 rounded-xl border border-slate-300 space-y-2.5">
                      <span className="text-xs font-extrabold uppercase text-[#334155]">Ringkasan Eksekutif</span>
                      <div className="text-xs sm:text-sm space-y-2">
                        <div className="flex justify-between text-[#1E293B]">
                          <span>Target Anggaran:</span>
                          <span className="font-mono font-bold text-[#0F172A]">Rp 245.500.000</span>
                        </div>
                        <div className="flex justify-between text-[#1E293B]">
                          <span>Durasi Proyek:</span>
                          <span className="font-bold text-[#0F172A]">12 Bulan</span>
                        </div>
                        <div className="flex justify-between text-[#1E293B]">
                          <span>Penerima Manfaat:</span>
                          <span className="font-bold text-[#0F172A]">150 KK Petani</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#1B4332] text-white p-4 rounded-xl text-xs sm:text-sm space-y-1">
                      <div className="font-bold text-[#52B788] flex items-center gap-1.5 text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Siap Diekspor
                      </div>
                      <p className="text-xs text-slate-100 font-medium">Format Word (.docx), Excel (.xlsx), dan PDF terstruktur.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeHeroTab === "sbm" && (
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-[#0F172A] text-sm sm:text-base flex items-center gap-2">
                    <Calculator className="w-4.5 h-4.5 text-[#1B4332]" /> Validation Costing Engine: Standar Biaya Masukan Regional
                  </h4>
                  <span className="bg-slate-200 text-slate-900 text-xs font-bold px-2.5 py-1 rounded">
                    Wilayah: Kalimantan Selatan 2026
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-slate-300 overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm text-left">
                    <thead className="bg-slate-100 text-[#0F172A] border-b border-slate-300">
                      <tr>
                        <th className="p-3.5 font-bold">Uraian Komponen Kegiatan</th>
                        <th className="p-3.5 font-bold">Volume</th>
                        <th className="p-3.5 font-bold">Satuan</th>
                        <th className="p-3.5 font-bold">Harga Satuan (SBM)</th>
                        <th className="p-3.5 font-bold text-right">Total Anggaran</th>
                        <th className="p-3.5 font-bold text-center">Status SBM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-xs sm:text-sm text-[#0F172A]">
                      <tr>
                        <td className="p-3.5 font-sans font-bold text-[#0F172A]">Honorarium Narasumber Ahli Kehutanan</td>
                        <td className="p-3.5 font-bold">8</td>
                        <td className="p-3.5 font-sans font-medium">OJ</td>
                        <td className="p-3.5">Rp 900.000</td>
                        <td className="p-3.5 text-right font-extrabold text-[#1B4332]">Rp 7.200.000</td>
                        <td className="p-3.5 text-center">
                          <span className="bg-emerald-100 text-[#1B4332] border border-emerald-300 px-2.5 py-1 rounded font-sans text-xs font-extrabold">Compliant</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-sans font-bold text-[#0F172A]">Uang Harian Peserta Pelatihan Desa</td>
                        <td className="p-3.5 font-bold">90</td>
                        <td className="p-3.5 font-sans font-medium">OH</td>
                        <td className="p-3.5">Rp 150.000</td>
                        <td className="p-3.5 text-right font-extrabold text-[#1B4332]">Rp 13.500.000</td>
                        <td className="p-3.5 text-center">
                          <span className="bg-emerald-100 text-[#1B4332] border border-emerald-300 px-2.5 py-1 rounded font-sans text-xs font-extrabold">Compliant</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-sans font-bold text-[#0F172A]">Sewa Kendaraan Roda 4 Lapangan (Kalsel)</td>
                        <td className="p-3.5 font-bold">12</td>
                        <td className="p-3.5 font-sans font-medium">Hari</td>
                        <td className="p-3.5">Rp 850.000</td>
                        <td className="p-3.5 text-right font-extrabold text-[#1B4332]">Rp 10.200.000</td>
                        <td className="p-3.5 text-center">
                          <span className="bg-emerald-100 text-[#1B4332] border border-emerald-300 px-2.5 py-1 rounded font-sans text-xs font-extrabold">Compliant</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeHeroTab === "lfa" && (
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-[#0F172A] text-sm sm:text-base flex items-center gap-2">
                    <AlignLeft className="w-4.5 h-4.5 text-[#1B4332]" /> Matriks Kerangka Kerja Logis (Logical Framework Matrix)
                  </h4>
                  <span className="text-xs sm:text-sm font-semibold text-[#334155]">Otomatis Terhubung dengan Indikator KPI</span>
                </div>

                <div className="grid md:grid-cols-4 gap-3 text-xs sm:text-sm">
                  <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-1.5 shadow-xs">
                    <span className="bg-emerald-100 text-[#1B4332] border border-emerald-300 text-xs font-extrabold px-2.5 py-0.5 rounded">GOAL</span>
                    <h5 className="font-extrabold text-[#0F172A] text-sm pt-1">Restorasi Ekosistem</h5>
                    <p className="text-xs sm:text-sm text-[#334155] leading-relaxed font-medium">Meningkatkan tutupan vegetasi hutan agroforestri sebesar 25% dalam 3 tahun.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-1.5 shadow-xs">
                    <span className="bg-blue-100 text-blue-900 border border-blue-300 text-xs font-extrabold px-2.5 py-0.5 rounded">OUTCOME</span>
                    <h5 className="font-extrabold text-[#0F172A] text-sm pt-1">Kapasitas Komunitas</h5>
                    <p className="text-xs sm:text-sm text-[#334155] leading-relaxed font-medium">150 Petani menguasai teknik pembibitan dan pemangkasan tanaman dukuh.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-1.5 shadow-xs">
                    <span className="bg-purple-100 text-purple-900 border border-purple-300 text-xs font-extrabold px-2.5 py-0.5 rounded">OUTPUT</span>
                    <h5 className="font-extrabold text-[#0F172A] text-sm pt-1">Demplot & Bibit</h5>
                    <p className="text-xs sm:text-sm text-[#334155] leading-relaxed font-medium">Tersedia 10.000 bibit unggul terlindungi dan 3 unit kebun percontohan.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-1.5 shadow-xs">
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold px-2.5 py-0.5 rounded">ACTIVITIES</span>
                    <h5 className="font-extrabold text-[#0F172A] text-sm pt-1">Pelatihan & Pendampingan</h5>
                    <p className="text-xs sm:text-sm text-[#334155] leading-relaxed font-medium">5 Sesi workshop lapangan dan monitoring rutin berkala.</p>
                  </div>
                </div>
              </div>
            )}

            {activeHeroTab === "export" && (
              <div className="space-y-4 text-left">
                <h4 className="font-extrabold text-[#0F172A] text-sm sm:text-base flex items-center gap-2">
                  <Download className="w-4.5 h-4.5 text-[#1B4332]" /> Ekspor Sekali Klik & Portal Distribusi Donor
                </h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-300 space-y-3 text-center hover:border-[#1B4332] transition-colors shadow-xs">
                    <FileText className="w-9 h-9 text-blue-600 mx-auto" />
                    <div>
                      <h5 className="font-extrabold text-sm text-[#0F172A]">Microsoft Word (.docx)</h5>
                      <p className="text-xs text-[#334155] mt-1 font-medium">Format dokumen narasi proposal formal rapi.</p>
                    </div>
                    <span className="inline-block bg-slate-100 text-slate-800 text-xs font-extrabold px-3 py-1 rounded-full border border-slate-300">Siap Unduh</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-300 space-y-3 text-center hover:border-[#1B4332] transition-colors shadow-xs">
                    <FileSpreadsheet className="w-9 h-9 text-emerald-600 mx-auto" />
                    <div>
                      <h5 className="font-extrabold text-sm text-[#0F172A]">Microsoft Excel (.xlsx)</h5>
                      <p className="text-xs text-[#334155] mt-1 font-medium">Tabel RAB lengkap dengan formula otomatis SBM.</p>
                    </div>
                    <span className="inline-block bg-slate-100 text-slate-800 text-xs font-extrabold px-3 py-1 rounded-full border border-slate-300">Siap Unduh</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-300 space-y-3 text-center hover:border-[#1B4332] transition-colors shadow-xs">
                    <Globe className="w-9 h-9 text-[#1B4332] mx-auto" />
                    <div>
                      <h5 className="font-extrabold text-sm text-[#0F172A]">Magic Link Client Portal</h5>
                      <p className="text-xs text-[#334155] mt-1 font-medium">Tautan web interaktif yang aman untuk review donor.</p>
                    </div>
                    <span className="inline-block bg-[#52B788]/25 text-[#1B4332] text-xs font-extrabold px-3 py-1 rounded-full border border-[#52B788]/40">Analitik Aktif</span>
                  </div>
                </div>
              </div>
            )}

            {activeHeroTab === "chat" && (
              <div className="space-y-3.5 text-left">
                <div className="flex items-center gap-2 border-b border-slate-300 pb-2.5">
                  <Bot className="w-5 h-5 text-[#1B4332]" />
                  <span className="font-extrabold text-sm sm:text-base text-[#0F172A]">Asisten Konsultan AI EcoGrant</span>
                </div>
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="bg-white p-4 rounded-xl border border-slate-300 max-w-xl text-[#0F172A] shadow-xs">
                    <strong className="block text-[#1B4332] text-xs sm:text-sm font-extrabold mb-1">Pengguna:</strong>
                    "Bagaimana cara menyesuaikan anggaran pelatihan petani agar sesuai SBM Kalimantan Selatan 2026?"
                  </div>
                  <div className="bg-[#1B4332] text-white p-4 rounded-xl max-w-xl text-xs sm:text-sm space-y-1 shadow-md">
                    <strong className="block text-[#52B788] text-xs sm:text-sm font-extrabold">EcoGrant AI Assistant:</strong>
                    "Saya telah menyesuaikan indeks Uang Harian Peserta di Kalsel menjadi Rp 150.000/OH dan Honor Narasumber menjadi Rp 900.000/OJ. Seluruh formula di sheet RAB telah diperbarui otomatis."
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TRUST BADGES ROW */}
      <section className="py-8 bg-white border-y border-slate-300">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-around gap-6 text-xs sm:text-sm font-extrabold text-[#0F172A]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#1B4332]" />
            <span>Government Ready (SBM Kemenhut)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#2D6A4F]" />
            <span>AI Narrative Engine Presisi</span>
          </div>
          <div className="flex items-center gap-2.5">
            <AlignLeft className="w-5 h-5 text-[#1B4332]" />
            <span>Automated LFA Matrix Builder</span>
          </div>
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#2D6A4F]" />
            <span>Ekspor Instan Word, Excel & PDF</span>
          </div>
        </div>
      </section>

      {/* LOGOS / TRUSTED BY SECTION */}
      <section className="py-16 px-6 max-w-7xl mx-auto text-center space-y-6">
        <p className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#334155]">
          Dipercaya oleh NGO Lingkungan, Akademisi & Pengelola Program Konservasi
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-90 grayscale hover:grayscale-0 transition-all">
          <span className="font-black text-lg sm:text-xl text-[#1E293B] tracking-tight">Kementerian LHK</span>
          <span className="font-extrabold text-lg sm:text-xl text-[#1E293B] tracking-tight">Balai BPHL XI</span>
          <span className="font-extrabold text-lg sm:text-xl text-[#1E293B] tracking-tight">Yayasan KEHATI</span>
          <span className="font-extrabold text-lg sm:text-xl text-[#1E293B] tracking-tight">IPB Forestry</span>
          <span className="font-extrabold text-lg sm:text-xl text-[#1E293B] tracking-tight">BPDLH Indonesia</span>
          <span className="font-extrabold text-lg sm:text-xl text-[#1E293B] tracking-tight">Konsortium Agroforestri</span>
        </div>
      </section>

      {/* PROBLEM SECTION (PERBANDINGAN KARTU TRADISIONAL VS ECOGRANT) */}
      <section id="solusi" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-300">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight">
            Menyusun Proposal Hibah Tidak Harus Menyita Waktu Berhari-hari
          </h2>
          <p className="text-base sm:text-lg text-[#334155] leading-relaxed font-medium">
            Proses administrasi yang rumit seringkali menghambat ide konservasi luar biasa di lapangan. Bandingkan metode konvensional dengan keunggulan EcoGrant AI.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Traditional Card */}
          <div className="bg-white p-8 rounded-2xl border border-rose-300 shadow-sm space-y-6 relative overflow-hidden">
            <div className="w-2.5 h-full bg-rose-500 absolute top-0 left-0" />
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-rose-700 bg-rose-100 px-3.5 py-1 rounded-full border border-rose-200">
                Metode Konvensional
              </span>
              <X className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">Proses Manual yang Melelahkan</h3>
            <ul className="space-y-4 text-xs sm:text-sm text-[#334155]">
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-extrabold mt-0.5">
                  <X className="w-4 h-4 text-rose-600" />
                </div>
                <span><strong className="text-[#0F172A] font-extrabold">Penulisan Manual:</strong> Membutuhkan waktu 7-14 hari hanya untuk merangkum narasi teknis dan latar belakang masalah.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-extrabold mt-0.5">
                  <X className="w-4 h-4 text-rose-600" />
                </div>
                <span><strong className="text-[#0F172A] font-extrabold">Perhitungan SBM Rumit:</strong> Risiko tinggi penolakan akibat kesalahan standar indeks harga uang harian & honorarium daerah.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-extrabold mt-0.5">
                  <X className="w-4 h-4 text-rose-600" />
                </div>
                <span><strong className="text-[#0F172A] font-extrabold">Matriks LFA Kaku:</strong> Sulit menyelaraskan indikator KPI, Goal, dan Outcome secara logis berjenjang.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-extrabold mt-0.5">
                  <X className="w-4 h-4 text-rose-600" />
                </div>
                <span><strong className="text-[#0F172A] font-extrabold">Revisi Berulang:</strong> Format dokumen seringkali berantakan saat dikonversi antar software.</span>
              </li>
            </ul>
          </div>

          {/* EcoGrant AI Card */}
          <div className="bg-[#1B4332] text-white p-8 rounded-2xl shadow-xl space-y-6 relative overflow-hidden border border-[#2D6A4F]">
            <div className="w-2.5 h-full bg-[#52B788] absolute top-0 left-0" />
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#0F172A] bg-[#52B788] px-3.5 py-1 rounded-full">
                Solusi EcoGrant AI
              </span>
              <CheckCircle2 className="w-6 h-6 text-[#52B788]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">Alur Kerja Cerdas & Terintegrasi</h3>
            <ul className="space-y-4 text-xs sm:text-sm text-slate-100 font-medium">
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-[#52B788]/25 text-[#52B788] flex items-center justify-center shrink-0 font-bold mt-0.5">
                  <Check className="w-4 h-4 text-[#52B788]" />
                </div>
                <span><strong className="text-emerald-200 font-bold">Proposal AI Dalam &lt; 15 Menit:</strong> AI menyusun narasi komprehensif berstandar internasional berdasarkan brief singkat Anda.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-[#52B788]/25 text-[#52B788] flex items-center justify-center shrink-0 font-bold mt-0.5">
                  <Check className="w-4 h-4 text-[#52B788]" />
                </div>
                <span><strong className="text-emerald-200 font-bold">Costing SBM Otomatis 100%:</strong> Terhubung ke database resmi SBM regional untuk menjamin 100% kepatuhan anggaran.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-[#52B788]/25 text-[#52B788] flex items-center justify-center shrink-0 font-bold mt-0.5">
                  <Check className="w-4 h-4 text-[#52B788]" />
                </div>
                <span><strong className="text-emerald-200 font-bold">Smart LFA Hierarchy:</strong> Matriks Kerangka Kerja Logis tersusun instan dengan KPI terukur.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5.5 h-5.5 rounded-full bg-[#52B788]/25 text-[#52B788] flex items-center justify-center shrink-0 font-bold mt-0.5">
                  <Check className="w-4 h-4 text-[#52B788]" />
                </div>
                <span><strong className="text-emerald-200 font-bold">Ekspor Siap Kirim 1-Klik:</strong> Dapatkan file Word, Excel RAB berformula, PDF, dan tautan portal web interaktif.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (CARA KERJA - 4 LANGKAH HORIZONTAL CENTERED) */}
      <section id="cara-kerja" className="py-20 px-6 max-w-7xl mx-auto bg-white rounded-3xl border border-slate-300 my-10 shadow-xs">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="bg-[#1B4332]/10 text-[#1B4332] text-xs sm:text-sm font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider border border-[#1B4332]/20">
            Alur Kerja Sederhana
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight">
            4 Langkah Dari Ide Lapangan ke Proposal Siap Kirim
          </h2>
          <p className="text-base sm:text-lg text-[#334155] font-medium">
            Proses intuitif tanpa hambatan teknis yang memandu Anda langkah demi langkah.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              step: "01",
              title: "Deskripsikan Proyek",
              desc: "Masukkan brief singkat mengenai lokasi, sasaran, dan kegiatan utama melalui intake chatbot.",
              icon: Bot,
            },
            {
              step: "02",
              title: "Generasi AI & LFA",
              desc: "Sistem menyusun Latar Belakang, Metodologi, Matriks LFA, dan Indikator Keberhasilan secara presisi.",
              icon: Sparkles,
            },
            {
              step: "03",
              title: "Kustomisasi Costing SBM",
              desc: "Pilih wilayah SBM regional (seperti Kalsel). AI mencocokkan RAB otomatis sesuai standar harga baku.",
              icon: Calculator,
            },
            {
              step: "04",
              title: "Ekspor & Distribusi",
              desc: "Unduh dokumen Word, Excel RAB, PDF, atau bagikan Magic Link Client Portal yang aman.",
              icon: Download,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="flex flex-col items-center text-center space-y-4 relative group p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200">
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-3xl sm:text-4xl font-black text-[#2D6A4F]">
                    {item.step}
                  </span>
                  <div className="w-11 h-11 rounded-xl bg-[#F8FBF8] border border-slate-300 flex items-center justify-center text-[#1B4332] group-hover:bg-[#1B4332] group-hover:text-white transition-colors shadow-xs">
                    <Icon className="w-5.5 h-5.5" />
                  </div>
                </div>
                <h3 className="font-extrabold text-lg text-[#0F172A]">{item.title}</h3>
                <p className="text-xs sm:text-sm text-[#334155] leading-relaxed font-medium max-w-xs">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CORE FEATURE DEEP-DIVE (4 MODUL PRD - CIRCLE SILHOUETTE COLOR MATCHED) */}
      <section id="fitur" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight">
            Empat Modul Spesialis Penyusun Proposal Hibah
          </h2>
          <p className="text-base sm:text-lg text-[#334155] font-medium">
            Setiap fitur dirancang khusus memenuhi standar donor internasional dan kementerian di Indonesia.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Modul A */}
          <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-sm space-y-4 hover:border-[#1B4332] transition-colors">
            <div className="w-11 h-11 rounded-full bg-[#1B4332] text-white flex items-center justify-center font-black text-base shadow-sm">
              A
            </div>
            <h3 className="text-xl font-extrabold text-[#1B4332]">Modul A — AI Narrative & Scientific Justification Generator</h3>
            <p className="text-sm text-[#334155] leading-relaxed font-medium">
              Model LLM dilatih fasih istilah birokrasi dan akademis sektor kehutanan & lingkungan. Otomatis merumuskan urgensi latar belakang, justifikasi metodologi, dan penanganan risiko secara rasional.
            </p>
          </div>

          {/* Modul B */}
          <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-sm space-y-4 hover:border-[#2D6A4F] transition-colors">
            <div className="w-11 h-11 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center font-black text-base shadow-sm">
              B
            </div>
            <h3 className="text-xl font-extrabold text-[#2D6A4F]">Modul B — Automatic SBM/SBU Regional Costing Engine</h3>
            <p className="text-sm text-[#334155] leading-relaxed font-medium">
              Pusat database harga resmi pemerintah. Cukup pilih lokasi kegiatan (misal Kalsel / DKI / Papua), sistem langsung mengunci honorarium, sewa, dan uang harian sesuai regulasi yang berlaku.
            </p>
          </div>

          {/* Modul C */}
          <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-sm space-y-4 hover:border-[#0284C7] transition-colors">
            <div className="w-11 h-11 rounded-full bg-[#0284C7] text-white flex items-center justify-center font-black text-base shadow-sm">
              C
            </div>
            <h3 className="text-xl font-extrabold text-[#0284C7]">Modul C — Logical Framework Matrix (LFA) & KPI Builder</h3>
            <p className="text-sm text-[#334155] leading-relaxed font-medium">
              Memastikan struktur proposal konsisten secara sistematis dari Tujuan Utama (Goal), Hasil (Outcome), Keluaran (Output), hingga Rincian Aktivitas dan Asumsi Risiko.
            </p>
          </div>

          {/* Modul D */}
          <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-sm space-y-4 hover:border-[#7C3AED] transition-colors">
            <div className="w-11 h-11 rounded-full bg-[#7C3AED] text-white flex items-center justify-center font-black text-base shadow-sm">
              D
            </div>
            <h3 className="text-xl font-extrabold text-[#7C3AED]">Modul D — Multi-Format Export & Client Portal Workspace</h3>
            <p className="text-sm text-[#334155] leading-relaxed font-medium">
              Ekspor proposal ke Microsoft Word (.docx), Excel RAB (.xlsx), dan PDF terformat. Dilengkapi fitur Magic Link Client Portal interaktif untuk kemudahan peninjauan oleh pihak donor.
            </p>
          </div>
        </div>
      </section>

      {/* TARGET AUDIENCE / SOLUSI PERAN */}
      <section id="target" className="py-20 px-6 max-w-7xl mx-auto bg-[#F2F7F4] rounded-3xl border border-emerald-900/15 shadow-xs">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight">
            Dirancang untuk Siapa Saja di Sektor Hijau?
          </h2>
          <p className="text-base sm:text-lg text-[#334155] font-medium">
            Pilih peran Anda untuk melihat bagaimana EcoGrant AI mempercepat kerja Anda.
          </p>

          <div className="flex flex-wrap justify-center gap-2.5 pt-4">
            {[
              { id: "ngo", label: "NGO & Komunitas Lingkungan" },
              { id: "academic", label: "Mahasiswa & Peneliti Kehutanan" },
              { id: "csr", label: "Manajer CSR Swasta" },
              { id: "asn", label: "ASN Kemenhut & Pegawai di Daerah" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveRoleTab(tab.id as any)}
                className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all border ${
                  activeRoleTab === tab.id
                    ? "bg-[#1B4332] text-white border-[#1B4332] shadow-sm"
                    : "bg-white text-[#334155] border-slate-300 hover:text-[#0F172A] hover:border-slate-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-300 max-w-4xl mx-auto shadow-sm text-left">
          {activeRoleTab === "ngo" && (
            <div className="space-y-4">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1B4332]">NGO & Komunitas Konservasi Lokal</h3>
              <p className="text-sm sm:text-base text-[#334155] leading-relaxed font-medium">
                Fokuskan energi tim Anda pada aksi pemulihan di lapangan. Biarkan EcoGrant AI menangani penyusunan narasi formal, matriks LFA, dan penyesuaian RAB SBM untuk pengajuan ke donor internasional atau BPDLH.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm font-bold text-[#0F172A]">
                <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2D6A4F]" /> Hemat waktu penyusunan hingga 85%</span>
                <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2D6A4F]" /> Integrasi logo & branding organisasi</span>
              </div>
            </div>
          )}

          {activeRoleTab === "academic" && (
            <div className="space-y-4">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1B4332]">Mahasiswa & Peneliti Sains Kehutanan</h3>
              <p className="text-sm sm:text-base text-[#334155] leading-relaxed font-medium">
                Susun usulan penelitian hibah atau pengabdian masyarakat dengan bahasa ilmiah baku, referensi metodologi konservasi yang tepat, serta anggaran biaya penelitian yang realistis.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm font-bold text-[#0F172A]">
                <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2D6A4F]" /> Struktur proposal sesuai standar dikti & donor</span>
                <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2D6A4F]" /> Format RAB riset otomatis</span>
              </div>
            </div>
          )}

          {activeRoleTab === "csr" && (
            <div className="space-y-4">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1B4332]">Manajer CSR & Program Keberlanjutan</h3>
              <p className="text-sm sm:text-base text-[#334155] leading-relaxed font-medium">
                Evaluasi dan susun dokumen proposal program lingkungan perusahaan yang transparan, terukur secara ESG, dan dilengkapi estimasi biaya yang dapat dipertanggungjawabkan.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm font-bold text-[#0F172A]">
                <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2D6A4F]" /> Kerangka LFA terstandarisasi ESG</span>
                <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2D6A4F]" /> Laporan dan ringkasan eksekutif instan</span>
              </div>
            </div>
          )}

          {activeRoleTab === "asn" && (
            <div className="space-y-4">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1B4332]">ASN Kemenhut & Pegawai di Daerah</h3>
              <p className="text-sm sm:text-base text-[#334155] leading-relaxed font-medium">
                Buat Kerangka Acuan Kerja (KAK) dan draf RAB kegiatan pendampingan masyarakat dengan jaminan kepatuhan 100% pada Peraturan Menteri dan SBM daerah resmi.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm font-bold text-[#0F172A]">
                <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2D6A4F]" /> 100% Kepatuhan Peraturan Gubernur & Kemenhut</span>
                <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#2D6A4F]" /> Bahasa birokrasi formal baku</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LIVE SIMULATOR INTEGRATION */}
      <section id="simulator" className="py-20 px-6 max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="bg-[#52B788]/25 text-[#1B4332] text-xs sm:text-sm font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider border border-[#52B788]/40">
            Uji Coba Langsung (Tanpa Login)
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight">
            Simulator Proposal & Budgeting SBM Regional
          </h2>
          <p className="text-base sm:text-lg text-[#334155] font-medium">
            Coba masukkan brief proyek Anda di bawah ini dan lihat bagaimana costing engine memvalidasi anggaran secara langsung.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-300 shadow-xl">
          <SbmSimulator />
        </div>
      </section>

      {/* INTERACTIVE FAQ SECTION */}
      <section id="faq" className="py-20 px-6 max-w-5xl mx-auto border-t border-slate-300">
        <div className="text-center space-y-4 mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A]">Pertanyaan Sering Diajukan (FAQ)</h2>
          <p className="text-base sm:text-lg text-[#334155] font-medium">
            Temukan jawaban atas pertanyaan paling umum seputar penggunaan EcoGrant AI.
          </p>
        </div>

        <div className="space-y-4 text-left">
          {[
            {
              q: "Apakah EcoGrant AI menjamin kepatuhan terhadap Standar Biaya Masukan (SBM) pemerintah?",
              a: "Ya. Database kami diperbarui berkala sesuai Peraturan Menteri Keuangan & Peraturan Gubernur terkini (termasuk SBM Balai BPHL XI Kalsel & Nasional 2026). Perhitungan honorarium, sewa, dan uang harian otomatis mengunci angka batas maksimum resmi.",
            },
            {
              q: "Format dokumen apa saja yang bisa diekspor dari platform ini?",
              a: "Anda dapat mengunduh dokumen proposal lengkap dalam format Microsoft Word (.docx) yang mudah disunting, Microsoft Excel (.xlsx) dengan formula RAB aktif, PDF resmi, atau membagikannya lewat tautan Magic Link Client Portal yang aman.",
            },
            {
              q: "Apakah platform ini mendukung Bahasa Indonesia dan konteks lokal?",
              a: "Tentu saja! EcoGrant AI dirancang khusus dengan kosakata birokrasi, akademis, dan istilah teknis kehutanan di Indonesia (seperti Sistem Dukuh, LPHD, Perhutanan Sosial, Agroforestri, dan LFA).",
            },
            {
              q: "Bagaimana keamanan data dan hak cipta proposal organisasi kami?",
              a: "Seluruh data dan kerangka proyek Anda dienkripsi secara penuh. Kami tidak menggunakan data proposal rahasia pengguna untuk melatih model umum tanpa izin.",
            },
            {
              q: "Apakah ada opsi akun gratis untuk mahasiswa atau NGO lokal kecil?",
              a: "Ya. Anda dapat memulai secara gratis tanpa perlu memasukkan kartu kredit untuk mencoba pembuatan draf proposal dan simulasi anggaran awal.",
            },
          ].map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="bg-white rounded-xl border border-slate-300 overflow-hidden transition-colors shadow-xs"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-5 text-left font-extrabold text-base text-[#0F172A] flex items-center justify-between gap-4 hover:bg-slate-50"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#1B4332] shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-[#334155] leading-relaxed border-t border-slate-200 pt-3.5 font-medium bg-slate-50/50">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section className="py-24 px-6 bg-[#1B4332] text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#52B788]/20 via-transparent to-[#95D5B2]/10 pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Siap Mentransformasi Proposal Hibah Lingkungan Anda?
          </h2>
          <p className="text-base sm:text-xl text-slate-100 max-w-2xl mx-auto leading-relaxed font-medium">
            Bergabunglah dengan ratusan NGO, peneliti, dan komunitas konservasi yang telah menstandarisasi pengajuan hibah mereka dengan EcoGrant AI.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={appHref}
              className="w-full sm:w-auto bg-[#52B788] hover:bg-[#95D5B2] text-[#0F172A] px-9 py-4.5 rounded-xl font-black text-base shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <span>{appLabel}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <p className="text-xs sm:text-sm text-emerald-100 pt-2 font-bold">
            Tanpa perlu kartu kredit • Akses instan ke Generator Proposal & Costing Engine SBM
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0F172A] text-slate-300 text-xs sm:text-sm py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#52B788] flex items-center justify-center text-[#0F172A]">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg text-white">EcoGrant AI</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-sm leading-relaxed font-medium">
              Generator Proposal Hibah Lingkungan, Matriks LFA & Costing Engine SBM Regional Berbasis Kecerdasan Buatan Terdepan.
            </p>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-extrabold text-white uppercase text-xs tracking-wider">Produk</h4>
            <ul className="space-y-2 font-medium">
              <li><a href="#fitur" className="hover:text-white text-slate-300 transition-colors">Generator Proposal</a></li>
              <li><a href="#fitur" className="hover:text-white text-slate-300 transition-colors">Costing Engine SBM</a></li>
              <li><a href="#fitur" className="hover:text-white text-slate-300 transition-colors">Matriks LFA</a></li>
              <li><a href="#simulator" className="hover:text-white text-slate-300 transition-colors">Simulator Live</a></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-extrabold text-white uppercase text-xs tracking-wider">Solusi</h4>
            <ul className="space-y-2 font-medium">
              <li><a href="#target" className="hover:text-white text-slate-300 transition-colors">NGO & Komunitas</a></li>
              <li><a href="#target" className="hover:text-white text-slate-300 transition-colors">Mahasiswa & Peneliti</a></li>
              <li><a href="#target" className="hover:text-white text-slate-300 transition-colors">Manajer CSR</a></li>
              <li><a href="#target" className="hover:text-white text-slate-300 transition-colors">ASN & Pegawai di Daerah</a></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-extrabold text-white uppercase text-xs tracking-wider">Legal & Kontak</h4>
            <ul className="space-y-2 font-medium">
              <li><a href="#" className="hover:text-white text-slate-300 transition-colors">Syarat & Ketentuan</a></li>
              <li><a href="#" className="hover:text-white text-slate-300 transition-colors">Kebijakan Privasi</a></li>
              <li><a href="#" className="hover:text-white text-slate-300 transition-colors">Kontak Kami</a></li>
              <li><a href="#" className="hover:text-white text-slate-300 transition-colors">Peta Situs</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-400">
          <div>© 2026 EcoGrant AI. Solusi Cerdas untuk Konservasi & Sektor Lingkungan Indonesia.</div>
          <div className="flex items-center gap-4 text-slate-300 font-semibold">
            <span>Standar SBM Kemenhut & BPDLH Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
