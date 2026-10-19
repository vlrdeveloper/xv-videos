import "server-only";
import { getAuth } from "@/lib/auth";
export async function apiAdmin() { const a = await getAuth(); return !!a && a.active && a.role === "admin"; }
