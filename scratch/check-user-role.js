import { createClient } from "@supabase/supabase-js";

const url = "https://ozxdpagxumfxveqyfene.supabase.co";
const key = "sb_publishable_GG-5HRci4QU04snfZ4kamQ_IJ1JuSR9";

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function checkUserRole() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: "admin@ecogrant.ai",
    password: "EcoGrant2026!#StrongSecurePass",
  });

  const userId = authData.user?.id;
  console.log("Logged in user:", userId);

  const { data: roles, error: rErr } = await supabase.from("user_roles").select("*").eq("user_id", userId);
  console.log("user_roles for admin user:", roles, rErr);

  const { data: hasAdmin, error: hErr } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  console.log("has_role(admin):", hasAdmin, hErr);
}

checkUserRole();
