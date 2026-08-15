import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('public', 'Data SBM.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

rawData.forEach((row, idx) => {
  if (idx === 0) return;
  const region = String(row[6] || "").trim();
  if (region === "450000" || !isNaN(Number(region)) && region !== "") {
    console.log(`Row ${idx + 1}:`, JSON.stringify(row));
  }
});
