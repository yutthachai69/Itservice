import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { HolidaysTable } from "./HolidaysTable";
import { PageHeader } from "@/components/PageHeader";

export default async function AdminHolidaysPage() {
  const admin = await getAdmin();
  if (!admin) return null;

  const items = await prisma.holiday.findMany({ orderBy: { dateKey: "asc" } });

  return (
    <div className="space-y-3">
      <PageHeader
        chip="การจัดการระบบ"
        title="วันหยุดและปฏิทิน SLA"
        count={items.length}
        subtitle="กำหนดวันหยุดที่ระบบจะไม่นับรวมในการคำนวณเวลาการให้บริการ"
      />
      <p className="text-xs text-muted">
        วันหยุดที่ระบุไว้จะถูก<b>หักออกจากการนับเวลา SLA</b> (เหมือนเสาร์-อาทิตย์) —
        มีผลกับคำร้องที่สร้าง<b>หลังจาก</b>เพิ่มวันหยุดเท่านั้น คำร้องเดิมไม่เปลี่ยน
      </p>
      <HolidaysTable
        rows={items.map((h) => ({ dateKey: h.dateKey, name: h.name }))}
      />
    </div>
  );
}
