import fs from 'fs';
import path from 'path';

console.log("==========================================");
console.log("VERIFYING SBM DATA INTEGRATION (1,694 DATA)");
console.log("==========================================");

// 1. Verify sbm_master.json
const jsonPath = path.resolve('src', 'data', 'sbm_master.json');
if (!fs.existsSync(jsonPath)) {
  console.error("❌ ERROR: src/data/sbm_master.json does not exist!");
  process.exit(1);
}

const masterData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
console.log(`✅ Master Data JSON loaded: ${masterData.length} records.`);

if (masterData.length !== 1694) {
  console.error(`❌ Unexpected record count: ${masterData.length} (Expected: 1694)`);
  process.exit(1);
}

// Check categories
const categories = new Set(masterData.map(d => d.category));
console.log(`✅ Categories found (${categories.size}):`, Array.from(categories));

// Check region codes count
const regions = new Set(masterData.map(d => d.region_code));
console.log(`✅ Unique Region Codes found (${regions.size}).`);

// Check sample data items
const sampleItem1 = masterData[0];
const sampleItem100 = masterData[99];
const sampleItem1694 = masterData[1693];

console.log("\n--- Sample Items ---");
console.log("First item (index 0):", sampleItem1);
console.log("Item 100 (index 99):", sampleItem100);
console.log("Last item (index 1693):", sampleItem1694);

// 2. Verify SQL Seed File
const sqlPath = path.resolve('supabase', 'seed_all_sbm_1694.sql');
if (!fs.existsSync(sqlPath)) {
  console.error("❌ ERROR: supabase/seed_all_sbm_1694.sql does not exist!");
  process.exit(1);
}
const sqlContent = fs.readFileSync(sqlPath, 'utf8');
const sqlLinesCount = sqlContent.split('\n').length;
console.log(`\n✅ SQL Seed File loaded: ${sqlLinesCount} lines, ${sqlContent.length} bytes.`);

// 3. Verify admin.sbm.tsx
const sbmRoutePath = path.resolve('src', 'routes', '_authenticated.admin.sbm.tsx');
const sbmRouteContent = fs.readFileSync(sbmRoutePath, 'utf8');
if (sbmRouteContent.includes('sbmMasterData') && sbmRouteContent.includes('range(')) {
  console.log("✅ Admin SBM route (admin.sbm.tsx) properly includes sbmMasterData and paginated range fetching.");
} else {
  console.error("❌ ERROR: Admin SBM route missing sbmMasterData or range fetching!");
  process.exit(1);
}

// 4. Verify StepBudget.tsx
const stepBudgetPath = path.resolve('src', 'components', 'wizard', 'StepBudget.tsx');
const stepBudgetContent = fs.readFileSync(stepBudgetPath, 'utf8');
if (stepBudgetContent.includes('sbmMasterData')) {
  console.log("✅ StepBudget.tsx properly includes sbmMasterData fallback.");
} else {
  console.error("❌ ERROR: StepBudget.tsx missing sbmMasterData!");
  process.exit(1);
}

console.log("\n==========================================");
console.log("🎉 ALL VERIFICATIONS PASSED SUCCESSFULLY!");
console.log("==========================================");
