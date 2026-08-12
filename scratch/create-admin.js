import { createClient } from "@supabase/supabase-js";

const url = "https://scnouypfyimjuonbnnhj.supabase.co";
const key = "sb_publishable_mSEc8e2HRkrt7fiY4uAbCQ_KGNJsYam";

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function setupFirstAdmin() {
  console.log("🚀 Registering First Admin User on new Supabase instance...");

  const email = "admin@ecogrant.org";
  const password = "EcoGrant2026!#StrongSecurePass";

  // Check if user can sign in
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInData?.user) {
    console.log("✅ Admin user already exists and login works! User ID:", signInData.user.id);
    return;
  }

  console.log("Attempting sign up for:", email);
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: "Administrator Utama",
        organization_name: "EcoGrant AI Admin",
        phone: "+62 812 3456 7890",
      },
    },
  });

  if (signUpErr) {
    console.error("❌ Sign up failed:", signUpErr.message);
  } else {
    console.log("🎉 First Admin registered successfully!");
    console.log("User ID:", signUpData.user?.id);
    console.log("Identities / Confirmation required:", signUpData.user?.identities);
  }
}

setupFirstAdmin();
