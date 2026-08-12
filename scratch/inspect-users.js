import { createClient } from "@supabase/supabase-js";

const url = "https://scnouypfyimjuonbnnhj.supabase.co";
const key = "sb_publishable_mSEc8e2HRkrt7fiY4uAbCQ_KGNJsYam";

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function inspectUsers() {
  console.log("🔍 Inspecting profiles and user_roles in new Supabase DB...");

  const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
  console.log("Profiles:", profiles, pErr);

  const { data: roles, error: rErr } = await supabase.from("user_roles").select("*");
  console.log("User Roles:", roles, rErr);
}

inspectUsers();
