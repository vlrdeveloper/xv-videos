import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { need } from "@/lib/env";
export async function sb() {
  const store = await cookies();
  return createServerClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* server component */ } },
    },
  });
}
