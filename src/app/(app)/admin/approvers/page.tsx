import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { ApproversTable } from "./ApproversTable";

export default async function AdminApproversPage() {
  const admin = await getAdmin();
  if (!admin) return null;

  const items = await prisma.approver.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        รายชื่อนี้จะไปแสดงใน dropdown &quot;ผู้ตรวจสอบ / ผู้อนุมัติ&quot; ของฟอร์ม F07 และ F10 —
        อีเมลใช้สำหรับส่งแจ้งเตือนเมื่อมีเรื่องรอพิจารณา
      </p>
      <ApproversTable
        rows={items.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          type: a.type,
          active: a.active,
        }))}
      />
    </div>
  );
}
