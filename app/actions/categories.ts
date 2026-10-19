"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sb } from "@/lib/supabase/server";
import { slugify } from "@/lib/tags";
const P = "/admin/categories";
const go = (k: "ok" | "error", m: string): never => redirect(`${P}?${k}=${encodeURIComponent(m)}`);
const uuid = (v: FormDataEntryValue | null) => (/^[0-9a-f-]{36}$/.test(String(v ?? "")) ? String(v) : null);
export async function createCategory(fd: FormData) {
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  if (!name || name.length > 60) return go("error", "Enter a name (up to 60 characters).");
  const { error } = await (await sb()).from("categories").insert({ name, slug: slugify(name) });
  if (error) { console.error(error.message); return go("error", "That category already exists."); }
  revalidatePath("/", "layout"); return go("ok", "Category added.");
}
export async function renameCategory(fd: FormData) {
  await requireAdmin();
  const id = uuid(fd.get("id")), name = String(fd.get("name") ?? "").trim();
  if (!id || !name || name.length > 60) return go("error", "Enter a valid name.");
  const { error } = await (await sb()).from("categories").update({ name, slug: slugify(name) }).eq("id", id);
  if (error) { console.error(error.message); return go("error", "Could not rename (name already used?)."); }
  revalidatePath("/", "layout"); return go("ok", "Category renamed.");
}
export async function deleteCategory(fd: FormData) {
  await requireAdmin();
  const id = uuid(fd.get("id")), to = uuid(fd.get("reassign"));
  if (!id) return go("error", "Bad request.");
  const { error } = await (await sb()).rpc("delete_category", { p_id: id, p_reassign_to: to });
  if (error) { console.error(error.message); return go("error", "Could not delete the category."); }
  revalidatePath("/", "layout"); return go("ok", "Category deleted.");
}
