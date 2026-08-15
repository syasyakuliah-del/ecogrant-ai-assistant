import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

async function run() {
  console.log("Checking auth sign-in options...");
  
  // Try sign in admin@ecogrant.ai
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: "admin@ecogrant.ai",
    password: "EcoGrant2026!#StrongSecurePass"
  });

  if (authErr) {
    console.log("signInWithPassword admin@ecogrant.ai failed:", authErr.message);
  } else {
    console.log("signInWithPassword succeeded! User ID:", auth.user.id);
    
    // Check user_roles for this user
    const { data: ur, error: urErr } = await supabase.from("user_roles").select("*").eq("user_id", auth.user.id);
    console.log("user_roles for user:", ur, "Err:", urErr?.message);

    // Check if we can test inserting one SBM item
    const testSbm = [{
      year: 2026,
      version: "1.0",
      code: "TEST-001",
      category: "Honorarium",
      description: "Test Item",
      unit: "OJ",
      price: 100000,
      region_code: "NASIONAL",
      is_active: true
    }];

    const { error: insertErr } = await supabase.from("sbm").upsert(testSbm, { onConflict: "year,version,code,region_code" });
    console.log("Test SBM insert result error:", insertErr?.message || "SUCCESS!");
  }
}

run();
