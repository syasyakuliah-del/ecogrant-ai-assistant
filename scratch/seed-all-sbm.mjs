import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

const url = process.env.VITE_SUPABASE_URL || "https://scnouypfyimjuonbnnhj.supabase.co";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_mSEc8e2HRkrt7fiY4uAbCQ_KGNJsYam";

function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, k) => headers.set(k, value));
    }
    if (
      supabaseKey.startsWith("sb_publishable_") &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const supabase = createClient(url, key, {
  global: {
    fetch: createSupabaseFetch(key),
  },
  auth: { persistSession: false },
});

async function seedSbm() {
  console.log("🚀 Starting SBM Seeding from public/Data SBM.xlsx...");

  const filePath = path.resolve('public', 'Data SBM.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Sheet1'];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`Total raw rows in Excel: ${rawData.length}`);

  const sbmRows = [];

  rawData.forEach((row, idx) => {
    if (idx === 0) return; // Skip Header

    if (row.length <= 3) return;

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

    sbmRows.push({
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

  console.log(`📦 Prepared ${sbmRows.length} valid SBM items to insert/upsert.`);

  const BATCH_SIZE = 200;
  let totalInserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < sbmRows.length; i += BATCH_SIZE) {
    const chunk = sbmRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("sbm")
      .upsert(chunk, { onConflict: "year,version,code,region_code" });

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} Error:`, error.message);
      totalErrors++;
    } else {
      totalInserted += chunk.length;
      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} items) upserted. Cumulative: ${totalInserted}/${sbmRows.length}`);
    }
  }

  console.log("\n--- SUMMARY ---");
  console.log(`Total successfully upserted: ${totalInserted}`);
  console.log(`Total batch errors: ${totalErrors}`);

  const { count, error: countErr } = await supabase
    .from("sbm")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

  if (countErr) {
    console.error("❌ Count verification error:", countErr.message);
  } else {
    console.log(`🎉 Total SBM records in Supabase DB: ${count}`);
  }
}

seedSbm().catch(console.error);
