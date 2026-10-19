import "server-only";
import { createClient } from "@supabase/supabase-js";
import { need } from "@/lib/env";
export const adminClient = () =>
  createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
export const THUMB_BUCKET = process.env.SUPABASE_THUMB_BUCKET ?? "video-thumbnails";
