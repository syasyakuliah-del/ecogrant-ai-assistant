import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('public', 'Data SBM.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("Rows 1290 to 1300:");
for (let i = 1290; i <= 1300; i++) {
  console.log(`Row ${i}:`, JSON.stringify(rawData[i - 1]));
}
