// Renders the site name with the leading "XV" in the accent colour.
// If the name doesn't start with "XV", it is shown as plain text.
export default function Brand({ name, stacked = false }: { name: string; stacked?: boolean }) {
  const m = name.match(/^(XV)\s*(.*)$/i);
  if (!m) return <>{name}</>;
  const [, xv, rest] = m;
  return (
    <>
      <span className="xv">{xv}</span>
      {rest && (stacked ? <br /> : " ")}
      {rest && <span className="rest">{rest}</span>}
    </>
  );
}