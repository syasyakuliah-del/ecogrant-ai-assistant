import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('public', 'Data SBM.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("Checking shifted rows...");

const cleanRows = [];

rawData.forEach((row, idx) => {
  if (idx === 0) return; // Header

  // If row is short (like row 1294 with length <= 3)
  if (row.length <= 3) {
    console.log(`Row ${idx + 1} SKIPPED (incomplete):`, JSON.stringify(row));
    return;
  }

  // Normal row has 8 columns:
  // 0: Thn/Ver
  // 1: Kode
  // 2: Kategori
  // 3: Uraian
  // 4: Satuan
  // 5: Harga
  // 6: Wilayah
  // 7: Sumber Regulasi

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
  let regulation_source = "PMK 32/2025";

  if (row.length === 8) {
    description = String(row[3] || "").trim();
    unit = String(row[4] || "").trim();
    price = Number(String(row[5]).replace(/[^0-9.-]+/g, "")) || 0;
    region_code = String(row[6] || "NASIONAL").trim().toUpperCase();
    regulation_source = String(row[7] || "").trim();
  } else if (row.length > 8) {
    console.log(`Row ${idx + 1} HAS SHIFTED COLUMNS (len=${row.length}):`, JSON.stringify(row));
    // Reconstruct description: combine row[3]..row[row.length - 5]
    // Last 4 elements are: unit, price, region_code, regulation_source
    const last4 = row.slice(row.length - 4);
    description = row.slice(3, row.length - 4).join(", ").trim();
    unit = String(last4[0] || "").trim();
    price = Number(String(last4[1]).replace(/[^0-9.-]+/g, "")) || 0;
    region_code = String(last4[2] || "NASIONAL").trim().toUpperCase();
    regulation_source = String(last4[3] || "").trim();
    console.log(`  -> Reconstructed Row ${idx + 1}:`, { code, category, description, unit, price, region_code, regulation_source });
  } else {
    // len < 8
    description = String(row[3] || "").trim();
    unit = String(row[4] || "").trim();
    price = Number(String(row[5]).replace(/[^0-9.-]+/g, "")) || 0;
    region_code = String(row[6] || "NASIONAL").trim().toUpperCase();
  }

  cleanRows.push({
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

console.log("\nTotal clean rows extracted:", cleanRows.length);
