import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="adm"><AdminNav /><section>{children}</section></div>;
}
