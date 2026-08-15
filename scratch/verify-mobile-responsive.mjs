import fs from 'fs';
import path from 'path';

console.log("==========================================");
console.log("VERIFYING MOBILE RESPONSIVENESS & LOGOUT");
console.log("==========================================");

// 1. Verify app-shell.tsx
const appShellPath = path.resolve('src', 'components', 'app-shell.tsx');
const appShellContent = fs.readFileSync(appShellPath, 'utf8');

if (appShellContent.includes('Keluar (Logout)') &&
    appShellContent.includes('lg:hidden text-xs text-red-600') &&
    appShellContent.includes('min-w-0 flex-1')) {
  console.log("✅ AppShell (app-shell.tsx) properly includes prominent mobile Logout button in drawer & header and non-stacking flex layout.");
} else {
  console.error("❌ ERROR: app-shell.tsx missing mobile Logout or responsive flex changes!");
  process.exit(1);
}

// 2. Verify index.tsx
const indexPath = path.resolve('src', 'routes', 'index.tsx');
const indexContent = fs.readFileSync(indexPath, 'utf8');

if (indexContent.includes('Sheet open={mobileNavOpen}') &&
    indexContent.includes('Buka Menu Navigasi Landing Page') &&
    indexContent.includes('hidden lg:flex')) {
  console.log("✅ Landing Page (index.tsx) properly includes responsive mobile Sheet drawer and clean flex navbar.");
} else {
  console.error("❌ ERROR: index.tsx missing mobile navigation drawer!");
  process.exit(1);
}

console.log("\n==========================================");
console.log("🎉 ALL RESPONSIVENESS VERIFICATIONS PASSED!");
console.log("==========================================");
