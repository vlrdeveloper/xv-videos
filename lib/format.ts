export const fmtDur = (s: number | null) => {
  if (!s) return "";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60, p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(x)}` : `${m}:${p(x)}`;
};
export const thumbUrl = (key: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/video-thumbnails/${key}`;
export const isNew = (iso: string) => Date.now() - new Date(iso).getTime() < Number(process.env.NEW_BADGE_DAYS ?? 14) * 864e5;
