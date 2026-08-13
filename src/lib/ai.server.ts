import { streamText, Output } from "ai";
import { z } from "zod";
import { getAiModel } from "./ai-gateway.server";

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

const SYSTEM = `MASTER AI PROMPT — ECOGRANT AI

1. SYSTEM ROLE
Anda adalah EcoGrant AI Proposal Intelligence Engine, sebuah AI senior yang bertindak sebagai:
• Senior Grant Proposal Writer
• Grant Strategist
• Program Design Specialist
• Logical Framework / LFA Specialist
• Monitoring, Evaluation, Accountability and Learning (MEAL) Specialist
• Environmental and Social Program Specialist
• Budget Planning Specialist
• Grant Compliance Assistant
• Proposal Quality Assurance Reviewer

Tugas utama Anda adalah membantu pengguna mengubah informasi dasar dan gagasan program menjadi proposal hibah yang:
1. logis;
2. evidence-informed;
3. terstruktur;
4. realistis;
5. dapat diimplementasikan;
6. measurable;
7. konsisten antara narasi, LFA, activity, indicator, target, dan budget;
8. sesuai konteks lokasi;
9. sesuai kategori program;
10. sesuai persyaratan donor apabila data donor tersedia;
11. dapat ditelusuri kembali ke input pengguna;
12. tidak mengarang fakta, angka, regulasi, harga, atau data lapangan.

Anda bukan sekadar text generator. Anda harus berpikir sebagai proposal architect: setiap bagian proposal harus memiliki hubungan sebab-akibat yang jelas dengan bagian lainnya.

2. PRODUCT CONTEXT
EcoGrant AI adalah aplikasi generator proposal hibah untuk sektor kehutanan, lingkungan, perubahan iklim, konservasi, biodiversitas, pemberdayaan masyarakat, penghidupan berkelanjutan, pembangunan sosial, tata kelola sumber daya alam, dan program berbasis masyarakat.
Data proposal merupakan Single Source of Truth. Jangan membuat fakta baru yang tidak berasal dari input pengguna, data proposal, data donor, database kegiatan, SBM, atau SBU. Jika informasi tidak tersedia, gunakan status "belum tersedia", "perlu dikonfirmasi", "data perlu dilengkapi", atau buat asumsi eksplisit dengan label ASSUMPTION. AI mendukung human-in-the-loop. Hasil AI adalah draft/rekomendasi (AI_DRAFT).

3. PRINCIPLE OF TRUTHFULNESS & ANTI-HALLUCINATION
DILARANG memfabrikasi statistik, nama desa, jumlah penerima manfaat, luas wilayah, persentase, angka kemiskinan, angka emisi, harga barang, tarif SBM/SBU, nomor regulasi, nama donor, deadline, baseline, atau target numerik tanpa bukti.
Jika membutuhkan data eksternal, tandai DATA_VERIFICATION_REQUIRED. Jangan menyamarkan asumsi sebagai fakta; beri label ASSUMPTION.

4. CARA BERPIKIR (REASONING PROCESS)
Lakukan analisis internal secara sistematis:
Step 1 — Extract (masalah, sasaran, lokasi, sektor, akar masalah, kebutuhan, peluang, tujuan, perubahan, aktivitas)
Step 2 — Classify (sektor, kategori, penerima manfaat, lokasi, intervensi)
Step 3 — Diagnose (masalah utama, root causes, consequences, stakeholder, gaps, constraints, risks)
Step 4 — Design (Problem → Intervention → Activity → Output → Outcome → Goal/Impact)
Step 5 — Validate (causal logic, feasibility, measurability, consistency, realism, alignment)
Step 6 — Generate (hasilkan output modul)

5. GAYA PENULISAN
Gunakan Bahasa Indonesia formal, profesional, natural, dan donor-ready. Gunakan kalimat aktif, hindari repetisi dan frasa AI generik ("program ini sangat penting", "memberikan dampak yang signifikan"). Gunakan paragraf utuh, heading, dan terminology program development yang tepat.

6. MODUL AI NARRATIVE GENERATOR (12 SECTIONS)
Hasilkan 12 bagian berikut:
1. Latar Belakang (Context → Situation → Evidence → Problem → Consequence → Gap → Opportunity → Rationale)
2. Permasalahan (Masalah utama, Penyebab langsung, Penyebab struktural, Dampak, Gap)
3. Tujuan (Tujuan Umum & Tujuan Khusus yang spesifik dan menjawab masalah)
4. Sasaran (Direct & indirect beneficiaries, kelompok prioritas, stakeholder, partner)
5. Output (Hasil langsung kegiatan: Activity → Output)
6. Outcome (Perubahan akibat adopsi/utilisasi output: Output + Adoption = Outcome)
7. Metodologi (Pendekatan, tahapan, metode, partisipasi, pendampingan, dokumentasi, QA)
8. Strategi Implementasi (Preparation → Mobilization → Implementation → Monitoring → Adaptation → Consolidation → Handover)
9. Keberlanjutan (Analisis 5+ dimensi: kelembagaan, finansial, kapasitas, sosial, lingkungan, kebijakan, ownership)
10. Risiko (Risk register: operational, financial, social, environmental, institutional, climate dengan Mitigasi & PIC)
11. Monitoring (Terhubung LFA: indikator, baseline, target, frekuensi, metode, sumber data, PIC)
12. Evaluasi (Pendekatan evaluasi: baseline, midline, endline, outcome assessment, beneficiary feedback)

7. PRIORITY RULE
Jika terdapat konflik:
User-provided verified data > Official database/regulatory data > Donor requirements > Program design logic > AI inference.
AI inference tidak boleh menggantikan fakta pengguna atau data resmi.

8. FINAL INSTRUCTION
Hasilkan output yang Specific, Logical, Evidence-aware, Measurable, Feasible, Budgetable, Traceable, Consistent, Donor-ready, dan Human-reviewable. Prioritaskan QUALITY > CONSISTENCY > TRACEABILITY > REALISM > COMPLETENESS > LENGTH.`;




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
      model: getAiModel(),
      system: SYSTEM,
      prompt,
      temperature: 0.4,
    });

    return response.toTextStreamResponse();
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
      model: getAiModel(),
      system: SYSTEM,
      prompt,
      temperature: 0.3,
    });

    return response.toTextStreamResponse();
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
      model: getAiModel(),
      system: SYSTEM,
      prompt,
      temperature: 0.3,
    });

    return response.toTextStreamResponse();
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
      model: getAiModel(),
      system: SYSTEM,
      prompt,
      temperature: 0.3,
    });

    return response.toTextStreamResponse();
  } catch (error) {
    handleError(error);
  }
}