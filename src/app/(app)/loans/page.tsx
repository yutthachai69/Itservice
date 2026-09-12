import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isIT, SITES } from "@/lib/constants";
import { categoryLabel } from "@/lib/loan-categories";
import { LoanTabs } from "./LoanTabs";
import { LoansTable } from "./LoansTable";
import { PageHeader } from "@/components/PageHeader";
import { Button, ButtonLink } from "@/components/Button";

type SP = Record<string, string | undefined>;
const PAGE_SIZE = 25;

function loanPageHref(view: string, q: string, site: string, page: number) {
  const params = new URLSearchParams();
  if (view !== "active") params.set("view", view);
  if (q) params.set("q", q);
  if (site) params.set("site", site);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/loans?${query}` : "/loans";
}

export default async function LoansPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isIT(user.role)) redirect("/");

  const sp = await searchParams;
  const view = ["active", "overdue", "returned", "all"].includes(sp.view ?? "") ? sp.view! : "active"; // active | overdue | returned | all
  const q = (sp.q ?? "").trim();
  const site = SITES.some((item) => item.code === sp.site) ? sp.site! : "";
  const rawPage = Number.parseInt(sp.page ?? "1", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const now = new Date();

  const searchWhere: Prisma.LoanWhereInput = {};
  if (q) {
    searchWhere.OR = [
      { borrowerName: { contains: q } },
      { item: { is: { name: { contains: q } } } },
      { item: { is: { serial: { contains: q } } } },
    ];
  }
  if (site) searchWhere.item = { is: { siteCode: site } };

  const where: Prisma.LoanWhereInput = { ...searchWhere };
  if (view === "active") where.status = { in: ["BOOKED", "ONLOAN"] };
  else if (view === "returned") where.status = "RETURNED";
  else if (view === "overdue") {
    where.status = { in: ["BOOKED", "ONLOAN"] };
    where.dueDate = { lt: now };
  }
  const [rows, total, activeCount, overdueCount] = await Promise.all([
    prisma.loan.findMany({
      where,
      include: { item: true, ticket: { select: { id: true, docNo: true } } },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      skip: (requestedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.loan.count({ where }),
    prisma.loan.count({ where: { ...searchWhere, status: { in: ["BOOKED", "ONLOAN"] } } }),
    prisma.loan.count({
      where: { ...searchWhere, status: { in: ["BOOKED", "ONLOAN"] }, dueDate: { lt: now } },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (requestedPage > pages) redirect(loanPageHref(view, q, site, pages));
  const page = requestedPage;
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const counts = { active: activeCount, overdue: overdueCount };
  const hasFilters = Boolean(q || site || view !== "active");
  const summaryHref = (nextView: string) => {
    const params = new URLSearchParams({ view: nextView });
    if (q) params.set("q", q);
    if (site) params.set("site", site);
    return `/loans?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="ยืม-คืนอุปกรณ์" count={total} actions={<LoanTabs />} />

      <section aria-label="สรุปรายการยืมคืน" className="grid overflow-hidden rounded-md border border-border bg-card sm:grid-cols-2">
        <Link href={summaryHref("active")} aria-current={view === "active" ? "page" : undefined} className={view === "active" ? "border-b-2 border-brand bg-brand-weak/35 px-5 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 sm:border-b-0 sm:border-l-2 sm:border-l-brand sm:border-r" : "border-b border-border px-5 py-4 transition-colors hover:bg-brand-weak/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 sm:border-b-0 sm:border-r"}>
          <p className="text-xs font-medium text-muted">กำลังยืม</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{counts.active}</p>
          <p className="mt-0.5 text-xs text-slate-400">รายการที่ยังไม่คืน</p>
        </Link>
        <Link href={summaryHref("overdue")} aria-current={view === "overdue" ? "page" : undefined} className={view === "overdue" ? "border-b-2 border-red-400 bg-red-50/55 px-5 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 sm:border-b-0 sm:border-l-2" : "border-b border-border px-5 py-4 transition-colors hover:bg-red-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 sm:border-b-0 sm:border-l-0"}>
          <p className="text-xs font-medium text-muted">เลยกำหนดคืน</p>
          <p className={counts.overdue > 0 ? "mt-1 text-2xl font-semibold tabular-nums text-red-600" : "mt-1 text-2xl font-semibold tabular-nums text-slate-950"}>{counts.overdue}</p>
          <p className="mt-0.5 text-xs text-slate-400">ต้องติดตามหรือบันทึกรับคืน</p>
        </Link>
      </section>

      <form method="get" className="flex flex-col gap-3 card p-4 text-sm shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          มุมมอง
          <select name="view" defaultValue={view} aria-label="เลือกมุมมองรายการยืมคืน" className="control-select w-full text-sm font-normal sm:w-auto">
          <option value="active">กำลังยืม ({counts.active})</option>
          <option value="overdue">เลยกำหนดคืน ({counts.overdue})</option>
          <option value="returned">คืนแล้ว</option>
          <option value="all">ทั้งหมด</option>
          </select>
        </label>
        <input
          aria-label="ค้นหารายการยืมคืน"
          name="q"
          defaultValue={q}
          placeholder="ค้นหา ผู้ยืม / ชื่ออุปกรณ์ / serial"
          className="control w-full px-3 sm:min-w-[240px] sm:flex-1"
        />
        <select name="site" defaultValue={site} aria-label="กรองบริษัทของรายการยืมคืน" className="control-select w-full sm:w-auto">
          <option value="">ทุกบริษัท</option>
          {SITES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
        <Button type="submit" className="w-full sm:w-auto">ค้นหา</Button>
          {(q || site || view !== "active") && (
            <ButtonLink href="/loans" variant="secondary" size="md" className="w-full sm:w-auto">
              ล้างตัวกรอง
            </ButtonLink>
          )}
      </form>

      <LoansTable
        emptyState={{
          title: hasFilters ? "ไม่พบรายการที่ตรงกับเงื่อนไข" : "ยังไม่มีรายการยืมที่กำลังดำเนินการ",
          hint: hasFilters ? "ลองเปลี่ยนมุมมองหรือคำค้นหา แล้วลองอีกครั้ง" : "เมื่อมีการยืมอุปกรณ์ รายการจะปรากฏที่นี่",
          clearHref: hasFilters ? "/loans" : undefined,
        }}
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

      {pages > 1 && (
        <LoanPagination page={page} pages={pages} rangeStart={rangeStart} rangeEnd={rangeEnd} total={total} view={view} q={q} site={site} />
      )}
    </div>
  );
}

function LoanPagination({ page, pages, rangeStart, rangeEnd, total, view, q, site }: { page: number; pages: number; rangeStart: number; rangeEnd: number; total: number; view: string; q: string; site: string }) {
  const items: Array<number | "ellipsis"> = [1];
  const windowStart = Math.max(2, page - 2);
  const windowEnd = Math.min(pages - 1, page + 2);
  if (windowStart > 2) items.push("ellipsis");
  for (let index = windowStart; index <= windowEnd; index += 1) items.push(index);
  if (windowEnd < pages - 1) items.push("ellipsis");
  if (pages > 1) items.push(pages);

  return (
    <nav aria-label="หน้ารายการยืมคืน" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-xs text-muted">
        รายการ <span className="font-semibold tabular-nums text-slate-700">{rangeStart}–{rangeEnd}</span> จาก {total.toLocaleString("th-TH")} · หน้า {page} จาก {pages}
      </p>
      <div className="flex items-center gap-1" role="list">
        {page > 1 ? (
          <Link href={loanPageHref(view, q, site, page - 1)} className="rounded-md border border-border px-3 py-1.5 text-muted transition-colors hover:bg-brand-weak/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            ก่อนหน้า
          </Link>
        ) : (
          <span aria-disabled="true" className="cursor-not-allowed rounded-md border border-border px-3 py-1.5 text-slate-300">
            ก่อนหน้า
          </span>
        )}
        {items.map((item, index) => item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-slate-400">…</span>
        ) : (
          <Link
            key={item}
            href={loanPageHref(view, q, site, item)}
            aria-current={item === page ? "page" : undefined}
            className={item === page ? "min-w-8 rounded-md bg-brand px-2.5 py-1.5 text-center font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" : "min-w-8 rounded-md px-2.5 py-1.5 text-center text-muted transition-colors hover:bg-brand-weak/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"}
          >
            {item}
          </Link>
        ))}
        {page < pages ? (
          <Link href={loanPageHref(view, q, site, page + 1)} className="rounded-md border border-border px-3 py-1.5 text-muted transition-colors hover:bg-brand-weak/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            ถัดไป
          </Link>
        ) : (
          <span aria-disabled="true" className="cursor-not-allowed rounded-md border border-border px-3 py-1.5 text-slate-300">
            ถัดไป
          </span>
        )}
      </div>
    </nav>
  );
}
