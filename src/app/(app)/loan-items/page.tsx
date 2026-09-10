import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isIT, SITES } from "@/lib/constants";
import { LoanItemsTable } from "./LoanItemsTable";
import { LoanTabs } from "../loans/LoanTabs";
import { PageHeader } from "@/components/PageHeader";

export default async function LoanItemsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isIT(user.role)) redirect("/");

  const items = await prisma.loanItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      loans: {
        where: { status: { in: ["BOOKED", "ONLOAN"] } },
        select: { borrowerName: true, dueDate: true, status: true },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  return (
    <div className="space-y-3">
      <PageHeader
        title="คลังอุปกรณ์"
        count={items.length}
        subtitle="อุปกรณ์ที่ให้ยืมชั่วคราว (โน้ตบุ๊ค / ลำโพงประชุม / โปรเจกเตอร์ ฯลฯ) — 1 แถว = 1 ชิ้น ตอนกรอกฟอร์ม F03 ระบบจะเช็คให้ว่าหมวดที่ขอมีว่างในช่วงวันที่เลือกกี่ชิ้น"
        actions={<LoanTabs />}
      />
      <LoanItemsTable
        sites={SITES}
        rows={items.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          serial: i.serial,
          siteCode: i.siteCode,
          status: i.status,
          activeLoan: i.loans[0]
            ? { borrower: i.loans[0].borrowerName, due: i.loans[0].dueDate.toISOString(), status: i.loans[0].status }
            : null,
        }))}
      />
    </div>
  );
}
