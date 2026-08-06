import { generateText, streamText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, AI_MODEL } from "./ai-gateway.server";

const ContextSchema = z.object({
  title: z.string().default(""),
  organization: z.string().default(""),
  location: z.string().default(""),
  province: z.string().default(""),
  category: z.string().default(""),
  ideaSummary: z.string().default(""),
  durationMonths: z.number().default(0),
  grantAmount: z.number().default(0),
  donorName: z.string().default(""),
  donorPriorities: z.array(z.string()).default([]),
});

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
  if (message.includes("429")) throw new Error("Batas permintaan AI tercapai. Silakan coba beberapa saat lagi.");
  if (message.includes("402")) throw new Error("Kuota AI habis. Silakan tambahkan kredit pada workspace.");
  throw new Error(`Permintaan AI gagal: ${message}`);
}

function contextBlock(c: z.infer<typeof ContextSchema>) {
  return [
    `Judul program: ${c.title || "-"}`,
    `Organisasi pelaksana: ${c.organization || "-"}`,
    `Lokasi: ${c.location || "-"}${c.province ? `, Provinsi ${c.province}` : ""}`,
    `Kategori program: ${c.category || "-"}`,
    `Durasi: ${c.durationMonths} bulan`,
    `Nilai hibah yang diajukan: Rp ${c.grantAmount.toLocaleString("id-ID")}`,
    `Lembaga donor: ${c.donorName || "belum dipilih"}`,
    c.donorPriorities.length ? `Prioritas donor: ${c.donorPriorities.join("; ")}` : "",
    `Ringkasan ide lapangan: ${c.ideaSummary || "-"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM = `Anda adalah penulis proposal hibah profesional di sektor kehutanan, lingkungan hidup, dan pemberdayaan masyarakat di Indonesia.
Tulis dalam Bahasa Indonesia formal, lugas, dan faktual sesuai kaidah dokumen resmi lembaga donor.
Jangan menggunakan kata sapaan, jangan menggunakan emoji, jangan menggunakan penanda markdown seperti tanda pagar atau tanda bintang.
Gunakan paragraf utuh. Hindari klaim data statistik spesifik yang tidak diberikan pengguna; gunakan rumusan kualitatif bila data tidak tersedia.`;

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
    const result = streamText({
      model: gateway()(AI_MODEL),
      system: SYSTEM,
      prompt: `${contextBlock(data.context)}

Bagian yang ditulis: ${data.sectionLabel}
Instruksi: ${MODE_INSTRUCTION[data.mode]}
Panjang: 3 sampai 5 paragraf, kecuali bagian bersifat daftar seperti Tujuan, Sasaran, Output, dan Outcome yang boleh ditulis sebagai paragraf pengantar diikuti butir bernomor.
${data.currentContent ? `\nNaskah saat ini:\n${data.currentContent}` : ""}`,
    });
    const text = await result.text;
    return { content: text.trim() };
  } catch (error) {
    handleError(error);
  }
}

export async function runSummary(data: z.infer<typeof SummaryInput>) {
  try {
    const result = streamText({
      model: gateway()(AI_MODEL),
      system: SYSTEM,
      prompt: `${contextBlock(data.context)}

Ringkasan Logical Framework:
${data.lfaSummary || "belum tersedia"}

Total Rencana Anggaran Biaya: Rp ${data.budgetTotal.toLocaleString("id-ID")}

Naskah proposal:
${data.narratives.map((n) => `${n.label}:\n${n.content}`).join("\n\n").slice(0, 12000)}

Tugas: susun Executive Summary proposal maksimal ${data.maxWords} kata yang memuat konteks masalah, tujuan, pendekatan, keluaran utama, indikator keberhasilan, kebutuhan anggaran, dan keberlanjutan.`,
    });
    const text = await result.text;
    return { content: text.trim() };
  } catch (error) {
    handleError(error);
  }
}

const LfaSchema = z.object({
  rows: z
    .array(
      z.object({
        row_type: z.enum(["goal", "outcome", "output", "activity"]),
        goal: z.string().default(""),
        outcome: z.string().default(""),
        output: z.string().default(""),
        activity: z.string().default(""),
        indicator: z.string().default(""),
        baseline: z.string().default(""),
        target: z.string().default(""),
        means_of_verification: z.string().default(""),
        assumption: z.string().default(""),
      }),
    )
    .min(4),
});

export async function runLfa(data: z.infer<typeof LfaInput>) {
  try {
    const result = streamText({
      model: gateway()(AI_MODEL),
      system: SYSTEM,
      output: Output.object({ schema: LfaSchema }),
      prompt: `${contextBlock(data.context)}

Naskah proposal:
${data.narratives.map((n) => `${n.label}:\n${n.content}`).join("\n\n").slice(0, 10000)}

Tugas: susun Logical Framework Matrix. Hasilkan satu baris bertipe goal, satu sampai dua baris bertipe outcome, dua sampai empat baris bertipe output, dan empat sampai sepuluh baris bertipe activity.
Setiap baris wajib memiliki indikator terukur, baseline, target, alat verifikasi, dan asumsi. Isi kolom yang tidak relevan dengan string kosong.`,
    });
    const output = await result.output;
    return output;
  } catch (error) {
    handleError(error);
  }
}

const BudgetSchema = z.object({
  items: z
    .array(
      z.object({
        category: z.string(),
        activity_name: z.string().default(""),
        description: z.string(),
        unit: z.string(),
        volume: z.number().default(1),
        frequency: z.number().default(1),
        unit_price: z.number().default(0),
        standard_code: z.string().default(""),
      }),
    )
    .min(3),
});

export async function runBudget(data: z.infer<typeof BudgetInput>) {
  try {
    const result = streamText({
      model: gateway()(AI_MODEL),
      system: SYSTEM,
      output: Output.object({ schema: BudgetSchema }),
      prompt: `${contextBlock(data.context)}

Daftar aktivitas dari Logical Framework:
${data.activities.map((a, i) => `${i + 1}. ${a}`).join("\n") || "belum tersedia"}

Daftar standar biaya yang berlaku (gunakan harga satuan dan kode ini bila relevan):
${data.standards.map((s) => `${s.source} ${s.code} | ${s.category} | ${s.description} | ${s.unit} | ${s.price}`).join("\n").slice(0, 8000)}

Tugas: susun rekomendasi item Rencana Anggaran Biaya yang realistis untuk seluruh aktivitas.
Gunakan kode standar biaya pada kolom standard_code bila item mengacu pada daftar di atas, dan kosongkan bila tidak.
Harga satuan tidak boleh melebihi standar biaya yang tersedia. Total keseluruhan sebaiknya mendekati namun tidak melebihi nilai hibah yang diajukan.`,
    });
    const output = await result.output;
    return output;
  } catch (error) {
    handleError(error);
  }
}

export const _unusedGenerateText = generateText;