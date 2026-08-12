import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BookOpen, Bot, Building2, Coins, HelpCircle, Mail, MessageSquare,
  Search, Sparkles, Wand2, FileText, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help Center & Panduan — EcoGrant AI" },
      { name: "description", content: "Kumpulan panduan wizard 10 langkah, AI, LFA, SBM, SBU, RAB, FAQ, dan kontak dukungan." },
    ],
  }),
  component: HelpPage,
});

const HELP_CATEGORIES = [
  { value: "semua", label: "Semua Panduan", icon: BookOpen },
  { value: "Memulai", label: "Panduan Memulai", icon: Wand2 },
  { value: "Wizard", label: "Panduan Wizard", icon: FileText },
  { value: "AI", label: "Panduan AI", icon: Sparkles },
  { value: "LFA", label: "Panduan LFA", icon: HelpCircle },
  { value: "SBM", label: "Panduan SBM", icon: Coins },
  { value: "SBU", label: "Panduan SBU", icon: Coins },
  { value: "RAB", label: "Panduan RAB", icon: Building2 },
  { value: "FAQ", label: "FAQ", icon: HelpCircle },
  { value: "Dukungan", label: "Kontak Dukungan", icon: Mail },
];

function HelpPage() {
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState("semua");

  const { data = [], isLoading } = useQuery({
    queryKey: ["help-articles-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;

      // Built-in articles fallback if DB has few items
      const fallbackArticles = [
        { id: "h1", category: "Memulai", title: "Panduan Memulai EcoGrant AI", excerpt: "Langkah dasar menggunakan platform.", content: "1. Lengkapi profil dan nama organisasi pada menu Profil.\n2. Buka menu Proposal Saya lalu klik tombol Buat Proposal Baru.\n3. Ikuti sepuluh langkah wizard interaktif mulai dari ide dasar hingga ekspor proposal." },
        { id: "h2", category: "Wizard", title: "10 Langkah Wizard Proposal", excerpt: "Penjelasan tahapan penyusunan proposal.", content: "Langkah 1: Informasi Proposal\nLangkah 2: Penyusunan Narasi\nLangkah 3: Executive Summary\nLangkah 4: Pemilihan Lembaga Donor\nLangkah 5: Logical Framework Matrix (LFA)\nLangkah 6: Sinkronisasi Standar Biaya Masukan (SBM)\nLangkah 7: Sinkronisasi Standar Biaya Umum (SBU)\nLangkah 8: Rencana Anggaran Biaya (RAB)\nLangkah 9: Review Proposal & Audit\nLangkah 10: Export Dokumen (Word/PDF/Excel)" },
        { id: "h3", category: "AI", title: "Cara Menggunakan AI Generator", excerpt: "Tips perintah prompt AI untuk hasil optimal.", content: "Klik tombol 'Generate dengan AI' pada setiap bagian narasi atau LFA. AI akan menganalisis latar belakang, indikator, dan kebutuhan donor untuk menghasilkan teks draft yang sesuai dengan standar penulisan hibah." },
        { id: "h4", category: "LFA", title: "Panduan Logical Framework Analysis (LFA)", excerpt: "Penyusunan hirarki Goal, Outcome, Output, dan Activity.", content: "LFA menghubungkan tujuan program secara terstruktur. Pastikan Indikator Kinerja Utama (IKU) terukur dengan baseline, target, dan metode verifikasi (MoV) yang terpercaya." },
        { id: "h5", category: "SBM", title: "Panduan Standar Biaya Masukan (SBM)", excerpt: "Validasi batasan harga masukan sesuai PMK.", content: "SBM digunakan untuk memvalidasi batas maksimum honorarium, perjalanan dinas, konsumsi, dan sewaan. Sistem akan menandai otomatis jika ada harga satuan melebihi batas SBM." },
        { id: "h6", category: "SBU", title: "Panduan Standar Biaya Umum (SBU)", excerpt: "Penyesuaian standar biaya regional provinsi.", content: "SBU menyesuaikan standar harga akomodasi dan transportasi lokal berdasarkan kode wilayah provinsi/kabupaten lokasi pelaksanaan kegiatan." },
        { id: "h7", category: "RAB", title: "Penyusunan Rencana Anggaran Biaya (RAB)", excerpt: "Perhitungan otomatis volume, frekuensi, dan pajak PPN.", content: "Setiap baris RAB dihubungkan dengan kegiatan LFA. Sistem akan otomatis menghitung subtotal, pajak PPN (11%), dan total anggaran proposal secara presisi." },
        { id: "h8", category: "FAQ", title: "Pertanyaan yang Sering Diajukan (FAQ)", excerpt: "Jawaban atas pertanyaan umum seputar platform.", content: "Q: Apakah data proposal saya aman?\nA: Ya, seluruh data proposal terisolasi per organisasi/workspace dan dilindungi enkripsi RLS.\n\nQ: Format file apa saja yang didukung untuk ekspor?\nA: Anda dapat mengunduh proposal dalam format DOCX (Word), PDF, dan XLSX (Excel)." },
        { id: "h9", category: "Dukungan", title: "Kontak Layanan Dukungan Teknis", excerpt: "Hubungi tim bantuan jika mengalami kendala.", content: "Jika membutuhkan bantuan teknis atau menemukan kendala, silakan hubungi tim dukungan kami melalui email di dukungan@ecogrant.ai atau WhatsApp Hotline +62 812-3456-7890 (Senin - Jumat, 08:00 - 17:00 WIB)." },
      ];

      return data && data.length >= 5 ? data : fallbackArticles;
    },
  });

  const term = q.trim().toLowerCase();
  const filtered = data.filter((a) => {
    if (activeCategory !== "semua" && a.category !== activeCategory) return false;
    if (!term) return true;
    return [a.title, a.excerpt, a.content, a.category].some((f) => (f ?? "").toLowerCase().includes(term));
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Help Center & Pusat Bantuan" description="Cari panduan penggunaan, tips AI, aturan SBM/SBU, dan jawaban pertanyaan umum." />

      {/* Global Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kata kunci panduan, misalnya 'RAB', 'LFA', 'AI', atau 'SBM'…"
          className="pl-10 h-11 text-sm bg-card shadow-xs"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {HELP_CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={activeCategory === cat.value ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat.value)}
            className="gap-1.5 shrink-0 text-xs rounded-full"
          >
            <cat.icon className="size-3.5" />
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Articles List / Accordion */}
      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Memuat artikel bantuan…</p>
      ) : filtered.length === 0 ? (
        <EmptyState title="Artikel tidak ditemukan" description="Coba gunakan kata kunci pencarian lain atau hubungi tim dukungan kami di dukungan@ecogrant.ai." />
      ) : (
        <Accordion type="single" collapsible className="surface-panel px-4 rounded-xl">
          {filtered.map((a) => (
            <AccordionItem key={a.id} value={a.id}>
              <AccordionTrigger className="text-left hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs shrink-0">{a.category}</Badge>
                  <span className="font-semibold text-sm text-foreground">{a.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-1 text-sm leading-relaxed">
                {a.excerpt && <p className="mb-2 text-xs text-muted-foreground font-medium">{a.excerpt}</p>}
                <div className="whitespace-pre-line text-foreground/90 bg-muted/20 p-4 rounded-lg border text-sm">
                  {a.content}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Footer Support Banner */}
      <Card className="bg-emerald-500/10 border-emerald-500/30">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Mail className="size-4" /> Masih Membutuhkan Bantuan?
            </CardTitle>
            <CardDescription className="text-xs text-emerald-700 dark:text-emerald-400">
              Tim dukungan EcoGrant AI siap membantu kebutuhan konsultasi dan teknis Anda.
            </CardDescription>
          </div>
          <Link to="/about">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
              Tentang Aplikasi EcoGrant AI
            </Button>
          </Link>
        </CardHeader>
      </Card>
    </div>
  );
}