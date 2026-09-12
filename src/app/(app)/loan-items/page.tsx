import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isIT, SITES } from "@/lib/constants";
import { LOAN_ITEM_STATUS } from "@/lib/loan-categories";
import { LoanItemsTable } from "./LoanItemsTable";
import { LoanTabs } from "../loans/LoanTabs";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/ui";

type SP = Record<string, string | undefined>;
const UNAVAILABLE_STATUS = "__unavailable";

export default async function LoanItemsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isIT(user.role)) redirect("/");

  const sp = await searchParams;
  const initialStatus = ["ALL", ...Object.keys(LOAN_ITEM_STATUS), UNAVAILABLE_STATUS].includes(sp.status ?? "") ? sp.status ?? "ALL" : "ALL";
  const initialSiteCode = SITES.some((site) => site.code === sp.site) ? sp.site! : "ALL";
  const initialQuery = (sp.q ?? "").trim();

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
  const now = new Date();
  const activeLoanCount = items.filter((item) => item.loans.length > 0).length;
  const overdueCount = items.filter((item) => item.loans[0] && item.loans[0].dueDate < now).length;
  const availableCount = items.filter((item) => item.status === "AVAILABLE" && item.loans.length === 0).length;
  const maintenanceCount = items.filter((item) => item.status === "MAINTENANCE" || item.status === "RETIRED").length;

  return (
    <div className="space-y-3">
      <PageHeader
        title="คลังอุปกรณ์"
        count={items.length}
        subtitle="อุปกรณ์ที่ให้ยืมชั่วคราว (โน้ตบุ๊ค / ลำโพงประชุม / โปรเจกเตอร์ ฯลฯ) — 1 แถว = 1 ชิ้น ตอนกรอกฟอร์ม F03 ระบบจะเช็คให้ว่าหมวดที่ขอมีว่างในช่วงวันที่เลือกกี่ชิ้น"
        actions={<LoanTabs />}
      />
      <section aria-label="สรุปคลังอุปกรณ์" className="grid overflow-hidden rounded-md border border-border bg-card sm:grid-cols-4">
        <InventoryMetric href="/loan-items?status=AVAILABLE" label="พร้อมให้ยืม" count={availableCount} tone="brand" />
        <InventoryMetric href="/loans?view=active" label="กำลังถูกยืม" count={activeLoanCount} />
        <InventoryMetric href="/loans?view=overdue" label="เกินกำหนดคืน" count={overdueCount} tone={overdueCount > 0 ? "red" : "default"} />
        <InventoryMetric href={`/loan-items?status=${UNAVAILABLE_STATUS}`} label="ซ่อม / ปลดระวาง" count={maintenanceCount} />
      </section>
      <LoanItemsTable
        sites={SITES}
        initialFilters={{ q: initialQuery, status: initialStatus, siteCode: initialSiteCode }}
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

function InventoryMetric({
  href,
  label,
  count,
  tone = "default",
}: {
  href?: string;
  label: string;
  count: number;
  tone?: "default" | "brand" | "red";
}) {
  const valueClass = tone === "brand" ? "text-brand" : tone === "red" ? "text-red-600" : "text-slate-950";
  const className = cn(
    "border-b border-border px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0",
    href && "transition-colors hover:bg-surface-subtle",
  );
  const content = (
    <>
      <span className="block text-xs text-muted">{label}</span>
      <span className={cn("mt-0.5 block text-xl font-semibold tabular-nums", valueClass)}>{count}</span>
    </>
  );
  return href ? <Link href={href} className={cn(className, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40")}>{content}</Link> : <div className={className}>{content}</div>;
}
