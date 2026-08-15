import { createClient } from "@supabase/supabase-js";
import fs from "fs";

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
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
console.log("Supabase URL:", url);
console.log("Supabase Key:", key?.substring(0, 20) + "...");

const sb = createClient(url, key);

async function check() {
  console.log("\n--- Checking tables ---");

  const { data: rolesData, error: rolesErr } = await sb.from("roles").select("*");
  console.log(
    "roles table:",
    rolesErr ? `ERROR: ${rolesErr.message}` : `${rolesData?.length ?? 0} rows`,
  );
  if (rolesData) console.log("  Roles:", JSON.stringify(rolesData));

  const { data: userRoles, error: urErr } = await sb.from("user_roles").select("*");
  console.log(
    "user_roles table:",
    urErr ? `ERROR: ${urErr.message}` : `${userRoles?.length ?? 0} rows`,
  );
  if (userRoles) console.log("  User roles:", JSON.stringify(userRoles));

  const { data: profiles, error: profErr } = await sb
    .from("profiles")
    .select("id, email, full_name");
  console.log(
    "profiles table:",
    profErr ? `ERROR: ${profErr.message}` : `${profiles?.length ?? 0} rows`,
  );
  if (profiles)
    console.log(
      "  Profiles:",
      JSON.stringify(profiles)
    );
}

check().catch(console.error);
