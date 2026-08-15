import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env manual
function loadEnv() {
  const envFiles = ['.env', '.env.local'];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          process.env[k] = v;
        }
      }
    }
  }
}
loadEnv();

const filePath = path.resolve('public', 'Data SBM.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rawData = XLSX.utils.sheet_to_json(sheet);

console.log("Total raw rows read:", rawData.length);

const categories = new Set();
const regionCodes = new Set();
let invalidCount = 0;
const duplicates = [];
const seenKeys = new Set();

const parsedItems = [];

rawData.forEach((r, idx) => {
  const rawThnVer = String(r["Thn/Ver"] || "").trim();
  let year = 2026;
  let version = "1.0";
  if (rawThnVer) {
    const parts = rawThnVer.split("/");
    if (parts[0]) year = Number(parts[0].replace(/\D/g, "")) || 2026;
    if (parts[1]) version = parts[1].trim() || "1.0";
  }

  const code = String(r["Kode"] || "").trim().toUpperCase();
  const category = String(r["Kategori"] || "").trim();
  const description = String(r["Uraian"] || "").trim();
  const unit = String(r["Satuan"] || "").trim();
  let price = r["Harga"];
  if (typeof price === "string") {
    price = Number(price.replace(/[^0-9.-]+/g, "")) || 0;
  } else {
    price = Number(price) || 0;
  }
  const region_code = String(r["Wilayah"] || "NASIONAL").trim().toUpperCase();
  const regulation_source = String(r["Sumber Regulasi"] || "PMK 32/2025 Lamp I").trim();

  if (!code || !description) {
    console.log(`Row ${idx + 2} INVALID:`, { code, category, description });
    invalidCount++;
    return;
  }

  categories.add(category);
  regionCodes.add(region_code);

  const key = `${year}-${version}-${code}-${region_code}`;
  if (seenKeys.has(key)) {
    duplicates.push({ idx: idx + 2, key, code, description });
  } else {
    seenKeys.add(key);
  }

  parsedItems.push({
    year,
    version,
    code,
    category,
    description,
    unit,
    price,
    region_code,
    regulation_source,
    is_active: true
  });
});

console.log("Valid parsed items:", parsedItems.length);
console.log("Invalid rows count:", invalidCount);
console.log("Duplicates count:", duplicates.length);
if (duplicates.length > 0) {
  console.log("Sample duplicates:", duplicates.slice(0, 10));
}
console.log("Categories found:", Array.from(categories));
console.log("Region codes sample (total unique):", regionCodes.size, Array.from(regionCodes).slice(0, 10));

// Check Supabase count
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (url && key) {
  const sb = createClient(url, key);
  const { count, error } = await sb.from("sbm").select("*", { count: "exact", head: true }).is("deleted_at", null);
  console.log("Current SBM rows in DB:", count, "Error:", error?.message);
} else {
  console.log("No Supabase env vars found");
}
