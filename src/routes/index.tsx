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
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
      { title: "EcoGrant AI — Bikin Proposal Hibah Lingkungan Tanpa Drama" },
      {
        name: "description",
        content:
          "EcoGrant AI bantu mahasiswa, freelancer, dan komunitas menyusun proposal hibah kehutanan dan lingkungan: narasi AI, Logical Framework, RAB sesuai SBM/SBU, dan ekspor PDF/DOCX/XLSX.",
      },
      { property: "og:title", content: "EcoGrant AI — Bikin Proposal Hibah Lingkungan Tanpa Drama" },
      {
        property: "og:description",
        content: "Dari ide lapangan jadi proposal siap kirim: narasi AI, LFA, RAB standar biaya, dan ekspor multi-format.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const NAV = [
  { href: "#masalah", label: "Masalah" },
  { href: "#kenapa", label: "Kenapa Kami" },
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara Kerja" },
  { href: "#manfaat", label: "Manfaat" },
  { href: "#faq", label: "FAQ" },
];

function SectionLabel({ index, children }: { index: string; children: string }) {
  return (
    <div className="flex items-center gap-3 border-t-2 border-foreground pt-3">
      <span className="font-mono text-xs tracking-widest text-muted-foreground">{index}</span>
      <span className="text-xs font-semibold tracking-[0.2em] uppercase">{children}</span>
    </div>
  );
}

function Landing() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const appHref = user ? "/dashboard" : "/auth";
  const appLabel = user ? "Buka Ruang Kerja" : "Mulai Gratis";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Leaf className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">EcoGrant AI</span>
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
            <Button asChild className="rounded-none">
              <Link to={appHref}>
                {appLabel} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
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
                    className="block text-sm font-medium text-muted-foreground"
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
        {/* Hero */}
        <section className="border-b-2 border-foreground">
          <div className="mx-auto grid max-w-7xl gap-0 px-5 lg:grid-cols-12">
            <div className="flex flex-col justify-center py-16 lg:col-span-7 lg:py-24 lg:pr-12">
              <span className="mb-6 inline-flex w-fit items-center gap-2 border border-foreground px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase">
                <Sparkles className="size-3.5" /> Proposal hibah, versi anti-ribet
              </span>
              <h1 className="font-display text-5xl leading-[0.95] font-semibold sm:text-6xl lg:text-7xl">
                Ide lapanganmu
                <br />
                layak dapat
                <br />
                <span className="text-gradient-eco">pendanaan.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                EcoGrant AI bantu mahasiswa, freelancer, dan komunitas lingkungan menyusun proposal hibah yang rapi:
                narasi otomatis, Logical Framework, sampai RAB yang sudah dicek standar biaya. Kamu fokus di ide, kami
                urus format formalnya.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-none px-7">
                  <Link to={appHref}>
                    {appLabel} <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-none px-7">
                  <a href="#cara-kerja">Lihat Cara Kerjanya</a>
                </Button>
              </div>
              <dl className="mt-12 grid grid-cols-3 gap-px border-2 border-foreground bg-foreground">
                {[
                  ["10", "Langkah wizard"],
                  ["3", "Format ekspor"],
                  ["100%", "Cek SBM & SBU"],
                ].map(([v, k]) => (
                  <div key={k} className="bg-background px-4 py-5">
                    <dt className="font-display text-2xl font-semibold">{v}</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{k}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="border-l-0 border-foreground lg:col-span-5 lg:border-l-2">
              <img
                src={heroImg}
                alt="Mahasiswa dan freelancer menyusun proposal hibah bersama"
                width={1280}
                height={960}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* Masalah */}
        <section id="masalah" className="border-b-2 border-foreground">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <SectionLabel index="01">Masalah yang Sering Terjadi</SectionLabel>
            <div className="mt-8 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <h2 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
                  Idenya keren. Proposalnya yang bikin nyerah.
                </h2>
                <img
                  src={problemImg}
                  alt="Tumpukan dokumen proposal yang berantakan"
                  loading="lazy"
                  width={1200}
                  height={912}
                  className="mt-8 w-full border-2 border-foreground object-cover"
                />
              </div>
              <ul className="grid gap-px self-start border-2 border-foreground bg-foreground lg:col-span-7">
                {[
                  ["Format donor beda-beda", "Tiap lembaga punya template sendiri. Nulis ulang terus, capek sendiri."],
                  ["Logframe bikin pusing", "Goal, outcome, output, indikator — sering tertukar dan nggak nyambung."],
                  ["RAB nggak sesuai standar", "Angka melebihi SBM/SBU langsung jadi alasan proposal ditolak."],
                  ["Data tersebar di mana-mana", "Narasi di Docs, anggaran di Sheets, revisi di WhatsApp. Versi mana yang benar?"],
                  ["Deadline mepet", "Call for proposal cuma buka dua minggu, tim masih rebutan waktu."],
                ].map(([t, d]) => (
                  <li key={t} className="bg-background p-6">
                    <h3 className="font-display text-lg font-semibold">{t}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Kenapa */}
        <section id="kenapa" className="border-b-2 border-foreground bg-secondary">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <SectionLabel index="02">Kenapa Memilih EcoGrant AI?</SectionLabel>
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
                <h2 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
                  Bukan sekadar AI penulis. Ini asisten yang paham aturan hibah.
                </h2>
                <div className="mt-8 grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-2">
                  {[
                    [ShieldCheck, "Patuh standar", "Setiap komponen RAB divalidasi ke SBM dan SBU tahun berjalan."],
                    [Grid2x2Check, "Satu sumber data", "Narasi, logframe, dan anggaran saling terhubung — nggak ada beda angka."],
                    [Sparkles, "AI berbahasa formal", "Output langsung dalam Bahasa Indonesia baku ala dokumen donor."],
                    [Users, "Ramah pemula", "Wizard nuntun langkah demi langkah, tanpa perlu pengalaman jadi grant writer."],
                  ].map(([Icon, t, d]) => {
                    const I = Icon as typeof ShieldCheck;
                    return (
                      <div key={t as string} className="bg-background p-6">
                        <I className="size-6 text-primary" />
                        <h3 className="mt-4 font-display text-lg font-semibold">{t as string}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d as string}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fitur */}
        <section id="fitur" className="border-b-2 border-foreground">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <SectionLabel index="03">Fitur Unggulan</SectionLabel>
            <div className="mt-8 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <h2 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
                  Semua yang kamu butuhkan, dalam satu ruang kerja.
                </h2>
                <div className="mt-8 grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-2">
                  {[
                    [Sparkles, "Generator Narasi AI", "Latar belakang, tujuan, metodologi, hingga keberlanjutan — tinggal generate, ringkas, atau tulis ulang."],
                    [Grid2x2Check, "Logical Framework Matrix", "Goal sampai activity beserta indikator, alat verifikasi, dan asumsi risiko."],
                    [Calculator, "RAB Tervalidasi", "Rencana Anggaran Biaya otomatis dibandingkan dengan pagu SBM/SBU per provinsi."],
                    [Handshake, "Pencocokan Donor", "Skor kesesuaian proposal dengan prioritas dan syarat tiap lembaga donor."],
                    [FileDown, "Ekspor PDF, DOCX, XLSX", "Dokumen siap kirim dengan tata letak formal, sekali klik."],
                    [Clock, "Autosave & Riwayat", "Progres tersimpan otomatis di tiap langkah, aman walau browser tertutup."],
                  ].map(([Icon, t, d]) => {
                    const I = Icon as typeof ShieldCheck;
                    return (
                      <div key={t as string} className="bg-background p-6">
                        <I className="size-6 text-primary" />
                        <h3 className="mt-4 font-display text-lg font-semibold">{t as string}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d as string}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="lg:col-span-5">
                <img
                  src={featuresImg}
                  alt="Panel dashboard, grafik, dan matriks kerangka logis"
                  loading="lazy"
                  width={1200}
                  height={912}
                  className="w-full border-2 border-foreground object-cover lg:sticky lg:top-24"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Cara Kerja */}
        <section id="cara-kerja" className="border-b-2 border-foreground bg-secondary">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <SectionLabel index="04">Cara Kerja</SectionLabel>
            <h2 className="mt-8 font-display text-3xl leading-tight font-semibold sm:text-4xl">
              Empat langkah besar, sepuluh langkah terpandu.
            </h2>
            <img
              src={howImg}
              alt="Diagram alur kerja penyusunan proposal"
              loading="lazy"
              width={1200}
              height={912}
              className="mt-8 w-full border-2 border-foreground object-cover"
            />
            <ol className="mt-8 grid gap-px border-2 border-foreground bg-foreground md:grid-cols-2 lg:grid-cols-4">
              {[
                ["01", "Isi info dasar", "Nama program, lokasi, durasi, dan organisasi pelaksana."],
                ["02", "Generate narasi & LFA", "AI menyusun bagian naratif dan kerangka logis dari konteks proyekmu."],
                ["03", "Susun RAB", "Tambah komponen biaya, sistem langsung cek ke SBM dan SBU."],
                ["04", "Review & ekspor", "Cek kelengkapan, lalu unduh PDF, DOCX, atau XLSX."],
              ].map(([n, t, d]) => (
                <li key={n} className="bg-background p-6">
                  <span className="font-mono text-xs tracking-widest text-primary">{n}</span>
                  <h3 className="mt-3 font-display text-lg font-semibold">{t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Manfaat */}
        <section id="manfaat" className="border-b-2 border-foreground">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <SectionLabel index="05">Manfaat yang Didapat Pengguna</SectionLabel>
            <div className="mt-8 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <h2 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
                  Hemat waktu, naikkan peluang lolos.
                </h2>
                <ul className="mt-8 divide-y-2 divide-foreground border-y-2 border-foreground">
                  {[
                    ["Waktu penyusunan jauh lebih singkat", "Draft awal yang biasanya dua minggu bisa selesai dalam hitungan jam."],
                    ["Kualitas dokumen konsisten", "Struktur dan gaya bahasa mengikuti standar dokumen hibah profesional."],
                    ["Risiko penolakan administratif turun", "Anggaran dan kelengkapan dokumen dicek sebelum dikirim."],
                    ["Belajar sambil mengerjakan", "Setiap langkah menjelaskan kenapa bagian itu penting buat donor."],
                    ["Kolaborasi lebih tenang", "Semua tim melihat versi data yang sama, tanpa file ganda."],
                  ].map(([t, d]) => (
                    <li key={t} className="py-5">
                      <h3 className="font-display text-lg font-semibold">{t}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-6">
                <img
                  src={benefitsImg}
                  alt="Ilustrasi keberhasilan mendapatkan pendanaan hibah"
                  loading="lazy"
                  width={1200}
                  height={912}
                  className="w-full border-2 border-foreground object-cover"
                />
                <div className="mt-6 grid gap-px border-2 border-foreground bg-foreground sm:grid-cols-3">
                  {[
                    ["Mahasiswa", "Program KKN, riset, dan komunitas kampus."],
                    ["Freelancer", "Konsultan proposal yang pegang banyak klien."],
                    ["NGO & Komunitas", "Lembaga lingkungan skala lokal sampai nasional."],
                  ].map(([t, d]) => (
                    <div key={t} className="bg-background p-5">
                      <h3 className="text-xs font-semibold tracking-[0.16em] uppercase">{t}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b-2 border-foreground bg-secondary">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
            <SectionLabel index="06">FAQ</SectionLabel>
            <div className="mt-8 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <h2 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
                  Pertanyaan yang sering muncul.
                </h2>
                <img
                  src={faqImg}
                  alt="Ilustrasi geometris tanda tanya dan daun"
                  loading="lazy"
                  width={1008}
                  height={1008}
                  className="mt-8 w-full border-2 border-foreground object-cover"
                />
              </div>
              <div className="lg:col-span-8">
                <Accordion type="single" collapsible className="border-t-2 border-foreground">
                  {[
                    ["Apakah EcoGrant AI gratis dipakai?", "Kamu bisa membuat akun dan menyusun proposal pertama tanpa biaya. Fitur inti seperti wizard, LFA, RAB, dan ekspor tersedia sejak awal."],
                    ["Saya belum pernah menulis proposal hibah. Bisa pakai ini?", "Sangat bisa. Wizard sepuluh langkah memandu dari informasi dasar sampai ekspor, lengkap dengan penjelasan singkat di tiap bagian."],
                    ["Apakah hasil AI bisa saya edit?", "Semua teks hasil AI bisa diubah, diringkas, atau ditulis ulang. AI menyiapkan draft, keputusan akhir tetap di tanganmu."],
                    ["Bagaimana validasi SBM dan SBU bekerja?", "Setiap komponen biaya dibandingkan dengan pagu satuan resmi sesuai provinsi dan tahun anggaran. Jika melebihi, sistem memberi peringatan sebelum kamu ekspor."],
                    ["Format apa saja yang bisa diunduh?", "PDF untuk pengajuan, DOCX untuk revisi lanjutan, dan XLSX khusus rincian anggaran."],
                    ["Apakah data proposal saya aman?", "Setiap akun hanya bisa mengakses proposalnya sendiri. Akses data dibatasi di level basis data dan seluruh aktivitas penting tercatat di log audit."],
                  ].map(([q, a], i) => (
                    <AccordionItem key={q} value={`item-${i}`} className="border-b-2 border-foreground">
                      <AccordionTrigger className="text-left font-display text-base font-semibold hover:no-underline">
                        {q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative border-b-2 border-foreground">
          <img
            src={ctaImg}
            alt="Pola geometris tajuk hutan dari udara"
            loading="lazy"
            width={1600}
            height={704}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="relative bg-sidebar/90">
            <div className="mx-auto max-w-3xl px-5 py-20 text-center text-sidebar-foreground lg:py-28">
              <h2 className="font-display text-4xl leading-tight font-semibold sm:text-5xl">
                Proposal berikutnya nggak perlu bikin begadang.
              </h2>
              <p className="mt-5 text-base leading-relaxed opacity-85">
                Buat akun, mulai dari ide sederhana, dan biarkan EcoGrant AI menyusunnya jadi dokumen yang siap dibaca
                lembaga donor.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" variant="secondary" className="rounded-none px-8">
                  <Link to={appHref}>
                    {appLabel} <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-none border-sidebar-foreground/40 bg-transparent px-8 text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <Link to="/auth">Sudah punya akun? Masuk</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Leaf className="size-5" />
              </span>
              <span className="font-display text-lg font-semibold">EcoGrant AI</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Ruang kerja penyusunan proposal hibah kehutanan dan lingkungan untuk generasi baru penggerak perubahan.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] uppercase">Navigasi</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
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
            <h3 className="text-xs font-semibold tracking-[0.18em] uppercase">Aplikasi</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link to="/auth" className="hover:text-foreground">
                  Masuk
                </Link>
              </li>
              <li>
                <Link to="/auth" className="hover:text-foreground">
                  Daftar akun
                </Link>
              </li>
              <li>
                <Link to={appHref} className="hover:text-foreground">
                  Ruang kerja
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] uppercase">Kontak</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>halo@ecogrant.ai</li>
              <li>Senin–Jumat, 09.00–17.00 WITA</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} EcoGrant AI. Seluruh hak cipta dilindungi.</p>
            <p>Dibuat untuk mahasiswa, freelancer, dan komunitas lingkungan Indonesia.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
