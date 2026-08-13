export const PROPOSAL_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sedang_disusun", label: "Sedang Disusun" },
  { value: "siap_ditinjau", label: "Siap Ditinjau" },
  { value: "perlu_revisi", label: "Perlu Revisi" },
  { value: "disetujui", label: "Disetujui" },
  { value: "selesai", label: "Selesai" },
  { value: "diarsipkan", label: "Diarsipkan" },
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]["value"];

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  PROPOSAL_STATUSES.map((s) => [s.value, s.label]),
);

export const NARRATIVE_SECTIONS = [
  { key: "latar_belakang", label: "Latar Belakang" },
  { key: "permasalahan", label: "Permasalahan" },
  { key: "tujuan", label: "Tujuan" },
  { key: "sasaran", label: "Sasaran" },
  { key: "output", label: "Output" },
  { key: "outcome", label: "Outcome" },
  { key: "metodologi", label: "Metodologi" },
  { key: "strategi_implementasi", label: "Strategi Implementasi" },
  { key: "keberlanjutan", label: "Keberlanjutan" },
  { key: "risiko", label: "Risiko" },
  { key: "monitoring", label: "Monitoring" },
  { key: "evaluasi", label: "Evaluasi" },
] as const;

export const EXECUTIVE_SUMMARY_KEY = "executive_summary";

export const WIZARD_STEPS = [
  { step: 1, title: "Informasi Proposal", short: "Informasi" },
  { step: 2, title: "Penyusunan Narasi", short: "Narasi" },
  { step: 3, title: "Executive Summary", short: "Ringkasan" },
  { step: 4, title: "Pemilihan Lembaga Donor", short: "Donor" },
  { step: 5, title: "Logical Framework Matrix", short: "LFA" },
  { step: 6, title: "Sinkronisasi SBM", short: "SBM" },
  { step: 7, title: "Sinkronisasi SBU", short: "SBU" },
  { step: 8, title: "Rencana Anggaran Biaya", short: "RAB" },
  { step: 9, title: "Review Proposal", short: "Review" },
  { step: 10, title: "Export Dokumen", short: "Export" },
] as const;

export const PROVINCES = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Jambi",
  "Sumatera Selatan",
  "Bengkulu",
  "Lampung",
  "Kepulauan Bangka Belitung",
  "Kepulauan Riau",
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Banten",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Sulawesi Tengah",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Gorontalo",
  "Sulawesi Barat",
  "Maluku",
  "Maluku Utara",
  "Papua Barat",
  "Papua",
];

export const PROGRAM_CATEGORIES = [
  "Konservasi Keanekaragaman Hayati",
  "Rehabilitasi Hutan dan Lahan",
  "Perhutanan Sosial",
  "Mitigasi dan Adaptasi Perubahan Iklim",
  "Restorasi Gambut",
  "Konservasi Ekosistem Pesisir dan Laut",
  "Pemberdayaan Ekonomi Masyarakat",
  "Pendidikan dan Kampanye Lingkungan",
  "Tata Kelola dan Advokasi Kebijakan",
  "Riset dan Pengembangan",
];

export const BUDGET_CATEGORIES = [
  "Honorarium",
  "Perjalanan Dinas",
  "Konsumsi",
  "Akomodasi",
  "Transportasi",
  "Sewa",
  "Bahan",
  "Jasa Profesional",
  "Publikasi",
  "Operasional",
  "Manajemen Program",
];

export const UNITS = [
  "OJ",
  "OK",
  "OH",
  "OB",
  "Paket",
  "Unit",
  "Unit/Hari",
  "Batang",
  "Kg",
  "Lembar",
  "Eksemplar",
  "Kegiatan",
  "Bulan",
];
