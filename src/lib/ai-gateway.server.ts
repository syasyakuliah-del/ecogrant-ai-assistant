import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function getAiModel(overrideModel?: string) {
  const geminiKey =
    process.env["GEMINI_API_KEY"] ||
    process.env["GOOGLE_GENERATIVE_AI_API_KEY"] ||
    process.env["GOOGLE_API_KEY"];

  if (geminiKey) {
    const google = createGoogleGenerativeAI({
      apiKey: geminiKey,
    });
    return google(overrideModel || "gemini-3.6-flash");
  }

  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) {
    const gateway = createOpenAICompatible({
      name: "lovable-ai-gateway",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": lovableKey },
    });
    return gateway(overrideModel || "google/gemini-3.6-flash");
  }

  throw new Error(
    "Layanan AI belum dikonfigurasi. Harap isi GEMINI_API_KEY atau LOVABLE_API_KEY di file .env."
  );
}

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

export const AI_MODEL = "gemini-3.6-flash";