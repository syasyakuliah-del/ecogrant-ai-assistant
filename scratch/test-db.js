import { createClient } from "@supabase/supabase-js";

const url = "https://ozxdpagxumfxveqyfene.supabase.co";
const key = "sb_publishable_GG-5HRci4QU04snfZ4kamQ_IJ1JuSR9";

const supabase = createClient(url, key);

async function testTables() {
  console.log("Checking Supabase tables...");
  const tables = [
    "profiles",
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
    "donors",
    "sbm",
    "sbu",
    "activities",
    "proposals",
    "proposal_versions",
    "proposal_sections",
    "lfa_rows",
    "budget_items",
    "donor_matches",
    "notifications",
    "audit_logs",
    "help_articles"
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("count", { count: "exact", head: true });
    if (error) {
      console.error(`❌ Table '${t}': ERROR -> ${error.message} (${error.code})`);
    } else {
      console.log(`✅ Table '${t}': OK`);
    }
  }
}

testTables();
