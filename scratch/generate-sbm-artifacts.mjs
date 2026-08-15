import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const filePath = path.resolve('public', 'Data SBM.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("Generating SBM artifacts from Data SBM.xlsx...");

const cleanRows = [];

rawData.forEach((row, idx) => {
  if (idx === 0) return; // Header

  if (row.length <= 3) return; // Skip incomplete

  let year = 2026;
  let version = "1.0";
  const rawThnVer = String(row[0] || "").trim();
  if (rawThnVer) {
    const parts = rawThnVer.split("/");
    if (parts[0]) year = Number(parts[0].replace(/\D/g, "")) || 2026;
    if (parts[1]) version = parts[1].trim() || "1.0";
  }

  const code = String(row[1] || "").trim().toUpperCase();
  const category = String(row[2] || "").trim();

  let description = "";
  let unit = "";
  let price = 0;
  let region_code = "NASIONAL";
  let regulation_source = "PMK 32/2025 Lamp I";

  if (row.length === 8) {
    description = String(row[3] || "").trim();
    unit = String(row[4] || "").trim();
    price = Number(String(row[5]).replace(/[^0-9.-]+/g, "")) || 0;
    region_code = String(row[6] || "NASIONAL").trim().toUpperCase();
    regulation_source = String(row[7] || "PMK 32/2025 Lamp I").trim();
  } else if (row.length > 8) {
    const last4 = row.slice(row.length - 4);
    description = row.slice(3, row.length - 4).join(", ").trim();
    unit = String(last4[0] || "").trim();
    price = Number(String(last4[1]).replace(/[^0-9.-]+/g, "")) || 0;
    region_code = String(last4[2] || "NASIONAL").trim().toUpperCase();
    regulation_source = String(last4[3] || "PMK 32/2025 Lamp I").trim();
  } else {
    description = String(row[3] || "").trim();
    unit = String(row[4] || "").trim();
    price = Number(String(row[5]).replace(/[^0-9.-]+/g, "")) || 0;
    region_code = String(row[6] || "NASIONAL").trim().toUpperCase();
  }

  if (!code || !description) return;

  cleanRows.push({
    id: `sbm-excel-${idx}`,
    year,
    version,
    code,
    category,
    description,
    unit,
    price,
    region_code,
    regulation_source,
    is_active: true,
  });
});

console.log(`Extracted ${cleanRows.length} clean SBM items.`);

// 1. Save src/data/sbm_master.json
const jsonDir = path.resolve('src', 'data');
if (!fs.existsSync(jsonDir)) {
  fs.mkdirSync(jsonDir, { recursive: true });
}
const jsonPath = path.join(jsonDir, 'sbm_master.json');
fs.writeFileSync(jsonPath, JSON.stringify(cleanRows, null, 2), 'utf8');
console.log(`✅ Saved ${cleanRows.length} items to ${jsonPath}`);

// 2. Save supabase/seed_all_sbm_1694.sql
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

const sqlLines = [];
sqlLines.push('-- SQL Seed File: 1,694 SBM Master Items from Data SBM.xlsx');
sqlLines.push('-- Run this script in Supabase Dashboard -> SQL Editor\n');
sqlLines.push('INSERT INTO public.sbm (year, version, code, category, description, unit, price, region_code, regulation_source, is_active)');
sqlLines.push('VALUES');

const valueRows = cleanRows.map((r) => {
  return `  (${r.year}, ${escapeSql(r.version)}, ${escapeSql(r.code)}, ${escapeSql(r.category)}, ${escapeSql(r.description)}, ${escapeSql(r.unit)}, ${r.price}, ${escapeSql(r.region_code)}, ${escapeSql(r.regulation_source)}, true)`;
});

sqlLines.push(valueRows.join(',\n') + '\nON CONFLICT (year, version, code, region_code) DO UPDATE SET');
sqlLines.push('  category = EXCLUDED.category,');
sqlLines.push('  description = EXCLUDED.description,');
sqlLines.push('  unit = EXCLUDED.unit,');
sqlLines.push('  price = EXCLUDED.price,');
sqlLines.push('  regulation_source = EXCLUDED.regulation_source,');
sqlLines.push('  is_active = EXCLUDED.is_active,');
sqlLines.push('  updated_at = now();');

const sqlPath = path.resolve('supabase', 'seed_all_sbm_1694.sql');
fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf8');
console.log(`✅ Saved SQL seed file to ${sqlPath}`);
