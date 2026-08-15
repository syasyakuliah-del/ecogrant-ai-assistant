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
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: "admin@ecogrant.ai",
    password: "EcoGrant2026!#StrongSecurePass"
  });

  console.log("Logged in user:", auth.user.id);

  // Try updating user_roles
  const { data: updateRes, error: updateErr } = await supabase
    .from("user_roles")
    .update({ role: "admin" })
    .eq("user_id", auth.user.id);

  console.log("Update user_roles result:", updateRes, "Err:", updateErr?.message);
}

run();
