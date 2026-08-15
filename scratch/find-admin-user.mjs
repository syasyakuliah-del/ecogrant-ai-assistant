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

async function findAdmin() {
  console.log("Checking user_roles table for any admin role...");
  const { data: userRoles, error: urErr } = await supabase.from("user_roles").select("*");
  console.log("user_roles:", userRoles, "Err:", urErr?.message);

  const { data: profiles, error: prErr } = await supabase.from("profiles").select("*");
  console.log("profiles:", profiles, "Err:", prErr?.message);
}

findAdmin();
