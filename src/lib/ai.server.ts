import { streamText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, AI_MODEL } from "./ai-gateway.server";

export const ContextSchema = z.object({
  title: z.string().default(""),
  organization: z.string().default(""),
  organizationType: z.string().default("NGO"),
  organizationRegNumber: z.string().default(""),
  location: z.string().default(""),
  city: z.string().default(""),
  province: z.string().default(""),
  category: z.string().default(""),
  ideaSummary: z.string().default(""),
  durationMonths: z.number().default(0),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  grantAmount: z.number().default(0),
  currency: z.string().default("IDR"),
  donorName: z.string().default(""),
  donorCountry: z.string().default(""),
  donorPriorities: z.array(z.string()).default([]),
  donorRequirements: z.array(z.string()).default([]),
  existingNarratives: z.array(z.object({ label: z.string(), content: z.string() })).default([]),
  lfaSummary: z.string().default(""),
  rabSummary: z.string().default(""),
});

export const StructuredAiOutputSchema = z.object({
  sectionType: z.string(),
  content: z.string(),
  assumptions: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  aiGenerated: z.literal(true).default(true),
});

export type StructuredAiOutput = z.infer<typeof StructuredAiOutputSchema>;

export const NarrativeInput = z.object({
  context: ContextSchema,
  sectionKey: z.string(),
  sectionLabel: z.string(),
  mode: z.enum(["generate", "rewrite", "shorten", "expand", "restructure", "donor"]).default("generate"),
  currentContent: z.string().default(""),
});

export const SummaryInput = z.object({
  context: ContextSchema,
  narratives: z.array(z.object({ label: z.string(), content: z.string() })).default([]),
  lfaSummary: z.string().default(""),
  budgetTotal: z.number().default(0),
  maxWords: z.number().default(400),
});

export const LfaInput = z.object({
  context: ContextSchema,
  narratives: z.array(z.object({ label: z.string(), content: z.string() })).default([]),
});

export const BudgetInput = z.object({
  context: ContextSchema,
  activities: z.array(z.string()).default([]),
  standards: z
    .array(
      z.object({
        source: z.string(),
        code: z.string(),
        category: z.string(),
        description: z.string(),
        unit: z.string(),
        price: z.number(),
      }),
    )
    .default([]),
});

function gateway() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Layanan AI belum dikonfigurasi. Hubungi administrator.");
  return createLovableAiGatewayProvider(key);
}

function handleError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("429")) throw new Error("Batas permintaan AI tercapai. Silakan coba 1 menit lagi.");
  if (message.includes("402")) throw new Error("Kuota AI habis. Silakan tambahkan kredit pada workspace.");
  throw new Error(`Permintaan AI gagal: ${message}`);
}

function contextBlock(c: z.infer<typeof ContextSchema>) {
  return [
    `=== KONTEKS PROPOSAL & ORGANISASI ===`,
    `Judul program: ${c.title || "-"}`,
    `Organisasi pelaksana: ${c.organization || "-"} (${c.organizationType || "NGO"})${c.organizationRegNumber ? ` Reg: ${c.organizationRegNumber}` : ""}`,
    `Lokasi pelaksanaan: ${[c.location, c.city, c.province].filter(Boolean).join(", ") || "-"}`,
    `Kategori program: ${c.category || "-"}`,
    `Durasi pelaksanaan: ${c.durationMonths} bulan${c.startDate ? ` (${c.startDate} s.d ${c.endDate})` : ""}`,
    `Nilai hibah yang diajukan: ${c.currency} ${c.grantAmount.toLocaleString("id-ID")}`,
    `Lembaga donor target: ${c.donorName || "Belum dipilih"}${c.donorCountry ? ` (${c.donorCountry})` : ""}`,
    c.donorPriorities.length ? `Prioritas strategis donor: ${c.donorPriorities.join("; ")}` : "",
    c.donorRequirements.length ? `Persyaratan utama donor: ${c.donorRequirements.join("; ")}` : "",
    `Ringkasan ide lapangan: ${c.ideaSummary || "-"}`,
    c.existingNarratives.length ? `\n=== NARASI SEBELUMNYA ===\n` + c.existingNarratives.map((n) => `[${n.label}]\n${n.content}`).join("\n\n") : "",
    c.lfaSummary ? `\n=== LOGICAL FRAMEWORK (LFA) ===\n${c.lfaSummary}` : "",
    c.rabSummary ? `\n=== RENCANA ANGGARAN BIAYA (RAB) ===\n${c.rabSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM = `Anda adalah penulis proposal hibah profesional di sektor kehutanan, lingkungan hidup, dan pemberdayaan masyarakat di Indonesia.
Tulis dalam Bahasa Indonesia formal, lugas, dan faktual sesuai kaidah dokumen resmi lembaga donor.
Jangan mengarang nomor regulasi, angka SBM/SBU, donor, atau deadline yang tidak tersedia di dalam konteks.
Jika ada informasi penting yang belum tersedia di dalam konteks, cantumkan secara eksplisit dalam bagian kekurangan informasi.
Jangan menggunakan emoji atau kata sapaan. Gunakan paragraf utuh.`;

const MODE_INSTRUCTION: Record<string, string> = {
  generate: "Susun isi bagian tersebut dari awal berdasarkan konteks proposal.",
  rewrite: "Tulis ulang naskah berikut menjadi lebih formal dan terstruktur tanpa mengubah substansi.",
  shorten: "Ringkas naskah berikut menjadi lebih padat namun tetap lengkap secara substansi.",
  expand: "Perluas naskah berikut dengan penjelasan yang lebih rinci dan argumentatif.",
  restructure: "Perbaiki struktur dan alur logika naskah berikut sehingga runtut dan mudah dinilai.",
  donor: "Sesuaikan naskah berikut agar selaras dengan prioritas dan persyaratan lembaga donor yang dituju.",
};

export async function runNarrative(data: z.infer<typeof NarrativeInput>) {
  try {
    const parsed = NarrativeInput.parse(data);
    const instruction = MODE_INSTRUCTION[parsed.mode] ?? MODE_INSTRUCTION["generate"];
    const prompt = `${contextBlock(parsed.context)}

Tugas: ${instruction}
Bagian proposal: ${parsed.sectionLabel}

${parsed.currentContent ? `Naskah saat ini:\n${parsed.currentContent}\n` : ""}

Hasil narasi wajib formal dan dapat diubah pengguna secara bebas:`;

    const response = streamText({
      model: gateway()(AI_MODEL),
      system: SYSTEM,
      prompt,
      temperature: 0.4,
    });

    return response.toDataStreamResponse();
  } catch (error) {
    handleError(error);
  }
}

export async function runSummary(data: z.infer<typeof SummaryInput>) {
  try {
    const parsed = SummaryInput.parse(data);
    const prompt = `${contextBlock(parsed.context)}

Mata anggaran total: Rp ${parsed.budgetTotal.toLocaleString("id-ID")}
Ringkasan LFA: ${parsed.lfaSummary || "-"}

Tugas: Hasikan ringkasan eksekutif proposal hibah secara komprehensif dalam maksimal ${parsed.maxWords} kata.`;

    const response = streamText({
      model: gateway()(AI_MODEL),
      system: SYSTEM,
      prompt,
      temperature: 0.3,
    });

    return response.toDataStreamResponse();
  } catch (error) {
    handleError(error);
  }
}

export async function runLfa(data: z.infer<typeof LfaInput>) {
  try {
    const parsed = LfaInput.parse(data);
    const prompt = `${contextBlock(parsed.context)}

Tugas: Hasilkan matriks kerangka logis (LFA) terstruktur.`;

    const response = streamText({
      model: gateway()(AI_MODEL),
      system: SYSTEM,
      prompt,
      temperature: 0.3,
    });

    return response.toDataStreamResponse();
  } catch (error) {
    handleError(error);
  }
}

export async function runBudget(data: z.infer<typeof BudgetInput>) {
  try {
    const parsed = BudgetInput.parse(data);
    const prompt = `${contextBlock(parsed.context)}

Daftar Kegiatan Utama:
${parsed.activities.map((a, i) => `${i + 1}. ${a}`).join("\n") || "-"}

Standar Biaya SBM/SBU Terkait:
${parsed.standards.map((s) => `[${s.source}] ${s.code} - ${s.description}: Rp ${s.price.toLocaleString("id-ID")}/${s.unit}`).join("\n") || "-"}

Tugas: Susun rekomendasi rincian Rencana Anggaran Biaya (RAB).`;

    const response = streamText({
      model: gateway()(AI_MODEL),
      system: SYSTEM,
      prompt,
      temperature: 0.3,
    });

    return response.toDataStreamResponse();
  } catch (error) {
    handleError(error);
  }
}