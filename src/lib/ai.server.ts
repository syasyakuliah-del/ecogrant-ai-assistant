import { generateText } from "ai";
import { z } from "zod";
import { getAiModel, AI_MODEL } from "./ai-gateway.server";

export const ECOGRANT_PROMPT_VERSION = "ecogrant-master-2026-08-13";

type JsonRecord = Record<string, unknown>;

export const ContextSchema = z.object({
  proposalId: z.string().default(""),
  title: z.string().default(""),
  organization: z.string().default(""),
  organizationName: z.string().default(""),
  personInCharge: z.string().default(""),
  organizationType: z.string().default("NGO"),
  organizationRegNumber: z.string().default(""),
  location: z.string().default(""),
  projectLocation: z.string().default(""),
  city: z.string().default(""),
  cityOrRegency: z.string().default(""),
  province: z.string().default(""),
  category: z.string().default(""),
  mainProgramCategory: z.string().default(""),
  programSubcategory: z.string().default(""),
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

export const NarrativeInput = z.object({
  context: ContextSchema,
  sectionKey: z.string(),
  sectionLabel: z.string(),
  mode: z
    .enum(["generate", "rewrite", "shorten", "expand", "restructure", "donor"])
    .default("generate"),
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
export const ActivityInput = z.object({
  context: ContextSchema,
  narratives: z.array(z.object({ label: z.string(), content: z.string() })).default([]),
  outputs: z.array(z.string()).default([]),
});
export const ConsistencyInput = z.object({
  context: ContextSchema,
  narratives: z.array(z.object({ label: z.string(), content: z.string() })).default([]),
  lfaSummary: z.string().default(""),
  activities: z.array(z.string()).default([]),
  rabSummary: z.string().default(""),
  changedModule: z.string().default(""),
});
export const QualityReviewInput = ConsistencyInput.extend({ budgetTotal: z.number().default(0) });

export const StructuredAiOutputSchema = z.object({
  sectionType: z.string(),
  content: z.string(),
  assumptions: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  aiGenerated: z.literal(true).default(true),
});
export type StructuredAiOutput = z.infer<typeof StructuredAiOutputSchema>;

function handleError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("429"))
    throw new Error("Batas permintaan AI tercapai. Silakan coba 1 menit lagi.");
  if (message.includes("402"))
    throw new Error("Kuota AI habis. Silakan tambahkan kredit pada workspace.");
  throw new Error(`Permintaan AI gagal: ${message}`);
}

function contextBlock(c: z.infer<typeof ContextSchema>) {
  const organization = c.organizationName || c.organization;
  const location = [c.projectLocation || c.location, c.cityOrRegency || c.city, c.province]
    .filter(Boolean)
    .join(", ");
  const category = [c.mainProgramCategory || c.category, c.programSubcategory]
    .filter(Boolean)
    .join(" — ");
  return [
    `=== SINGLE SOURCE OF TRUTH: PROPOSAL ===`,
    `proposal.id: ${c.proposalId || "belum tersedia"}`,
    `proposal.title: ${c.title || "belum tersedia"}`,
    `proposal.organization_name: ${organization || "belum tersedia"}`,
    `proposal.person_in_charge: ${c.personInCharge || "belum tersedia"}`,
    `proposal.project_location: ${location || "belum tersedia"}`,
    `proposal.province: ${c.province || "belum tersedia"}`,
    `proposal.city_or_regency: ${c.cityOrRegency || c.city || "belum tersedia"}`,
    `proposal.main_program_category: ${category || "belum tersedia"}`,
    `proposal.duration_months: ${c.durationMonths || "belum tersedia"}`,
    `proposal.period: ${[c.startDate, c.endDate].filter(Boolean).join(" s.d ") || "belum tersedia"}`,
    `proposal.grant_amount: ${c.grantAmount > 0 ? `${c.currency} ${c.grantAmount.toLocaleString("id-ID")}` : "belum tersedia"}`,
    `proposal.donor: ${c.donorName || "belum tersedia"}`,
    c.donorPriorities.length
      ? `donor.priorities: ${c.donorPriorities.join("; ")}`
      : "donor.priorities: belum tersedia",
    c.donorRequirements.length
      ? `donor.requirements: ${c.donorRequirements.join("; ")}`
      : "donor.requirements: belum tersedia",
    `proposal.idea_summary: ${c.ideaSummary || "belum tersedia"}`,
    c.existingNarratives.length
      ? `\n=== EXISTING NARRATIVES ===\n${c.existingNarratives.map((n) => `[${n.label}]\n${n.content}`).join("\n\n")}`
      : "",
    c.lfaSummary ? `\n=== LOGICAL FRAMEWORK ===\n${c.lfaSummary}` : "",
    c.rabSummary ? `\n=== RAB SUMMARY ===\n${c.rabSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const MASTER_SYSTEM = `MASTER AI PROMPT — ECOGRANT AI
Anda adalah EcoGrant AI Proposal Intelligence Engine: Senior Grant Proposal Writer, Grant Strategist, Program Design Specialist, LFA Specialist, MEAL Specialist, Environmental and Social Program Specialist, Budget Planning Specialist, Grant Compliance Assistant, dan Proposal Quality Assurance Reviewer.
Tugas utama Anda adalah membantu pengguna mengubah informasi dasar dan gagasan program menjadi proposal hibah yang logis, evidence-informed, terstruktur, realistis, dapat diimplementasikan, measurable, konsisten antara narasi-LFA-activity-indicator-target-budget, sesuai konteks lokasi dan kategori program, sesuai persyaratan donor bila tersedia, dapat ditelusuri ke input pengguna, dan tidak mengarang fakta, angka, regulasi, harga, atau data lapangan.
EcoGrant AI mencakup kehutanan, lingkungan, perubahan iklim, konservasi, biodiversitas, pemberdayaan masyarakat, penghidupan berkelanjutan, pembangunan sosial, tata kelola sumber daya alam, dan program berbasis masyarakat.
SINGLE SOURCE OF TRUTH: Gunakan hanya input pengguna, data proposal, data donor, database kegiatan, SBM, SBU, dan sumber/regulasi eksplisit yang diberikan. Jika informasi tidak tersedia, tulis "belum tersedia", "perlu dikonfirmasi", "data perlu dilengkapi", atau label "ASSUMPTION". Jika membutuhkan data eksternal, tandai "DATA_VERIFICATION_REQUIRED".
ANTI-HALLUCINATION: Dilarang membuat statistik, nama desa, jumlah penerima manfaat, luas wilayah, persentase, angka kemiskinan, angka emisi, harga barang, tarif SBM/SBU, nomor regulasi, nama donor, deadline donor, baseline, target numerik, atau klaim dampak jika tidak tersedia atau tidak terverifikasi.
CARA BERPIKIR INTERNAL: Extract → Classify → Diagnose → Design Problem → Intervention → Activity → Output → Outcome → Goal/Impact → Validate → Generate.
GAYA PENULISAN: Bahasa Indonesia formal, profesional, natural, donor-ready. Bukan akademik kaku, bukan promosi, bukan generik. Gunakan kalimat aktif, heading, bullet bila membantu, terminologi program development bila relevan.
NARRATIVE: Latar Belakang, Permasalahan, Tujuan, Sasaran, Output, Outcome, Metodologi, Strategi Implementasi, Keberlanjutan, Risiko, Monitoring, Evaluasi. Jangan membuat angka, baseline, target, jumlah penerima manfaat, atau klaim baru.
EXECUTIVE SUMMARY: Dibuat dari proposal, narasi, LFA, activity, dan RAB tersedia. Jangan copy-paste latar belakang atau memperkenalkan fakta/aktivitas/angka baru.
LFA: Berdasarkan narasi. Hierarchy GOAL → OUTCOME → OUTPUT → ACTIVITY. Baseline/Target hanya isi jika tersedia; jika tidak gunakan "TBD" atau "To be established during baseline assessment".
RAB: Turunkan dari LFA, activity, durasi, lokasi, nilai hibah, SBM, SBU. AI adalah budget recommendation engine, bukan sumber harga mandiri. Jangan mengarang nilai SBM/SBU. Formula: Subtotal = Volume × Frekuensi × Harga Satuan; PPN = Subtotal × Tarif PPN; Grand Total = Σ Subtotal + Σ PPN. Status validasi: VALID, VALID_WITH_WARNING, ABOVE_STANDARD, STANDARD_NOT_FOUND, MISSING_SOURCE, DUPLICATE_SUSPECTED, MISSING_ACTIVITY, REVIEW_REQUIRED.
CROSS-MODULE SYNCHRONIZATION: Laporkan inkonsistensi dan change impact; jangan diam-diam memperbaiki.
HUMAN REVIEW: Hasil adalah AI_DRAFT atau AI_RECOMMENDATION. Jangan menyatakan proposal pasti lolos donor atau RAB pasti sesuai regulasi.
PRIORITY RULE: User-provided verified data > Official database/regulatory data > Donor requirements > Program design logic > AI inference.`;

const JSON_ENVELOPE_INSTRUCTION = `Kembalikan HANYA JSON valid tanpa markdown fence. Gunakan envelope: {"status":"success|warning|needs_input|error","module":"","proposal_id":"","generated_at":"ISO-8601","prompt_version":"${ECOGRANT_PROMPT_VERSION}","model":"${AI_MODEL}","content":{},"warnings":[],"missing_information":[],"assumptions":[],"validation":{},"source_context":[]}`;
const MODE_INSTRUCTION: Record<string, string> = {
  generate: "Susun isi bagian tersebut dari awal berdasarkan konteks proposal.",
  rewrite:
    "Tulis ulang naskah berikut menjadi lebih formal dan terstruktur tanpa mengubah substansi.",
  shorten: "Ringkas naskah berikut menjadi lebih padat namun tetap lengkap secara substansi.",
  expand:
    "Perluas naskah berikut dengan penjelasan yang lebih rinci dan argumentatif tanpa menambah fakta baru.",
  restructure:
    "Perbaiki struktur dan alur logika naskah berikut sehingga runtut dan mudah dinilai.",
  donor:
    "Sesuaikan naskah berikut agar selaras dengan prioritas dan persyaratan donor yang tersedia. Jangan membuat persyaratan donor baru.",
};

function extractJson(text: string): JsonRecord {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as JsonRecord;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as JsonRecord;
    throw new Error("AI tidak mengembalikan JSON valid.");
  }
}
async function generateJson(prompt: string, temperature = 0.3): Promise<JsonRecord> {
  const response = await generateText({
    model: getAiModel(),
    system: MASTER_SYSTEM,
    prompt: `${prompt}\n\n${JSON_ENVELOPE_INSTRUCTION}`,
    temperature,
  });
  return extractJson(response.text);
}
function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}
function envelopeText(json: JsonRecord, fallbackKey = "text") {
  const content = json["content"];
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const record = content as JsonRecord;
    const direct =
      record[fallbackKey] ?? record["content"] ?? record["narrative"] ?? record["summary"];
    if (typeof direct === "string") return direct;
  }
  return "";
}

export interface NarrativeResponse {
  content: string;
  assumptions: string[];
  missingInformation: string[];
  warnings: string[];
}

export interface SummaryResponse {
  content: string;
}

export interface LfaRowResult {
  row_type: string;
  goal?: string | undefined;
  outcome?: string | undefined;
  output?: string | undefined;
  activity?: string | undefined;
  indicator?: string | undefined;
  baseline?: string | undefined;
  target?: string | undefined;
  means_of_verification?: string | undefined;
  assumption?: string | undefined;
}

export interface LfaResponse {
  rows: LfaRowResult[];
}

export interface BudgetItemResult {
  category?: string | undefined;
  activity_name?: string | undefined;
  description?: string | undefined;
  standard_source?: string | undefined;
  standard_code?: string | undefined;
  volume?: number | undefined;
  unit?: string | undefined;
  frequency?: number | undefined;
  unit_price?: number | undefined;
  validation_status?: string | undefined;
  notes?: string | undefined;
}

export interface BudgetResponse {
  items: BudgetItemResult[];
}

export interface ActivityResult {
  activity_id?: string | undefined;
  output_id?: string | undefined;
  activity_name?: string | undefined;
  description?: string | undefined;
  location?: string | undefined;
  duration?: string | undefined;
  frequency?: string | undefined;
  participants?: string | undefined;
  responsible_party?: string | undefined;
  expected_result?: string | undefined;
}

export interface ActivitiesResponse {
  activities: ActivityResult[];
}

export interface ConsistencyResponse {
  status: string;
  issues: string[];
  warnings: string[];
}

export interface QualityReviewResponse {
  score: number;
  strengths: string[];
  weaknesses: string[];
  priorityFixes: string[];
}

export async function runNarrative(
  data: z.infer<typeof NarrativeInput>,
): Promise<NarrativeResponse> {
  try {
    const parsed = NarrativeInput.parse(data);
    const instruction = MODE_INSTRUCTION[parsed.mode] ?? MODE_INSTRUCTION["generate"];
    const prompt = `${contextBlock(parsed.context)}\n\nMODULE: GENERATE_SECTION\nSection key: ${parsed.sectionKey}\nSection label: ${parsed.sectionLabel}\nMode instruction: ${instruction}\n${parsed.currentContent ? `\nNaskah saat ini:\n${parsed.currentContent}` : ""}\n\nOutput content: {"section_key":"${parsed.sectionKey}","section_label":"${parsed.sectionLabel}","text":"..."}. Tulis hanya bagian ini. Jangan membuat angka, baseline, target, penerima manfaat, harga, atau regulasi yang tidak tersedia.`;
    const json = await generateJson(prompt, 0.4);
    return {
      content: envelopeText(json),
      assumptions: stringArray(json["assumptions"]),
      missingInformation: stringArray(json["missing_information"]),
      warnings: stringArray(json["warnings"]),
    };
  } catch (error) {
    handleError(error);
  }
}

export async function runSummary(data: z.infer<typeof SummaryInput>): Promise<SummaryResponse> {
  try {
    const parsed = SummaryInput.parse(data);
    const prompt = `${contextBlock({ ...parsed.context, existingNarratives: parsed.narratives })}\n\nMODULE: GENERATE_EXECUTIVE_SUMMARY\nMata anggaran total: ${parsed.budgetTotal > 0 ? `${parsed.context.currency} ${parsed.budgetTotal.toLocaleString("id-ID")}` : "belum tersedia"}\nRingkasan LFA: ${parsed.lfaSummary || "belum tersedia"}\nMaksimal ${parsed.maxWords} kata. content harus {"summary":"..."}. Jangan memperkenalkan fakta baru.`;
    const json = await generateJson(prompt, 0.3);
    return { content: envelopeText(json, "summary") };
  } catch (error) {
    handleError(error);
  }
}

export async function runLfa(data: z.infer<typeof LfaInput>): Promise<LfaResponse> {
  try {
    const parsed = LfaInput.parse(data);
    const prompt = `${contextBlock({ ...parsed.context, existingNarratives: parsed.narratives })}\n\nMODULE: GENERATE_LFA\nHasilkan content.rows array dengan row_type, goal, outcome, output, activity, indicator, baseline, target, means_of_verification, assumption. Gunakan TBD jika baseline/target tidak tersedia. Pastikan GOAL → OUTCOME → OUTPUT → ACTIVITY.`;
    const json = await generateJson(prompt, 0.3);
    const content = (json["content"] ?? {}) as JsonRecord;
    const rawRows = Array.isArray(content["rows"]) ? content["rows"] : [];
    const rows: LfaRowResult[] = rawRows.map((r: Record<string, unknown>) => ({
      row_type: String(r.row_type || "activity"),
      goal: r.goal ? String(r.goal) : undefined,
      outcome: r.outcome ? String(r.outcome) : undefined,
      output: r.output ? String(r.output) : undefined,
      activity: r.activity ? String(r.activity) : undefined,
      indicator: r.indicator ? String(r.indicator) : undefined,
      baseline: r.baseline ? String(r.baseline) : undefined,
      target: r.target ? String(r.target) : undefined,
      means_of_verification: r.means_of_verification ? String(r.means_of_verification) : undefined,
      assumption: r.assumption ? String(r.assumption) : undefined,
    }));
    return { rows };
  } catch (error) {
    handleError(error);
  }
}

export async function runBudget(data: z.infer<typeof BudgetInput>): Promise<BudgetResponse> {
  try {
    const parsed = BudgetInput.parse(data);
    const standardsText = parsed.standards
      .map(
        (s) =>
          `[${s.source}] ${s.code} | ${s.category} | ${s.description} | ${s.unit} | ${parsed.context.currency} ${s.price.toLocaleString("id-ID")}`,
      )
      .join("\n");
    const prompt = `${contextBlock(parsed.context)}\n\nMODULE: GENERATE_RAB\nActivities:\n${parsed.activities.map((a, i) => `${i + 1}. ${a}`).join("\n") || "belum tersedia"}\n\nReferensi SBM/SBU:\n${standardsText || "DATA_NOT_AVAILABLE"}\n\ncontent.items array: category, activity_name, description, standard_source, standard_code, volume, unit, frequency, unit_price, validation_status, notes. Jangan membuat harga jika tidak berasal dari referensi. Jika standar tidak cocok, unit_price 0 dan validation_status STANDARD_NOT_FOUND/MISSING_SOURCE.`;
    const json = await generateJson(prompt, 0.3);
    const content = (json["content"] ?? {}) as JsonRecord;
    const rawItems = Array.isArray(content["items"]) ? content["items"] : [];
    const items: BudgetItemResult[] = rawItems.map((item: Record<string, unknown>) => ({
      category: item.category ? String(item.category) : undefined,
      activity_name: item.activity_name ? String(item.activity_name) : undefined,
      description: item.description ? String(item.description) : undefined,
      standard_source: item.standard_source ? String(item.standard_source) : undefined,
      standard_code: item.standard_code ? String(item.standard_code) : undefined,
      volume: typeof item.volume === "number" ? item.volume : 1,
      unit: item.unit ? String(item.unit) : undefined,
      frequency: typeof item.frequency === "number" ? item.frequency : 1,
      unit_price: typeof item.unit_price === "number" ? item.unit_price : 0,
      validation_status: item.validation_status ? String(item.validation_status) : undefined,
      notes: item.notes ? String(item.notes) : undefined,
    }));
    return { items };
  } catch (error) {
    handleError(error);
  }
}

export async function runActivities(
  data: z.infer<typeof ActivityInput>,
): Promise<ActivitiesResponse> {
  try {
    const parsed = ActivityInput.parse(data);
    const prompt = `${contextBlock({ ...parsed.context, existingNarratives: parsed.narratives })}\n\nMODULE: GENERATE_ACTIVITY\nOutputs:\n${parsed.outputs.map((o, i) => `${i + 1}. ${o}`).join("\n") || "belum tersedia"}\ncontent.activities fields: activity_id, output_id, activity_name, description, location, duration, frequency, participants, responsible_party, expected_result. Jangan membuat activity tanpa hubungan output.`;
    const json = await generateJson(prompt, 0.3);
    const rawActs = ((json["content"] as JsonRecord | undefined)?.["activities"] ?? []) as Record<
      string,
      unknown
    >[];
    const activities: ActivityResult[] = rawActs.map((a: Record<string, unknown>) => ({
      activity_id: a.activity_id ? String(a.activity_id) : undefined,
      output_id: a.output_id ? String(a.output_id) : undefined,
      activity_name: a.activity_name ? String(a.activity_name) : undefined,
      description: a.description ? String(a.description) : undefined,
      location: a.location ? String(a.location) : undefined,
      duration: a.duration ? String(a.duration) : undefined,
      frequency: a.frequency ? String(a.frequency) : undefined,
      participants: a.participants ? String(a.participants) : undefined,
      responsible_party: a.responsible_party ? String(a.responsible_party) : undefined,
      expected_result: a.expected_result ? String(a.expected_result) : undefined,
    }));
    return { activities };
  } catch (error) {
    handleError(error);
  }
}

export async function runConsistencyCheck(
  data: z.infer<typeof ConsistencyInput>,
): Promise<ConsistencyResponse> {
  try {
    const parsed = ConsistencyInput.parse(data);
    const prompt = `${contextBlock({ ...parsed.context, existingNarratives: parsed.narratives, lfaSummary: parsed.lfaSummary, rabSummary: parsed.rabSummary })}\n\nMODULE: CHECK_CONSISTENCY\nChanged module: ${parsed.changedModule || "belum tersedia"}\nActivities: ${parsed.activities.join("; ") || "belum tersedia"}\nPeriksa consistency dan kembalikan content.consistency_status, issues, change_impact_analysis.`;
    const json = await generateJson(prompt, 0.2);
    return {
      status: String(json["status"] || "success"),
      issues: stringArray(json["issues"]),
      warnings: stringArray(json["warnings"]),
    };
  } catch (error) {
    handleError(error);
  }
}

export async function runQualityReview(
  data: z.infer<typeof QualityReviewInput>,
): Promise<QualityReviewResponse> {
  try {
    const parsed = QualityReviewInput.parse(data);
    const prompt = `${contextBlock({ ...parsed.context, existingNarratives: parsed.narratives, lfaSummary: parsed.lfaSummary, rabSummary: parsed.rabSummary })}\n\nMODULE: QUALITY_REVIEW\nBudget total: ${parsed.budgetTotal > 0 ? parsed.budgetTotal : "belum tersedia"}\nBerikan skor 0-100 sesuai bobot master prompt. content: score, breakdown, strengths, weaknesses, priority_fixes. Jangan menyatakan peluang pendanaan pasti.`;
    const json = await generateJson(prompt, 0.2);
    const content = (json["content"] ?? {}) as JsonRecord;
    return {
      score: typeof content["score"] === "number" ? content["score"] : 0,
      strengths: stringArray(content["strengths"]),
      weaknesses: stringArray(content["weaknesses"]),
      priorityFixes: stringArray(content["priority_fixes"]),
    };
  } catch (error) {
    handleError(error);
  }
}
