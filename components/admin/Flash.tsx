export default function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return <p role="status" className={error ? "flash bad" : "flash good"}>{error ?? ok}</p>;
}
