// Quick diagnostic & fix: Check if syasyakuliah@gmail.com has admin role
// Run: node scratch/check-admin.mjs
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
console.log("Supabase URL:", url);
console.log("Supabase Key:", key?.substring(0, 20) + "...");

const sb = createClient(url, key);

async function check() {
  // 1. Check if tables exist by trying to query them
  console.log("\n--- 1. Checking tables ---");

  const { data: rolesData, error: rolesErr } = await sb.from("roles").select("*");
  console.log("roles table:", rolesErr ? `ERROR: ${rolesErr.message}` : `${rolesData?.length ?? 0} rows`);
  if (rolesData) console.log("  Roles:", JSON.stringify(rolesData.map(r => r.name)));

  const { data: userRoles, error: urErr } = await sb.from("user_roles").select("*");
  console.log("user_roles table:", urErr ? `ERROR: ${urErr.message}` : `${userRoles?.length ?? 0} rows`);
  if (userRoles) console.log("  User roles:", JSON.stringify(userRoles));

  const { data: profiles, error: profErr } = await sb.from("profiles").select("id, email, full_name");
  console.log("profiles table:", profErr ? `ERROR: ${profErr.message}` : `${profiles?.length ?? 0} rows`);
  if (profiles) console.log("  Profiles:", JSON.stringify(profiles.map(p => ({ email: p.email, id: p.id?.substring(0,8) }))));

  const { data: perms, error: permErr } = await sb.from("permissions").select("id, name");
  console.log("permissions table:", permErr ? `ERROR: ${permErr.message}` : `${perms?.length ?? 0} rows`);

  const { data: rolePerms, error: rpErr } = await sb.from("role_permissions").select("*");
  console.log("role_permissions table:", rpErr ? `ERROR: ${rpErr.message}` : `${rolePerms?.length ?? 0} rows`);

  console.log("\n--- CONCLUSION ---");
  if (rolesErr) {
    console.log("❌ Table 'roles' does NOT exist. You MUST run 1_schema_and_policies.sql FIRST in Supabase SQL Editor!");
  } else if (!rolesData || rolesData.length === 0) {
    console.log("⚠️ Table 'roles' exists but is EMPTY. You need to run 2_seed_master_data.sql in Supabase SQL Editor!");
  } else if (!userRoles || userRoles.length === 0) {
    console.log("⚠️ Table 'user_roles' exists but is EMPTY. Your account has no admin role assigned.");
  } else {
    const adminRoles = userRoles.filter(ur => ur.role === 'admin');
    if (adminRoles.length > 0) {
      console.log("✅ Admin role IS assigned. The sidebar should show Admin menu. Try logging out and back in.");
    } else {
      console.log("⚠️ User roles exist but none have role='admin'. Run 2_seed_master_data.sql to fix.");
    }
  }
}

check().catch(console.error);
