import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isIT } from "@/lib/constants";
import { categoryLabel } from "@/lib/loan-categories";
import { LoanTabs } from "./LoanTabs";
import { LoansTable } from "./LoansTable";
import { PageHeader } from "@/components/PageHeader";

type SP = Record<string, string | undefined>;

export default async function LoansPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isIT(user.role)) redirect("/");

  const sp = await searchParams;
  const view = sp.view ?? "active"; // active | overdue | returned | all
  const q = (sp.q ?? "").trim();
  const now = new Date();

  const where: Prisma.LoanWhereInput = {};
  if (view === "active") where.status = { in: ["BOOKED", "ONLOAN"] };
  else if (view === "returned") where.status = "RETURNED";
  else if (view === "overdue") {
    where.status = { in: ["BOOKED", "ONLOAN"] };
    where.dueDate = { lt: now };
  }
  if (q) {
    where.OR = [
      { borrowerName: { contains: q } },
      { item: { is: { name: { contains: q } } } },
      { item: { is: { serial: { contains: q } } } },
    ];
  }

  const rows = await prisma.loan.findMany({
    where,
    include: { item: true, ticket: { select: { id: true, docNo: true } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 300,
  });

  const counts = {
    active: await prisma.loan.count({ where: { status: { in: ["BOOKED", "ONLOAN"] } } }),
    overdue: await prisma.loan.count({
      where: { status: { in: ["BOOKED", "ONLOAN"] }, dueDate: { lt: now } },
    }),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="ยืม-คืนอุปกรณ์" actions={<LoanTabs />} />

      <form className="flex flex-wrap items-end gap-3 card p-4 text-sm shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          มุมมอง
          <select name="view" defaultValue={view} className="h-10 rounded-lg border border-border px-2 py-1.5 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/15">
          <option value="active">กำลังยืม ({counts.active})</option>
          <option value="overdue">เลยกำหนดคืน ({counts.overdue})</option>
          <option value="returned">คืนแล้ว</option>
          <option value="all">ทั้งหมด</option>
          </select>
        </label>
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหา ผู้ยืม / ชื่ออุปกรณ์ / serial"
          className="h-10 min-w-[240px] flex-1 rounded-lg border border-border px-3 py-1.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <button className="h-10 rounded-lg bg-brand px-4 text-white transition hover:bg-brand-strong">ค้นหา</button>
      </form>

      <LoansTable
        rows={rows.map((l) => ({
          id: l.id,
          itemName: l.item.name,
          category: categoryLabel(l.item.category),
          serial: l.item.serial,
          borrowerName: l.borrowerName,
          borrowDate: l.borrowDate.toISOString(),
          dueDate: l.dueDate.toISOString(),
          returnedAt: l.returnedAt?.toISOString() ?? null,
          status: l.status,
          ticket: l.ticket ? { id: l.ticket.id, docNo: l.ticket.docNo } : null,
        }))}
      />
    </div>
  );
}
