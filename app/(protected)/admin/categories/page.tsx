import { categoryCounts } from "@/lib/queries";
import { createCategory, renameCategory, deleteCategory } from "@/app/actions/categories";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
export default async function Categories({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams, cats = await categoryCounts();
  return (<>
    <p className="eyebrow">MANAGE</p><h1 className="h1">Categories</h1>
    <p className="muted">Create as many as you need. A video can belong to several.</p>
    <Flash ok={sp.ok} error={sp.error} />
    <form action={createCategory} className="srow"><label className="sr" htmlFor="nc">New category</label><input id="nc" name="name" maxLength={60} placeholder="e.g. Tutorials" required /><button className="abtn">Add category</button></form>
    <table className="tbl"><thead><tr><th>NAME</th><th>SLUG</th><th>VIDEOS</th><th></th></tr></thead><tbody>
      {cats.map(c => <tr key={c.id}>
        <td><form action={renameCategory} className="srow"><input type="hidden" name="id" value={c.id} /><input name="name" defaultValue={c.name} maxLength={60} aria-label={`Rename ${c.name}`} /><button className="abtn sec">Save</button></form></td>
        <td><code>{c.slug}</code></td><td>{c.video_count}</td>
        <td><form action={deleteCategory} className="srow"><input type="hidden" name="id" value={c.id} />
          {c.video_count > 0 && <select name="reassign" aria-label="Move its videos to"><option value="">Just remove it</option>{cats.filter(o => o.id !== c.id).map(o => <option key={o.id} value={o.id}>Move videos to {o.name}</option>)}</select>}
          <ConfirmButton className="abtn sec" message={`Delete category "${c.name}"?`}>Delete</ConfirmButton></form></td></tr>)}
      {!cats.length && <tr><td colSpan={4} className="muted">No categories yet.</td></tr>}</tbody></table>
  </>);
}
