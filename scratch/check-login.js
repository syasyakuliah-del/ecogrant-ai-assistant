import { createClient } from "@supabase/supabase-js";

const url = "https://scnouypfyimjuonbnnhj.supabase.co";
const key = "sb_publishable_mSEc8e2HRkrt7fiY4uAbCQ_KGNJsYam";

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function checkLogin() {
  console.log("Testing login for admin@ecogrant.org...");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: "admin@ecogrant.org",
    password: "EcoGrant2026!#StrongSecurePass",
  });

  if (error) {
    console.error("❌ Login Error:", error.message);
  } else {
    console.log("✅ Login Success! User ID:", data.user?.id);
    console.log("User metadata:", data.user?.user_metadata);

    // Check user role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", data.user?.id);
    console.log("User Roles in DB:", roles);
  }
}

checkLogin();
