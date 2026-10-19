"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
const P = "/admin/users";
const go = (k: "ok" | "error", m: string): never => redirect(`${P}?${k}=${encodeURIComponent(m)}`);
const Id = z.string().uuid();
const lastAdmin = (m: string) => (m.includes("last active administrator") ? "The last active administrator cannot be removed or disabled." : "Could not update the user.");
export async function createUser(fd: FormData) {
  await requireAdmin();
  const p = z.object({ email: z.string().email().max(200), password: z.string().min(12).max(200), role: z.enum(["admin", "member"]) })
    .safeParse({ email: fd.get("email"), password: fd.get("password"), role: fd.get("role") });
  if (!p.success) return go("error", "Enter a valid email and a password of 12 or more characters.");
  const a = adminClient();
  const { data, error } = await a.auth.admin.createUser({ email: p.data.email, password: p.data.password, email_confirm: true });
  if (error || !data.user) { console.error(error?.message); return go("error", "Could not create the user (email already used?)."); }
  const r = await a.from("profiles").update({ role: p.data.role }).eq("id", data.user.id);
  if (r.error) console.error(r.error.message);
  revalidatePath(P); return go("ok", "User created.");
}
export async function setRole(fd: FormData) {
  await requireAdmin();
  const id = Id.safeParse(fd.get("id")), role = z.enum(["admin", "member"]).safeParse(fd.get("role"));
  if (!id.success || !role.success) return go("error", "Bad request.");
  const { error } = await adminClient().from("profiles").update({ role: role.data }).eq("id", id.data);
  if (error) return go("error", lastAdmin(error.message));
  revalidatePath(P); return go("ok", "Role updated.");
}
export async function setActive(fd: FormData) {
  await requireAdmin();
  const id = Id.safeParse(fd.get("id"));
  if (!id.success) return go("error", "Bad request.");
  const { error } = await adminClient().from("profiles").update({ is_active: fd.get("active") === "true" }).eq("id", id.data);
  if (error) return go("error", lastAdmin(error.message));
  revalidatePath(P); return go("ok", "User updated.");
}
export async function resetPassword(fd: FormData) {
  await requireAdmin();
  const id = Id.safeParse(fd.get("id")), pw = z.string().min(12).max(200).safeParse(fd.get("password"));
  if (!id.success || !pw.success) return go("error", "The new password needs 12 or more characters.");
  const { error } = await adminClient().auth.admin.updateUserById(id.data, { password: pw.data });
  if (error) { console.error(error.message); return go("error", "Could not reset the password."); }
  return go("ok", "Password reset.");
}
