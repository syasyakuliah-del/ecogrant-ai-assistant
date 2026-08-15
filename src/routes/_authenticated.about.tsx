import { createFileRoute } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { PageHeader } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/about")({
  head: () => ({
    meta: [
      { title: "Tentang Aplikasi — EcoGrant AI" },
      {
        name: "description",
        content: "Informasi versi, ruang lingkup, dan prinsip kerja platform EcoGrant AI.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Tentang Aplikasi — EcoGrant AI" },
      {
        property: "og:description",
        content: "Kenali prinsip Single Source of Truth dan cakupan fitur EcoGrant AI.",
      },
    ],
  }),
  component: AboutPage,
});

const MODULES = [
  "Wizard proposal sepuluh langkah dengan penyimpanan otomatis",
  "Penyusunan narasi dan ringkasan eksekutif berbantuan AI",
  "Logical Framework Matrix terhubung dengan Rencana Anggaran Biaya",
  "Validasi biaya terhadap Standar Biaya Masukan dan Standar Biaya Umum",
  "Pencocokan lembaga donor beserta skor kesesuaian",
  "Ekspor dokumen PDF, DOCX, dan XLSX",
  "Administrasi pengguna, donor, standar biaya, kegiatan, analitik, dan audit",
];

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Tentang Aplikasi"
        description="EcoGrant AI versi 1.0 — Bahasa Indonesia formal."
      />

      <div className="surface-panel space-y-6 p-6">
        <div className="flex items-center gap-3">
          <img
            src="/logoecograntai.png"
            alt="Logo EcoGrant AI"
            className="size-11 object-contain rounded-xl"
          />
          <div>
            <p className="font-display text-lg font-semibold">EcoGrant AI</p>
            <p className="text-sm text-muted-foreground">
              Generator proposal hibah kehutanan dan lingkungan
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          EcoGrant AI menerjemahkan ide lapangan menjadi dokumen pengajuan hibah yang formal,
          konsisten, dan terdokumentasi. Seluruh data proposal menjadi sumber kebenaran tunggal
          sehingga perubahan pada narasi, kerangka logis, standar biaya, atau anggaran otomatis
          memperbarui modul terkait.
        </p>

        <div>
          <p className="mb-2 text-sm font-semibold">Ruang Lingkup Modul</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {MODULES.map((m) => (
              <li key={m} className="flex gap-2">
                <span className="text-primary">•</span>
                {m}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">Versi</p>
            <p className="font-semibold">1.0 MVP</p>
          </div>
          <div>
            <p className="text-muted-foreground">Bahasa Produk</p>
            <p className="font-semibold">Bahasa Indonesia formal</p>
          </div>
          <div>
            <p className="text-muted-foreground">Dukungan</p>
            <p className="font-semibold">dukungan@ecogrant.ai</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Hasil AI merupakan draf yang wajib ditinjau pengguna sebelum diajukan kepada lembaga
          donor.
        </p>
      </div>
    </div>
  );
}
