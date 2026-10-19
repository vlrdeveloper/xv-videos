import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { sb } from "@/lib/supabase/server";
export const getAuth = cache(async () => {
  const s = await sb();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data, error } = await s.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (error) console.error("profile lookup failed (did you run 0003_grants.sql?)", error.message);
  return { email: user.email ?? "", role: (data?.role ?? "member") as "admin" | "member", active: !!data?.is_active };
});
export async function requireMember() {
  const a = await getAuth();
  if (!a || !a.active) redirect("/login");
  return a;
}
export async function requireAdmin() {
  const a = await requireMember();
  if (a.role !== "admin") redirect("/");
  return a;
}
