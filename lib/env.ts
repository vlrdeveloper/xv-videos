export function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing setting ${name}. Fill it in .env.local, then restart "npm run dev".`);
  return v;
}
