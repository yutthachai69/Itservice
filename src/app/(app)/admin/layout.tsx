import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/PageHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="จัดการสิทธิ์"
        actions={
          <nav className="flex gap-1 text-sm">
            <Link href="/admin/users" className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition hover:bg-brand-weak hover:text-brand">
              ผู้ใช้ / บทบาท
            </Link>
            <Link href="/admin/approvers" className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition hover:bg-brand-weak hover:text-brand">
              รายชื่อผู้อนุมัติ
            </Link>
            <Link href="/admin/holidays" className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition hover:bg-brand-weak hover:text-brand">
              วันหยุด
            </Link>
          </nav>
        }
      />
      {children}
    </div>
  );
}
