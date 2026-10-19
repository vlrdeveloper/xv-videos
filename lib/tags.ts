export const cleanTag = (r: string) => r.trim().toLowerCase().replace(/\s+/g, " ");
export const tagValid = (t: string) => t.length >= 2 && t.length <= 30 && /^[\p{L}\p{N} -]+$/u.test(t);
export function normalizeTags(raw: string[]) {
  const out: string[] = [];
  for (const r of raw) { const t = cleanTag(r); if (tagValid(t) && !out.includes(t)) out.push(t); }
  return out;
}
export function slugify(s: string, fallback = "item") {
  const x = s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return x || fallback;
}
