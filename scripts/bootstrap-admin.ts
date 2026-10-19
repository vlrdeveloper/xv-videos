import { createClient } from "@supabase/supabase-js";
async function main() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!url || !key || !email || !password) { console.error("Fill NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL and ADMIN_PASSWORD in .env.local first."); process.exit(1); }
  if (password.length < 12) { console.error("ADMIN_PASSWORD must be at least 12 characters."); process.exit(1); }
  const s = createClient(url, key, { auth: { persistSession: false } });
  let id: string;
  const created = await s.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) {
    const list = await s.auth.admin.listUsers({ perPage: 1000 });
    const u = list.data?.users.find(x => x.email?.toLowerCase() === email.toLowerCase());
    if (!u) { console.error("Could not create the user:", created.error?.message); process.exit(1); }
    const up = await s.auth.admin.updateUserById(u.id, { password, email_confirm: true });
    if (up.error) { console.error(up.error.message); process.exit(1); }
    id = u.id;
  } else id = created.data.user.id;
  const { error } = await s.from("profiles").upsert({ id, email, role: "admin", is_active: true });
  if (error) { console.error("Could not set the admin role (did you run all 3 SQL files?):", error.message); process.exit(1); }
  console.log("Administrator ready:", email, "- now delete the ADMIN_PASSWORD line from .env.local");
}
main();
