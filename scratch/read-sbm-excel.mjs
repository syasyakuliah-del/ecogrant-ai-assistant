import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const filePath = path.resolve('public', 'Data SBM.xlsx');
if (!fs.existsSync(filePath)) {
  console.error("File not found:", filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
console.log("Sheet names:", workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n--- Sheet: ${sheetName} ---`);
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total rows: ${jsonData.length}`);
  console.log("First 15 rows:");
  jsonData.slice(0, 15).forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`, JSON.stringify(row));
  });
}
