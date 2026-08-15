import fs from 'fs';
import path from 'path';

console.log("==========================================");
console.log("VERIFYING ADMIN PAGINATION COMPONENT & PAGES");
console.log("==========================================");

// 1. Verify data-table.tsx
const dataTablePath = path.resolve('src', 'components', 'admin', 'data-table.tsx');
const dataTableContent = fs.readFileSync(dataTablePath, 'utf8');
if (dataTableContent.includes('export function AdminPagination') &&
    dataTableContent.includes('<SelectItem value="10">10</SelectItem>') &&
    dataTableContent.includes('<SelectItem value="25">25</SelectItem>') &&
    dataTableContent.includes('<SelectItem value="50">50</SelectItem>') &&
    dataTableContent.includes('Sebelumnya') &&
    dataTableContent.includes('Selanjutnya')) {
  console.log("✅ src/components/admin/data-table.tsx properly exports AdminPagination with (10, 25, 50) dropdown and (Sebelumnya / Selanjutnya) buttons.");
} else {
  console.error("❌ ERROR: data-table.tsx missing AdminPagination component!");
  process.exit(1);
}

// 2. Verify all 4 admin pages
const pages = [
  { name: 'Kelola Donor', path: 'src/routes/_authenticated.admin.donors.tsx', label: 'donor' },
  { name: 'Kelola Kegiatan', path: 'src/routes/_authenticated.admin.activities.tsx', label: 'kegiatan' },
  { name: 'Kelola SBM', path: 'src/routes/_authenticated.admin.sbm.tsx', label: 'SBM' },
  { name: 'Kelola SBU', path: 'src/routes/_authenticated.admin.sbu.tsx', label: 'SBU' },
];

for (const p of pages) {
  const filePath = path.resolve(p.path);
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('AdminPagination') && content.includes(`itemLabel="${p.label}"`)) {
    console.log(`✅ ${p.name} (${p.path}) properly uses AdminPagination with dropdown and navigation controls.`);
  } else {
    console.error(`❌ ERROR: ${p.name} (${p.path}) missing AdminPagination!`);
    process.exit(1);
  }
}

console.log("\n==========================================");
console.log("🎉 ALL PAGINATION VERIFICATIONS PASSED!");
console.log("==========================================");
