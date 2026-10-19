"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sb } from "@/lib/supabase/server";
const Form = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });
export async function signIn(_prev: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  const p = Form.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) return { error: "Enter a valid email and your password." };
  const s = await sb();
  const { data, error } = await s.auth.signInWithPassword(p.data);
  if (error || !data.user) return { error: "Incorrect email or password." };
  const { data: prof, error: pe } = await s.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
  if (pe) { console.error("profile lookup failed", pe.message); await s.auth.signOut();
    return { error: "The website cannot read its tables. Run 0003_grants.sql in Supabase, then try again." }; }
  if (!prof?.is_active) { await s.auth.signOut(); return { error: "This account is disabled. Contact an administrator." }; }
  const next = String(fd.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
export async function signOut() { const s = await sb(); await s.auth.signOut(); redirect("/login"); }
