import { sb } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import { createUser, setRole, setActive, resetPassword } from "@/app/actions/users";
import Flash from "@/components/admin/Flash";
type U = { id: string; email: string; role: string; is_active: boolean; created_at: string };
export default async function Users({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams, me = await getAuth();
  const users = ((await (await sb()).from("profiles").select("id,email,role,is_active,created_at").order("created_at")).data ?? []) as U[];
  return (<>
    <p className="eyebrow">MANAGE</p><h1 className="h1">Users</h1>
    <p className="muted">Create accounts, change roles and disable access. Public sign-up is off.</p>
    <Flash ok={sp.ok} error={sp.error} />
    <h2 className="h2">Create user</h2>
    <form action={createUser} className="srow"><input name="email" type="email" placeholder="Email" aria-label="Email" required />
      <input name="password" type="text" minLength={12} placeholder="Initial password (12+ characters)" aria-label="Initial password" required />
      <select name="role" aria-label="Role"><option value="member">Member</option><option value="admin">Administrator</option></select><button className="abtn">Create user</button></form>
    <table className="tbl"><thead><tr><th>EMAIL</th><th>ROLE</th><th>STATUS</th><th>CREATED</th><th></th></tr></thead><tbody>
      {users.map(u => { const self = u.email === me?.email; return <tr key={u.id}>
        <td>{u.email} {self && <span className="chip">YOU</span>}</td>
        <td><form action={setRole} className="srow"><input type="hidden" name="id" value={u.id} /><select name="role" defaultValue={u.role} aria-label="Role"><option value="member">Member</option><option value="admin">Administrator</option></select><button className="abtn sec">Save</button></form></td>
        <td><span className={u.is_active ? "good" : "bad"}>{u.is_active ? "ACTIVE" : "DISABLED"}</span></td>
        <td>{new Date(u.created_at).toLocaleDateString()}</td>
        <td><div className="srow"><form action={setActive}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="active" value={String(!u.is_active)} /><button className="abtn sec" disabled={self}>{u.is_active ? "Disable" : "Enable"}</button></form>
          <form action={resetPassword} className="srow"><input type="hidden" name="id" value={u.id} /><input name="password" type="text" minLength={12} placeholder="New password" aria-label="New password" /><button className="abtn sec">Reset password</button></form></div></td></tr>; })}
    </tbody></table>
  </>);
}
