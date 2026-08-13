import {
  validateProposalCompleteness,
  validateUniqueStandardsConstraint,
} from "../src/lib/business-validation";
import { calculateRowSubtotal, calculateRowTax, calculateRowTotal } from "../src/lib/budget";
import { calculateDonorMatchScore } from "../src/lib/donor-matching";
import { StructuredAiOutputSchema } from "../src/lib/ai.server";
import { dryRunValidateImport } from "../src/lib/import-processor";
import { checkRateLimit, RATE_LIMIT_RULES } from "../src/lib/rate-limit";
import { sanitizeFilename, validateFile } from "../src/lib/file-upload";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runUnitAndIntegrationTests() {
  console.log("\n=======================================================");
  console.log("🚀 STARTING UNIT & INTEGRATION TEST SUITE (PRD 48.1 - 48.2)");
  console.log("=======================================================\n");

  // 1. RAB Formulas
  console.log("--- 1. Testing RAB Formulas ---");
  const subtotal = calculateRowSubtotal(5, 2, 100000);
  assert(
    subtotal === 1000000,
    `Subtotal volume(5) * freq(2) * price(100k) should equal 1,000,000. Got: ${subtotal}`,
  );

  const tax = calculateRowTax(1000000, 0.11);
  assert(tax === 110000, `Tax 11% on 1,000,000 should equal 110,000. Got: ${tax}`);

  const total = calculateRowTotal(1000000, 110000);
  assert(total === 1110000, `Total subtotal + tax should equal 1,110,000. Got: ${total}`);

  // 2. Donor Matching Score
  console.log("\n--- 2. Testing Donor Matching Score ---");
  const dummyProposal = {
    title: "Konservasi Hutan Mangrove",
    grant_amount: 150000000,
    category: "Restorasi Hutan",
    province: "Kalimantan Timur",
  };
  const dummyDonor = {
    name: "Donor Konservasi Global",
    min_grant: 50000000,
    max_grant: 500000000,
    category: "Lingkungan",
    priorities: ["Restorasi Hutan", "Kalimantan"],
  };
  const scoreResult = calculateDonorMatchScore(dummyProposal as never, dummyDonor as never);
  assert(scoreResult.score >= 70, `Donor match score should be >= 70. Got: ${scoreResult.score}`);

  // 3. AI Structured Output Schema
  console.log("\n--- 3. Testing AI Output Schema ---");
  const validAiPayload = {
    sectionType: "latar_belakang",
    content: "Draf narasi latar belakang resmi...",
    assumptions: ["Masyarakat mendukung"],
    missingInformation: [],
    warnings: [],
    aiGenerated: true,
  };
  const parsed = StructuredAiOutputSchema.safeParse(validAiPayload);
  assert(parsed.success, "Structured AI output should parse successfully with Zod schema.");

  // 4. Import Parser & Dry-run
  console.log("\n--- 4. Testing Import Parser & Dry-Run ---");
  const dummySbmRows = [
    { Kode: "SBM-001", Tahun: 2026, Versi: "1.0", Harga: 100000, Wilayah: "JAKARTA" },
    { Kode: "", Tahun: 2026, Versi: "1.0", Harga: -5000, Wilayah: "JAKARTA" }, // invalid row
  ];
  const dryRun = dryRunValidateImport("sbm", dummySbmRows);
  assert(dryRun.totalRows === 2, `Dry run total rows should equal 2. Got: ${dryRun.totalRows}`);
  assert(
    dryRun.validRowsCount === 1,
    `Dry run valid rows count should equal 1. Got: ${dryRun.validRowsCount}`,
  );
  assert(
    dryRun.invalidRowsCount === 1,
    `Dry run invalid rows count should equal 1. Got: ${dryRun.invalidRowsCount}`,
  );

  // 5. Business Validation Rules
  console.log("\n--- 5. Testing Business Validation Rules ---");
  const incompleteResult = validateProposalCompleteness(
    { title: "", grant_amount: 100000 },
    [],
    [],
    [],
    null,
    false,
  );
  assert(!incompleteResult.canSubmit, "Incomplete proposal should fail submission validation.");

  const constraintTest = validateUniqueStandardsConstraint(2026, "1.0", "SBM-001", "JAKARTA", [
    { year: 2026, version: "1.0", code: "SBM-001", region_code: "JAKARTA" },
  ]);
  assert(
    constraintTest.isDuplicate,
    "Duplicate SBM constraint check should detect existing combination.",
  );

  // 6. Rate Limiter Framework
  console.log("\n--- 6. Testing Rate Limiting ---");
  const testKey = `unit_test_${Date.now()}`;
  const rule = { maxRequests: 2, windowMs: 60000 };
  const res1 = checkRateLimit(testKey, rule);
  assert(res1.allowed, "First rate limit request should be allowed.");
  const res2 = checkRateLimit(testKey, rule);
  assert(res2.allowed, "Second rate limit request should be allowed.");
  const res3 = checkRateLimit(testKey, rule);
  assert(!res3.allowed, "Third rate limit request should be BLOCKED.");

  // 7. File Validation & Sanitization
  console.log("\n--- 7. Testing File Upload Validation ---");
  const cleanName = sanitizeFilename("Laporan Kebutuhan (2026) @Final!.pdf");
  assert(
    !cleanName.includes("(") && !cleanName.includes("@"),
    `Sanitized filename should remove special characters. Got: ${cleanName}`,
  );

  console.log("\n=======================================================");
  console.log("🎉 ALL UNIT & INTEGRATION TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

runUnitAndIntegrationTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
