import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Leaf,
  Menu,
  Sparkles,
  Grid2x2Check,
  Calculator,
  FileDown,
  Handshake,
  ShieldCheck,
  Clock,
  Users,
  X,
  Building2,
  Image as ImageIcon,
  CheckCircle2,
  Award,
  Layers,
  Zap,
  PenTool,
  Send,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SbmSimulator } from "@/components/SbmSimulator";

import heroImg from "@/assets/hero.jpg";
import problemImg from "@/assets/problem.jpg";
import whyImg from "@/assets/why.jpg";
import featuresImg from "@/assets/features.jpg";
import howImg from "@/assets/howitworks.jpg";
import benefitsImg from "@/assets/benefits.jpg";
import faqImg from "@/assets/faq.jpg";
import ctaImg from "@/assets/cta.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoGrant AI — Generator Proposal Hibah Kehutanan, Lingkungan & SBM Regional" },
      {
        name: "description",
        content:
          "Generator proposal berbasis AI (LLM) khusus sektor kehutanan, lingkungan, agroforestri & pemberdayaan masyarakat. Integrasi otomatis Rencana Anggaran Biaya (RAB) dengan Standar Biaya Masukan (SBM) regional.",
      },
      {
        property: "og:title",
        content: "EcoGrant AI — Generator Proposal Hibah Kehutanan & SBM Regional",
      },
      {
        property: "og:description",
        content:
          "Ubah ide lapangan jadi proposal formal dalam < 15 menit. Narasi AI, LFA, RAB SBM Kalimantan Selatan & daerah lainnya, Magic Link & E-Signature.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const NAV = [
  { href: "#masalah", label: "Masalah" },
  { href: "#demo-sbm", label: "Simulator Live" },
  { href: "#kenapa", label: "Keunggulan" },
  { href: "#fitur", label: "Fitur Modul" },
  { href: "#persona", label: "Target Pengguna" },
  { href: "#cara-kerja", label: "Cara Kerja" },
  { href: "#faq", label: "FAQ" },
];

function SectionLabel({ index, children }: { index: string; children: string }) {
  return (
    <div className="flex items-center gap-3 border-t-2 border-foreground pt-3">
      <span className="font-mono text-xs tracking-widest text-muted-foreground">{index}</span>
      <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
        {children}
      </span>
    </div>
  );
}

function Landing() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [activePersona, setActivePersona] = useState<"asn" | "freelancer" | "ngo">("freelancer");

  const appHref = user ? "/dashboard" : "/auth";
  const appLabel = user ? "Buka Ruang Kerja" : "Mulai Gratis SEKARANG";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Top Bar Announcement */}
      <div className="bg-primary text-primary-foreground text-center py-2 px-4 text-xs font-medium flex items-center justify-center gap-2">
        <Sparkles className="size-3.5 shrink-0" />
        <span>
          <strong>EcoGrant AI v1.0 MVP:</strong> Terintegrasi SBM Regional 2026 (Balai BPHL XI
          Banjarbaru, Kemenhut, BPDLH)
        </span>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Leaf className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight">EcoGrant AI</span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold -mt-1">
                Generator Proposal Hibah
              </span>
            </div>
          </a>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex" disabled={loading}>
              <Link to="/auth">Masuk</Link>
            </Button>
            <Button
              asChild
              className="rounded-none bg-primary text-primary-foreground font-semibold"
            >
              <Link to={appHref}>
                {appLabel} <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden p-1 text-foreground"
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {open ? (
          <nav className="border-t border-border bg-background px-5 py-4 lg:hidden">
            <ul className="space-y-3">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="block text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="top">
        {/* HERO SECTION */}
        <section className="border-b-2 border-foreground bg-gradient-to-b from-background via-muted/30 to-background">
          <div className="mx-auto grid max-w-7xl gap-0 px-5 lg:grid-cols-12">
            <div className="flex flex-col justify-center py-12 lg:col-span-7 lg:py-20 lg:pr-12">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-primary">
                <Sparkles className="size-3.5" /> Konsultan Virtual & Costing Engine SBM
              </div>
              <h1 className="font-display text-4xl leading-[1.02] font-extrabold sm:text-5xl lg:text-6xl">
                Ide Lapanganmu
                <br />
                Layak Dapat
                <br />
                <span className="text-gradient-eco">Pendanaan Hibah.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Spesialisasi penyusunan proposal hibah{" "}
                <strong>
                  Kehutanan, Lingkungan, Agroforestri (Sistem Dukuh), & Pemberdayaan Masyarakat
                </strong>
                . Ubah draf kasar menjadi proposal formal & RAB terikat{" "}
                <strong>Standar Biaya Masukan (SBM) Regional</strong> dalam kurang dari 15 menit.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-none px-7 font-bold bg-primary text-primary-foreground shadow-md"
                >
                  <Link to={appHref}>
                    {appLabel} <ArrowRight className="size-4 ml-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-none px-7 border-2 border-foreground font-semibold"
                >
                  <a href="#demo-sbm">
                    <Calculator className="size-4 mr-2 text-primary" /> Coba Live Simulator
                  </a>
                </Button>
              </div>

              {/* PRD Metrics Highlight Grid */}
              <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-px border-2 border-foreground bg-foreground">
                {[
                  ["< 10 Menit", "Time-to-Generate"],
                  ["> 75%", "Akurasi Costing SBM"],
                  ["100%", "SBM Regional Filter"],
                  ["Magic Link", "E-Signature Ready"],
                ].map(([v, k]) => (
                  <div key={k} className="bg-background px-4 py-4 text-center">
                    <dt className="font-display text-xl sm:text-2xl font-bold text-foreground">
                      {v}
                    </dt>
                    <dd className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {k}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative border-l-0 border-foreground lg:col-span-5 lg:border-l-2 flex items-center justify-center bg-muted/20">
              <img
                src={heroImg}
                alt="ASN Kemenhut dan freelancer menyusun proposal hibah kehutanan"
                width={1280}
                height={960}
                className="h-full w-full object-cover min-h-[380px]"
              />
              <div className="absolute bottom-4 left-4 right-4 rounded-lg border-2 border-foreground bg-background/95 p-3.5 backdrop-blur shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Terverifikasi Standar BPHL XI & Kemenhut
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Otomatis mencocokkan indeks harga regional Kalimantan Selatan & Nasional.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DEMO SIMULATOR INTERACTIVE SECTION */}
        <section
          id="demo-sbm"
          className="border-b-2 border-foreground bg-secondary/40 py-16 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-5">
            <SectionLabel index="01">Simulator Interaktif Live</SectionLabel>
            <div className="mt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold sm:text-4xl">
                  Uji Coba Simulator Proposal & SBM Regional
                </h2>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                  Coba langsung intake brief, pilih wilayah SBM (seperti Kalimantan Selatan), lihat
                  penyusunan Scope of Work & perhitungan tabel RAB otomatis.
                </p>
              </div>
              <Badge className="w-fit bg-primary text-primary-foreground gap-1.5 px-3 py-1.5 text-xs font-semibold">
                <Sparkles className="size-3.5" /> Interaktif (Tanpa Login)
              </Badge>
            </div>

            <div className="mt-8">
              <SbmSimulator />
            </div>
          </div>
        </section>

        {/* MASALAH UTAMA (PRD Section 3) */}
        <section id="masalah" className="border-b-2 border-foreground">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <SectionLabel index="02">Problem Statement</SectionLabel>
            <div className="mt-8 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <h2 className="font-display text-3xl leading-tight font-bold sm:text-4xl">
                  Idenylah yang Mengubah Lapangan. Nulis Proposalnya yang Bikin Nyerah.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Menyusun proposal untuk pendanaan hibah (seperti BPDLH, kementerian, atau donor
                  internasional) mengharuskan kesesuaian ketat dengan format RAB SBM daerah. Pekerja
                  lepas dan tim lapangan membuang waktu berhari-hari hanya untuk hal administratif.
                </p>
                <img
                  src={problemImg}
                  alt="Tumpukan dokumen proposal yang berantakan"
                  loading="lazy"
                  width={1200}
                  height={912}
                  className="mt-6 w-full border-2 border-foreground object-cover shadow-sm"
                />
              </div>

              <ul className="grid gap-px self-start border-2 border-foreground bg-foreground lg:col-span-7">
                {[
                  [
                    "Kepatuhan SBM Regional yang Ketat",
                    "Harus mencari indeks harga uang harian, honor narasumber, dan sewa kendaraan daerah satu per satu sesuai PMK & Pergub.",
                  ],
                  [
                    "Logical Framework Approach (LFA) Rumit",
                    "Merumuskan Goal, Outcome, Output, Indikator (KPI), dan Asumsi Risiko yang saling mengunci secara hirarkis.",
                  ],
                  [
                    "Penyesuaian Metodologi Sektor Spesifik",
                    "Kesulitan menjabarkan istilah teknis konservasi, seperti agroforestri tradisional (Sistem Dukuh), pemetaan GIS, dan pemberdayaan desa.",
                  ],
                  [
                    "Aset Rekam Jejak Tersebar",
                    "Infografis Instagram dan portofolio desainer kampanye visual tidak terorganisasi rapi saat melampirkan bukti kapasitas.",
                  ],
                  [
                    "Tautan Dokumen Mati & Revisi Berulang",
                    "Mengirimkan file PDF mati tanpa pelacak rekam baca donor, serta proses persetujuan dan tanda tangan yang lambat.",
                  ],
                ].map(([t, d]) => (
                  <li key={t} className="bg-background p-6">
                    <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                      <span className="size-2 rounded-full bg-destructive inline-block" /> {t}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* KENA APA ECOGRANT AI (PRD Value Proposition) */}
        <section id="kenapa" className="border-b-2 border-foreground bg-secondary/60">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <SectionLabel index="03">Value Proposition</SectionLabel>
            <div className="mt-8 grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <img
                  src={whyImg}
                  alt="Simbol perisai dan centang untuk kepatuhan standar"
                  loading="lazy"
                  width={1200}
                  height={912}
                  className="w-full border-2 border-foreground object-cover"
                />
              </div>
              <div className="lg:col-span-7">
                <h2 className="font-display text-3xl leading-tight font-bold sm:text-4xl">
                  Bukan Sekadar AI Penulis Teks. Ini Konsultan Virtual & Costing Engine Regional.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  EcoGrant AI memangkas waktu penyusunan proposal dari hitungan hari menjadi kurang
                  dari 15 menit. AI bertindak sebagai konsultan virtual yang merumuskan Scope of
                  Work (SoW), sementara costing engine mencocokkan tugas dengan standar harga
                  regional (SBM) terkini.
                </p>

                <div className="mt-8 grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-2">
                  {[
                    [
                      ShieldCheck,
                      "Database SBM Terintegrasi",
                      "Otomatis menarik indeks harga resmi (Kalimantan Selatan, DKI, Papua, Nasional) untuk honorarium & sewa.",
                    ],
                    [
                      Grid2x2Check,
                      "Dynamic Intake Chatbot",
                      "Cukup berikan brief singkat, AI akan menjabarkan Latar Belakang, Metodologi, SoW, dan Jadwal secara presisi.",
                    ],
                    [
                      Sparkles,
                      "Kamus Bahasa Birokrasi",
                      "Fasih menggunakan bahasa formal kementerian dan lembaga donor (Agroforestri Dukuh, LFA, KPI).",
                    ],
                    [
                      Send,
                      "Magic Link & E-Signature",
                      "Proposal dikirim berupa portal web interaktif aman dilengkapi notifikasi baca & tanda tangan digital.",
                    ],
                  ].map(([Icon, t, d]) => {
                    const I = Icon as typeof ShieldCheck;
                    return (
                      <div key={t as string} className="bg-background p-6">
                        <I className="size-6 text-primary" />
                        <h3 className="mt-4 font-display text-lg font-bold">{t as string}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {d as string}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RINCIAN FITUR UTAMA 4 MODUL PRD (PRD Feature List) */}
        <section id="fitur" className="border-b-2 border-foreground">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <SectionLabel index="04">Rincian Fitur Utama PRD (Feature List)</SectionLabel>
            <div className="mt-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold sm:text-4xl">
                  Empat Modul Spesialis untuk Proposal Hibah Berkualitas
                </h2>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                  Dirancang komprehensif mengikuti alur kerja pembuatan proposal penawaran & hibah
                  di Indonesia.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {/* MODUL A */}
              <div className="surface-panel p-6 border-2 border-foreground bg-card">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-emerald-600 text-white font-bold">
                    A
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">
                      Modul Persiapan & Asset Vault
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Manajemen Identitas & Portfolio Integrator
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-3 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Custom Branding:</strong> Penyimpanan
                      identitas visual NGO/komunitas (misal: "The Guardian of The Earth") yang
                      otomatis terpasang pada header/footer proposal.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Portfolio Integrator:</strong> Direktori
                      untuk menarik aset rekam jejak (seperti infografis Instagram & media cetak)
                      langsung ke halaman lampiran proposal.
                    </span>
                  </li>
                </ul>
              </div>

              {/* MODUL B */}
              <div className="surface-panel p-6 border-2 border-foreground bg-card">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-emerald-600 text-white font-bold">
                    B
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">
                      Modul AI Generator Konseptual
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Penyusun Kerangka & Matriks Logframe (LFA)
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-3 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Dynamic Intake Chatbot:</strong> Antarmuka
                      input awal untuk mendeskripsikan brief proyek secara bebas.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Domain-Specific Template:</strong> Paham
                      istilah teknis pelestarian hutan, agroforestri tradisional (sistem Dukuh
                      Kalsel), dan pemberdayaan desa.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Smart Scope & Timeline Builder:</strong>{" "}
                      Otomatis merumuskan Deliverables, Milestones, dan Indikator Keberhasilan
                      (KPI).
                    </span>
                  </li>
                </ul>
              </div>

              {/* MODUL C */}
              <div className="surface-panel p-6 border-2 border-foreground bg-card">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-emerald-600 text-white font-bold">
                    C
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">
                      Modul Kalkulasi RAB Terintegrasi SBM
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Automated Costing & Model Data PostgreSQL
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-3 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Regional SBM Filter:</strong> Dropdown
                      penyesuaian database harga otomatis (Kalimantan Selatan - Balai BPHL XI, DKI,
                      Papua, Nasional).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">AI-to-Database Mapping:</strong>{" "}
                      Mencocokkan Scope of Work dengan item pembiayaan regulasi kementerian/donor
                      target.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Custom Rate Override & RDBMS:</strong>{" "}
                      Opsi ubah harga manual jika di luar SBM, serta dukungan Bulk Upload CSV Admin
                      untuk pembaruan Peraturan Gubernur/Kemenhut.
                    </span>
                  </li>
                </ul>
              </div>

              {/* MODUL D */}
              <div className="surface-panel p-6 border-2 border-foreground bg-card">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-emerald-600 text-white font-bold">
                    D
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">
                      Modul Kolaborasi & Distribusi
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      WYSIWYG Workspace, Magic Link & E-Signature
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-3 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Modular Editor (WYSIWYG):</strong> Kanvas
                      visual dengan sakelar (*toggle*) untuk mengaktifkan bab opsional (*Manajemen
                      Risiko*, *Struktur Tim*).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">
                        Interactive Client Portal (Magic Link):
                      </strong>{" "}
                      Pengiriman proposal berbentuk tautan web aman yang responsif.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Document Analytics & E-Signature:</strong>{" "}
                      Notifikasi saat donor membaca proposal dan fitur tanda tangan digital untuk
                      penyetujuan instan.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* TARGET PENGGUNA / PERSONAS (PRD Section 2) */}
        <section
          id="persona"
          className="border-b-2 border-foreground bg-secondary/50 py-16 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-5">
            <SectionLabel index="05">Target Pengguna (User Persona)</SectionLabel>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
              Dirancang untuk Siapa Saja yang Bergerak di Sektor Hijau?
            </h2>

            {/* Persona Interactive Tabs */}
            <div className="mt-8">
              <div className="flex flex-wrap gap-2 border-b-2 border-foreground pb-4">
                <Button
                  onClick={() => setActivePersona("freelancer")}
                  variant={activePersona === "freelancer" ? "default" : "outline"}
                  className="rounded-none font-semibold text-xs sm:text-sm"
                >
                  <Users className="mr-2 size-4" /> Freelancer & Konsultan Fleksibel
                </Button>
                <Button
                  onClick={() => setActivePersona("asn")}
                  variant={activePersona === "asn" ? "default" : "outline"}
                  className="rounded-none font-semibold text-xs sm:text-sm"
                >
                  <Building2 className="mr-2 size-4" /> ASN Kemenhut & Balai Daerah
                </Button>
                <Button
                  onClick={() => setActivePersona("ngo")}
                  variant={activePersona === "ngo" ? "default" : "outline"}
                  className="rounded-none font-semibold text-xs sm:text-sm"
                >
                  <Leaf className="mr-2 size-4" /> Komunitas & NGO Lingkungan
                </Button>
              </div>

              <div className="mt-6 surface-panel p-6 sm:p-8 border-2 border-foreground bg-card">
                {activePersona === "freelancer" && (
                  <div className="grid gap-6 md:grid-cols-12 items-center">
                    <div className="md:col-span-8">
                      <Badge className="bg-primary text-primary-foreground mb-3">
                        User Persona Utama PRD
                      </Badge>
                      <h3 className="font-display text-2xl font-bold text-foreground">
                        Freelancer, Fasilitator Lapangan & Desainer Visual
                      </h3>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        Pekerja lepas yang jam kerjanya fleksibel (asynchronous). Unggul dalam
                        mengeksekusi program di lapangan atau membuat kampanye edukasi visual, namun
                        kerap terhambat oleh proses penyusunan administrasi proposal, kalkulasi RAB
                        baku, dan justifikasi logis untuk tender atau hibah.
                      </p>
                      <ul className="mt-4 space-y-2 text-xs sm:text-sm font-medium">
                        <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-4" /> Hemat waktu pembuatan proposal dari 14
                          hari jadi &lt; 15 menit.
                        </li>
                        <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-4" /> Integrasikan infografis Instagram
                          langsung ke lampiran portofolio.
                        </li>
                      </ul>
                    </div>
                    <div className="md:col-span-4 rounded-lg bg-muted p-4 border border-border">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Contoh Penggunaan:
                      </span>
                      <p className="mt-2 text-xs font-medium text-foreground italic">
                        "Saya konsultan independen di Banjarbaru. Tinggal pilih SBM Kalimantan
                        Selatan, buat proposal pelatihan kompos desa 3 hari, dan RAB langsung terisi
                        honor narasumber resmi."
                      </p>
                    </div>
                  </div>
                )}

                {activePersona === "asn" && (
                  <div className="grid gap-6 md:grid-cols-12 items-center">
                    <div className="md:col-span-8">
                      <Badge className="bg-primary text-primary-foreground mb-3">
                        ASN & Pejabat Teknis
                      </Badge>
                      <h3 className="font-display text-2xl font-bold text-foreground">
                        ASN Kemenhut & Pejabat Balai Pengelolaan Hutan
                      </h3>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        Pengelola program pemerintah yang membutuhkan draf usulan kegiatan dengan
                        kepatuhan 100% terhadap Peraturan Menteri dan Standar Biaya Masukan (SBM)
                        regional resmi seperti Balai BPHL XI Banjarbaru.
                      </p>
                      <ul className="mt-4 space-y-2 text-xs sm:text-sm font-medium">
                        <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-4" /> Terhindar dari kesalahan pagu anggaran
                          melebihi SBM resmi.
                        </li>
                        <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-4" /> Bahasa birokrasi formal baku yang siap
                          diserahkan ke pimpinan.
                        </li>
                      </ul>
                    </div>
                    <div className="md:col-span-4 rounded-lg bg-muted p-4 border border-border">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Contoh Penggunaan:
                      </span>
                      <p className="mt-2 text-xs font-medium text-foreground italic">
                        "Menyusun Kerangka Acuan Kerja (KAK) dan RAB kegiatan pendampingan LPHD
                        tanpa khawatir salah indeks harga satuan."
                      </p>
                    </div>
                  </div>
                )}

                {activePersona === "ngo" && (
                  <div className="grid gap-6 md:grid-cols-12 items-center">
                    <div className="md:col-span-8">
                      <Badge className="bg-primary text-primary-foreground mb-3">
                        Organisasi Nirlaba & Komunitas
                      </Badge>
                      <h3 className="font-display text-2xl font-bold text-foreground">
                        NGO Lingkungan & Komunitas Lokal ("The Guardian of The Earth")
                      </h3>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        Komunitas yang fokus pada aksi nyata pelestarian hutan dan pemberdayaan
                        masyarakat. Membutuhkan alat bantu untuk mengirimkan proposal profesional ke
                        donor internasional atau BPDLH lengkap dengan branding organisasi.
                      </p>
                      <ul className="mt-4 space-y-2 text-xs sm:text-sm font-medium">
                        <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-4" /> Penyematan otomatis logo NGO dan
                          header/footer dokumen.
                        </li>
                        <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-4" /> Magic Link interaktif memudahkan donor
                          membaca & menyetujui.
                        </li>
                      </ul>
                    </div>
                    <div className="md:col-span-4 rounded-lg bg-muted p-4 border border-border">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Contoh Penggunaan:
                      </span>
                      <p className="mt-2 text-xs font-medium text-foreground italic">
                        "Proposal Restorasi Agroforestri Dukuh kami kirimkan ke donor lewat Magic
                        Link, dan donor langsung membubuhkan e-signature."
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ALUR KERJA 5 LANGKAH PRD (PRD User Flow) */}
        <section
          id="cara-kerja"
          className="border-b-2 border-foreground bg-background py-16 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-5">
            <SectionLabel index="06">User Flow & Alur Kerja</SectionLabel>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
              5 Langkah Mudah dari Brief Kasar ke Proposal Siap Kirim
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Alur kerja terpandu tanpa ribet yang menyelesaikan kemacetan (*bottleneck*)
              perhitungan RAB.
            </p>

            <img
              src={howImg}
              alt="Diagram alur kerja penyusunan proposal"
              loading="lazy"
              width={1200}
              height={912}
              className="mt-8 w-full border-2 border-foreground object-cover"
            />

            <ol className="mt-8 grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-2 lg:grid-cols-5">
              {[
                [
                  "1. Project Intake",
                  "Pilih template 'Pemberdayaan Masyarakat' & masukkan brief di kolom chat intake.",
                ],
                [
                  "2. AI Drafting",
                  "Sistem menghasilkan Latar Belakang, Metodologi, Scope of Work, dan Jadwal.",
                ],
                [
                  "3. Cost Mapping",
                  "Pilih wilayah SBM (misal Kalsel). AI mencocokkan RAB otomatis sesuai standar harga.",
                ],
                [
                  "4. Review & Editing",
                  "Edit di WYSIWYG editor, tambah lampiran desain visual & pastikan logo NGO terpasang.",
                ],
                [
                  "5. Export / Magic Link",
                  "Kirim tautan proposal interaktif ke pemberi dana hibah untuk direviu & e-signed.",
                ],
              ].map(([t, d], i) => (
                <li key={t} className="bg-background p-5">
                  <span className="font-mono text-xs font-bold text-primary">LANGKAH 0{i + 1}</span>
                  <h3 className="mt-2 font-display text-base font-bold">{t}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ ACCORDION (PRD Specs) */}
        <section id="faq" className="border-b-2 border-foreground bg-secondary/60 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-5">
            <SectionLabel index="07">Pertanyaan Umum (FAQ)</SectionLabel>
            <div className="mt-8 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <h2 className="font-display text-3xl font-bold sm:text-4xl">
                  Segala Hal tentang EcoGrant AI
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Temukan jawaban seputar kepatuhan SBM, fitur Magic Link, serta keamanan data
                  proposalmu.
                </p>
                <img
                  src={faqImg}
                  alt="Ilustrasi geometris tanda tanya dan daun"
                  loading="lazy"
                  width={1008}
                  height={1008}
                  className="mt-6 w-full border-2 border-foreground object-cover"
                />
              </div>

              <div className="lg:col-span-8">
                <Accordion type="single" collapsible className="border-t-2 border-foreground">
                  {[
                    [
                      "Bagaimana EcoGrant AI mencocokkan SBM regional?",
                      "Sistem menyimpan ratusan indeks harga dalam basis data PostgreSQL `sbm_rates`. Ketika kamu memilih wilayah operasional (seperti Kalimantan Selatan), seluruh honor narasumber, uang harian, dan sewa kendaraan ditarik otomatis sesuai pagu resmi Balai BPHL XI Banjarbaru / Kemenhut.",
                    ],
                    [
                      "Apakah harga SBM bisa diubah manual jika ada kondisi khusus?",
                      "Bisa. EcoGrant AI menyediakan fitur Custom Rate Override sehingga kamu tetap memiliki fleksibilitas untuk mengubah harga satuan jika ada kondisi tak terduga di lapangan yang belum terakomodasi SBM.",
                    ],
                    [
                      "Bagaimana cara kerja Magic Link dan Digital E-Signature?",
                      "Daripada mengirim file PDF mati via email, kamu dapat membagikan Magic Link (tautan web interaktif aman). Pihak donor atau kementerian dapat membuka proposal secara langsung di browser dan menyetujuinya via tanda tangan digital.",
                    ],
                    [
                      "Dapatkah saya melampirkan portofolio desain visual NGO saya?",
                      "Ya. Modul Asset Vault & Portfolio Integrator memungkinkanmu menyimpan logo lembaga (seperti 'The Guardian of The Earth') dan melampirkan rekam jejak infografis Instagram langsung ke halaman lampiran proposal.",
                    ],
                    [
                      "Apakah proposal bisa diunduh dalam format biasa?",
                      "Tentu saja. Kamu dapat mengekspor proposal ke dalam format PDF untuk pengajuan formal, DOCX untuk pengeditan lanjutan, serta XLSX khusus rincian anggaran biaya (RAB).",
                    ],
                    [
                      "Apakah data proposal saya aman di platform?",
                      "Sangat aman. Seluruh data disimpan dalam PostgreSQL dengan proteksi Row Level Security (RLS) dan enkripsi penuh. Hanya kamu dan tim terotorisasi yang dapat mengakses dokumen proposal tersebut.",
                    ],
                  ].map(([q, a], i) => (
                    <AccordionItem
                      key={q}
                      value={`item-${i}`}
                      className="border-b-2 border-foreground"
                    >
                      <AccordionTrigger className="text-left font-display text-base font-semibold hover:no-underline py-4">
                        {q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground pb-4">
                        {a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="relative border-b-2 border-foreground">
          <img
            src={ctaImg}
            alt="Pola geometris tajuk hutan dari udara"
            loading="lazy"
            width={1600}
            height={704}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="relative bg-emerald-950/90 text-white">
            <div className="mx-auto max-w-3xl px-5 py-20 text-center lg:py-28">
              <Badge className="bg-emerald-500 text-slate-950 font-bold mb-4 px-3 py-1">
                ⚡ MVP Versi 1.0 Ready
              </Badge>
              <h2 className="font-display text-3xl font-extrabold sm:text-5xl leading-tight">
                Proposal Hibah Berikutnya Nggak Perlu Bikin Begadang.
              </h2>
              <p className="mt-5 text-base leading-relaxed opacity-90">
                Buat akun gratis, mulai dari brief ide sederhana, dan biarkan EcoGrant AI
                menyusunnya jadi proposal formal tervalidasi SBM yang siap dibaca lembaga donor.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-none bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold px-8 shadow-lg"
                >
                  <Link to={appHref}>
                    {appLabel} <ArrowRight className="size-4 ml-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-none border-2 border-white/60 bg-transparent text-white hover:bg-white/10 px-8 font-semibold"
                >
                  <a href="#demo-sbm">Coba Simulator Live</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-background border-t-2 border-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Leaf className="size-5" />
              </span>
              <span className="font-display text-lg font-bold">EcoGrant AI</span>
            </div>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Aplikasi generator proposal berbasis AI (LLM) khusus sektor Kehutanan, Lingkungan,
              Agroforestri, Konservasi & Pemberdayaan Masyarakat terintegrasi SBM Regional.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-[0.18em] uppercase text-primary">
              Navigasi Halaman
            </h4>
            <ul className="mt-4 space-y-2 text-xs font-medium text-muted-foreground">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="hover:text-foreground">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-[0.18em] uppercase text-primary">
              Modul PRD
            </h4>
            <ul className="mt-4 space-y-2 text-xs font-medium text-muted-foreground">
              <li>Asset Vault & Branding NGO</li>
              <li>AI Generator & Logframe</li>
              <li>Automated Costing SBM</li>
              <li>Magic Link & E-Signature</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-[0.18em] uppercase text-primary">
              Spesialisasi Sektor
            </h4>
            <ul className="mt-4 space-y-2 text-xs font-medium text-muted-foreground">
              <li>Pengelolaan Hutan & Agroforestri (Dukuh)</li>
              <li>Pemberdayaan Masyarakat Desa</li>
              <li>Konservasi & Pelestarian Lingkungan</li>
              <li>Standar SBM BPHL XI & Kemenhut 2026</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border bg-muted/30">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} EcoGrant AI — Generator Proposal Hibah. Seluruh hak cipta
              dilindungi.
            </p>
            <p>Spesialis Proposal Kehutanan, Lingkungan & Pemberdayaan Masyarakat Indonesia.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
