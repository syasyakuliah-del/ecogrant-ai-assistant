import { createClient } from "@supabase/supabase-js";

const url = "https://scnouypfyimjuonbnnhj.supabase.co";
const key = "sb_publishable_mSEc8e2HRkrt7fiY4uAbCQ_KGNJsYam";

const supabase = createClient(url, key);

async function testWizardDB() {
  console.log("Testing Proposal Wizard DB operations...");

  // 1. Fetch any user profile or donor
  const { data: donor } = await supabase.from("donors").select("id").limit(1).single();
  console.log("Donor ID:", donor?.id);

  // 2. Fetch a proposal to test queries
  const { data: proposal, error: pErr } = await supabase
    .from("proposals")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (pErr) console.error("Error fetching proposals:", pErr);
  else console.log("Proposals query OK. Found:", proposal?.id || "None");

  // 3. Test budget_items columns
  const { data: budget, error: bErr } = await supabase
    .from("budget_items")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (bErr) console.error("Error fetching budget_items:", bErr);
  else console.log("budget_items query OK. Found:", budget?.id || "None");

  // 4. Test lfa_rows columns
  const { data: lfa, error: lfaErr } = await supabase
    .from("lfa_rows")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (lfaErr) console.error("Error fetching lfa_rows:", lfaErr);
  else console.log("lfa_rows query OK. Found:", lfa?.id || "None");
}

testWizardDB();
