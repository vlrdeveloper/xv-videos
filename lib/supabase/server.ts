import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { need } from "@/lib/env";
type CookieToSet = { name: string; value: string; options?: any };
export async function sb() {
  const store = await cookies();
  return createServerClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list: CookieToSet[]) { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* server component */ } },
    },
  });
}
