import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-brand">การจัดการระบบ</span>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
