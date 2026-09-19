import Link from "next/link";
import { redirect } from "next/navigation";
import { TicketFilterDisclosure } from "./TicketFilterDisclosure";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SITES, siteName, isIT } from "@/lib/constants";
import { FORM_LIST } from "@/lib/form-defs";
import { StatusBadge, Pill } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { fmtDateTime, cn } from "@/lib/ui";
import { computeSla } from "@/lib/sla";
import { ticketDateFilter } from "@/lib/ticket-date-filter";
import { Button, ButtonLink } from "@/components/Button";

const PAGE_SIZE = 20;
const STATUS_FILTERS = ["active", "closed", "all", "open", "in_progress", "resolved", "closed_only", "cancelled"] as const;
const STATUS_FILTER_LABEL: Record<string, string> = {
  active: "กำลังดำเนินการ",
  closed: "ปิดแล้ว / ยกเลิก",
  all: "ทั้งหมด",
  open: "เปิดเรื่อง",
  in_progress: "กำลังดำเนินการ",
  resolved: "รอผู้แจ้งยืนยัน",
  closed_only: "ปิดงานแล้ว",
  cancelled: "ยกเลิก",
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function TicketsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;
  const it = isIT(user.role);

  const rawFormType = one(sp.formType);
  const formType = FORM_LIST.some((form) => form.type === rawFormType) ? rawFormType : "";
  const rawStatus = one(sp.status);
  const status = STATUS_FILTERS.includes(rawStatus as (typeof STATUS_FILTERS)[number]) ? rawStatus : "active";
  const rawSite = one(sp.site);
  const site = SITES.some((item) => item.code === rawSite) ? rawSite : "";
  const q = one(sp.q).trim();
  const overdueOnly = one(sp.sla) === "overdue";
  const mine = one(sp.mine) === "1" || !it;
  const assigneeMe = it && one(sp.assignee) === "me";
  const rawPage = Number(one(sp.page));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 1000000 ? rawPage : 1;
  const createdFrom = ticketDateFilter(one(sp.createdFrom));
  const closedFrom = ticketDateFilter(one(sp.closedFrom));
  const now = new Date();

  const hasFilters =
    !!formType || status !== "active" || !!site || !!q || overdueOnly || (it && mine) || assigneeMe || !!createdFrom || !!closedFrom;
  const activeFilterCount = [
    createdFrom,
    closedFrom,
    formType,
    status !== "active" ? status : "",
    site,
    q,
    overdueOnly ? "overdue" : "",
    it && mine ? "mine" : "",
    assigneeMe ? "assignee" : "",
  ].filter(Boolean).length;
  const activeFilterLabels = [
    createdFrom ? `สร้างตั้งแต่: ${fmtDateTime(createdFrom)}` : "",
    closedFrom ? `ปิดตั้งแต่: ${fmtDateTime(closedFrom)}` : "",
    status !== "active" ? `สถานะ: ${STATUS_FILTER_LABEL[status] ?? status}` : "",
    formType ? `แบบฟอร์ม: ${formType}` : "",
    site ? `บริษัท: ${siteName(site)}` : "",
    q ? `คำค้น: ${q}` : "",
    overdueOnly ? "เกิน SLA" : "",
    it && mine ? "คำร้องของฉัน" : "",
    assigneeMe ? "งานที่มอบหมายให้ฉัน" : "",
  ].filter(Boolean);

  const baseWhere: Prisma.TicketWhereInput = {};
  if (createdFrom) baseWhere.createdAt = { gte: new Date(createdFrom) };
  if (closedFrom) baseWhere.closedAt = { gte: new Date(closedFrom) };
  if (mine) baseWhere.requesterId = user.id;
  if (assigneeMe) baseWhere.assignedToId = user.id;
  if (formType) baseWhere.formType = formType;
  if (site) baseWhere.serviceSiteCode = site;
  if (q) {
    baseWhere.OR = [
      { docNo: { contains: q } },
      { reqName: { contains: q } },
      { note: { contains: q } },
    ];
  }

  const where: Prisma.TicketWhereInput = { ...baseWhere };
  if (status === "active") where.status = { in: ["OPEN", "IN_PROGRESS", "RESOLVED"] };
  else if (status === "closed") where.status = { in: ["CLOSED", "CANCELLED"] };
  else if (status === "closed_only") where.status = "CLOSED";
  else if (status !== "all") where.status = status.toUpperCase();
  if (overdueOnly) {
    where.itStatus = "NEW";
    where.status = { notIn: ["CLOSED", "CANCELLED"] };
    where.slaDueAt = { lt: now };
  }

  const overdueWhere: Prisma.TicketWhereInput = {
    ...baseWhere,
    itStatus: "NEW",
    status: { notIn: ["CLOSED", "CANCELLED"] },
    slaDueAt: { lt: now },
  };

  const [rows, total, statusRows, overdueCount] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { assignedTo: { select: { displayName: true } } },
    }),
    prisma.ticket.count({ where }),
    prisma.ticket.groupBy({ by: ["status"], where: baseWhere, _count: { _all: true } }),
    prisma.ticket.count({ where: overdueWhere }),
  ]);

  const statusCount = Object.fromEntries(statusRows.map((row) => [row.status, row._count._all]));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({
    createdFrom,
    closedFrom,
    formType,
    status,
    site,
    q,
    sla: overdueOnly ? "overdue" : "",
    mine: mine && it ? "1" : "",
    assignee: assigneeMe ? "me" : "",
  }))
    if (v) qs.set(k, String(v));
  const exportHref = `/api/tickets/export?${qs.toString()}`;
  const pageHref = (p: number) => {
    const u = new URLSearchParams(qs);
    u.set("page", String(p));
    return `/tickets?${u.toString()}`;
  };
  if (page > pages) {
    const u = new URLSearchParams(qs);
    if (pages > 1) u.set("page", String(pages));
    redirect(`/tickets?${u.toString()}`);
  }
  const statusHref = (nextStatus: string) => {
    const u = new URLSearchParams(qs);
    u.set("status", nextStatus);
    u.delete("page");
    u.delete("sla");
    return `/tickets?${u.toString()}`;
  };
  const overdueHref = () => {
    const u = new URLSearchParams(qs);
    u.set("status", "open");
    u.set("sla", "overdue");
    u.delete("page");
    return `/tickets?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        chip="ศูนย์คำร้อง"
        title="รายการคำร้อง"
        count={total}
        subtitle="ค้นหา ติดตาม และดำเนินการกับคำร้องในระบบ"
        actions={
          <ButtonLink
            href={exportHref}
            variant="secondary"
            size="md"
          >
            ส่งออก Excel
          </ButtonLink>
        }
      />

      <section aria-label="สรุปสถานะคำร้อง" className="grid overflow-hidden rounded-md border border-border bg-card sm:grid-cols-4">
        <QueueMetric href={statusHref("open")} label="เปิดใหม่" count={statusCount.OPEN ?? 0} active={status === "open"} tone="amber" />
        <QueueMetric href={statusHref("in_progress")} label="กำลังดำเนินการ" count={statusCount.IN_PROGRESS ?? 0} active={status === "in_progress"} tone="brand" />
        <QueueMetric href={statusHref("resolved")} label="รอผู้แจ้งยืนยัน" count={statusCount.RESOLVED ?? 0} active={status === "resolved"} tone="amber" />
        <QueueMetric href={statusHref("closed")} label="ปิดแล้ว / ยกเลิก" count={(statusCount.CLOSED ?? 0) + (statusCount.CANCELLED ?? 0)} active={status === "closed"} tone="slate" />
      </section>

      {overdueCount > 0 && (
        <Link
          href={overdueHref()}
          aria-current={overdueOnly ? "page" : undefined}
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 border-l-4 border-red-500 bg-red-50/80 px-4 py-3 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500/40",
            overdueOnly && "ring-1 ring-inset ring-red-200",
          )}
        >
          <span>
            <span className="block text-sm font-semibold text-red-800">มีคำร้องเกิน SLA ที่ต้องติดตาม</span>
            <span className="mt-0.5 block text-xs text-red-700">คำร้องใหม่ที่ยังไม่ได้รับงานและเลยเวลาที่กำหนด</span>
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-red-700">{overdueCount} รายการ · ดูรายการ</span>
        </Link>
      )}

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50/70 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">ค้นหาคำร้อง</h2>
            <p className="mt-0.5 text-xs text-muted">
              กรองตามประเภท สถานะ บริษัท หรือผู้แจ้ง
              {activeFilterCount > 0 && <span className="ml-2 font-medium text-brand">· {activeFilterCount} ตัวกรองที่ใช้</span>}
              {overdueOnly && <span className="ml-2 font-medium text-red-600">· เฉพาะคำร้องเกิน SLA</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span aria-live="polite" className="text-xs tabular-nums text-muted">
              {total === 0 ? "ไม่พบรายการ" : `แสดง ${rangeStart}–${rangeEnd} จาก ${total}`}
            </span>
            {hasFilters && (
              <Link href="/tickets" className="rounded-sm text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2">
              ล้างตัวกรองทั้งหมด
              </Link>
            )}
          </div>
        </div>
        {activeFilterLabels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5 text-xs" aria-label="ตัวกรองที่กำลังใช้งาน">
            <span className="mr-1 font-medium text-muted">กำลังกรอง</span>
            {activeFilterLabels.map((label) => (
              <span key={label} className="rounded-full bg-brand-weak px-2 py-0.5 text-brand-strong">{label}</span>
            ))}
          </div>
        )}
        <TicketFilterDisclosure>
          <summary aria-controls="ticket-filters-panel" className="flex cursor-pointer list-none items-center justify-between rounded-sm border-b border-border px-4 py-3 text-sm font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35 lg:hidden">
            <span className="flex items-center gap-2">
              <span>แสดงตัวกรอง</span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-brand-weak px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-brand">
                  {activeFilterCount}
                </span>
              )}
            </span>
            <span className="text-xs font-normal text-muted group-open:hidden">แตะเพื่อค้นหาแบบละเอียด</span>
            <span className="hidden text-xs font-normal text-muted group-open:inline">ซ่อนตัวกรอง</span>
          </summary>
        <form id="ticket-filters-panel" method="get" aria-label="ตัวกรองรายการคำร้อง" className="p-4">
        {createdFrom && <input type="hidden" name="createdFrom" value={createdFrom} />}
        {closedFrom && <input type="hidden" name="closedFrom" value={closedFrom} />}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.45fr_1fr_1.35fr_auto]">
          <label className="flex flex-col gap-1 text-xs text-muted">
            <span className="font-medium text-slate-600">ประเภทฟอร์ม</span>
            <select name="formType" defaultValue={formType} className="control-select text-sm">
              <option value="">ทุกประเภท</option>
              {FORM_LIST.map((f) => (
                <option key={f.type} value={f.type}>
                  {f.code} · {f.shortTitle}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            <span className="font-medium text-slate-600">สถานะ</span>
            <select name="status" defaultValue={status} className="control-select text-sm">
              <optgroup label="กลุ่ม">
                <option value="active">กำลังดำเนินการ (เปิด + รับงาน + รอปิด)</option>
                <option value="closed">ปิดแล้ว / ยกเลิก</option>
                <option value="all">ทั้งหมด</option>
              </optgroup>
              <optgroup label="เจาะจงสถานะเดียว">
                <option value="open">เปิดเรื่อง (ยังไม่รับงาน)</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="resolved">รอผู้แจ้งยืนยัน</option>
                <option value="closed_only">ปิดงานแล้ว</option>
                <option value="cancelled">ยกเลิก</option>
              </optgroup>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            <span className="font-medium text-slate-600">บริษัท</span>
            <select name="site" defaultValue={site} className="control-select text-sm">
              <option value="">ทุกบริษัท</option>
              {SITES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            <span className="font-medium text-slate-600">ค้นหา</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="เลขเอกสาร / ชื่อผู้ขอ"
              className="control px-2.5 text-sm placeholder:text-slate-400"
            />
          </label>
          <Button type="submit" className="w-full self-end sm:w-auto">ค้นหา</Button>
        </div>
        {it && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3">
            <span className="w-full text-xs font-medium text-muted sm:w-auto sm:pr-1">มุมมองของฉัน</span>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" name="mine" value="1" defaultChecked={mine} className="h-4 w-4 rounded border-border text-brand accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1" />
              คำร้องที่ฉันแจ้ง
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" name="assignee" value="me" defaultChecked={assigneeMe} className="h-4 w-4 rounded border-border text-brand accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1" />
              งานที่มอบหมายให้ฉัน
            </label>
          </div>
        )}
        </form>
        </TicketFilterDisclosure>

      {/* mobile: stacked rows */}
      <ul className="divide-y divide-border border-t border-border lg:hidden" aria-label="รายการคำร้อง">
        {rows.map((t) => {
          const sla = computeSla({ slaDueAt: t.slaDueAt, itStatus: t.itStatus });
          return (
            <li key={t.id} className="p-4 transition-colors hover:bg-slate-50">
              <Link href={`/tickets/${t.id}`} aria-label={`เปิดคำร้อง ${t.docNo}`} className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-brand">{t.docNo}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {t.formType}
                  </span>
                  <span className="ml-auto">
                    <StatusBadge status={t.status} />
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-700">{t.userStatus}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span>{siteName(t.serviceSiteCode)}</span>
                  <span>· {t.reqName}</span>
                  {it && <span>· ผู้รับผิดชอบ: {t.assignedTo?.displayName ?? "ยังไม่มอบหมาย"}</span>}
                  <span>· {fmtDateTime(t.createdAt)}</span>
                </div>
                {sla.overdue && (
                  <div className="mt-1.5">
                    <Pill tone="red">{sla.text}</Pill>
                  </div>
                )}
              </Link>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="px-3 py-14 text-center text-sm text-slate-400">
            ไม่พบรายการที่ตรงกับเงื่อนไข
            {hasFilters && (
              <Link href="/tickets" className="ml-2 rounded-sm text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                ล้างตัวกรอง
              </Link>
            )}
          </li>
        )}
      </ul>

      {/* desktop: table */}
      <div role="region" aria-label="ตารางรายการคำร้อง" tabIndex={0} className="hidden overflow-x-auto border-t border-border focus-visible:ring-2 focus-visible:ring-brand/30 lg:block">
        <table className="min-w-[980px] w-full text-sm">
          <caption className="sr-only">รายการคำร้องทั้งหมด</caption>
          <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold tracking-wide text-muted">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left">เลขเอกสาร</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">ประเภท</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">บริษัท</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">สถานะงาน</th>
              <th className="min-w-[220px] px-4 py-3 text-left">ขั้นตอนล่าสุด</th>
              <th className="min-w-[150px] px-4 py-3 text-left">ผู้ขอ</th>
              {it && <th className="min-w-[170px] px-4 py-3 text-left">ผู้รับผิดชอบ</th>}
              <th className="whitespace-nowrap px-4 py-3 text-left">วันที่แจ้ง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((t) => {
              const sla = computeSla({ slaDueAt: t.slaDueAt, itStatus: t.itStatus });
              return (
                <tr
                  key={t.id}
                  className={cn(
                    "group relative cursor-pointer transition-colors hover:bg-brand-weak/35",
                    sla.overdue && "border-l-2 border-l-red-400 bg-red-50/20",
                  )}
                >
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <Link
                      href={`/tickets/${t.id}`}
                      aria-label={`เปิดคำร้อง ${t.docNo}`}
                      className="font-mono font-medium text-brand after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
                    >
                      {t.docNo}
                    </Link>
                    {sla.overdue && (
                      <div className="mt-0.5">
                        <Pill tone="red">{sla.text}</Pill>
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                      {t.formType}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600">{siteName(t.serviceSiteCode)}</td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700">{t.userStatus}</td>
                  <td className="px-4 py-3 align-top text-slate-600">{t.reqName}</td>
                  {it && (
                    <td className="px-4 py-3 align-top text-muted">
                      {t.assignedTo?.displayName ?? <span className="text-muted">ยังไม่มอบหมาย</span>}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-400">{fmtDateTime(t.createdAt)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={it ? 8 : 7} className="px-3 py-16 text-center text-sm text-slate-400">
                  ไม่พบรายการที่ตรงกับเงื่อนไข
                  {hasFilters && (
                    <>
                      {" — "}
                      <Link href="/tickets" className="rounded-sm text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                        ล้างตัวกรอง
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </section>

      {pages > 1 && (
        <nav aria-label="เปลี่ยนหน้ารายการคำร้อง" className="flex flex-wrap items-center justify-center gap-1.5 text-sm">
          <PageLink href={pageHref(1)} disabled={page === 1} label="หน้าแรก" />
          <PageLink href={pageHref(page - 1)} disabled={page === 1} label="ก่อนหน้า" />
          {windowed(page, pages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <Link
                key={p}
                href={pageHref(p)}
                aria-label={`หน้า ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={
                  p === page
                    ? "rounded-md bg-brand px-3 py-1 font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1"
                    : "rounded-md border border-border px-3 py-1 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                }
              >
                {p}
              </Link>
            ),
          )}
          <PageLink href={pageHref(page + 1)} disabled={page === pages} label="ถัดไป" />
          <PageLink href={pageHref(pages)} disabled={page === pages} label="หน้าสุดท้าย" />
        </nav>
      )}
    </div>
  );
}

function QueueMetric({
  href,
  label,
  count,
  active,
  tone,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  tone: "amber" | "brand" | "slate";
}) {
  const value = tone === "amber" ? "text-amber-700" : tone === "brand" ? "text-brand" : "text-slate-900";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "border-b border-border px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0",
        active
          ? "border-b-2 border-brand bg-brand-weak/45 sm:border-b-0 sm:border-l-2 sm:border-l-brand"
          : "hover:bg-surface-subtle",
      )}
    >
      <span className="block text-xs text-muted">{label}</span>
      <span className={cn("mt-0.5 block text-xl font-semibold tabular-nums", value)}>{count}</span>
    </Link>
  );
}

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) {
    return <span aria-disabled="true" className="rounded-md border border-border px-3 py-1 text-slate-300">{label}</span>;
  }
  return (
    <Link href={href} className="rounded-md border border-border px-3 py-1 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
      {label}
    </Link>
  );
}

/** page numbers to show: 1, current-1..current+1, last, with "…" gaps */
function windowed(current: number, last: number): (number | "…")[] {
  const out = new Set<number>([1, last, current, current - 1, current + 1]);
  const sorted = [...out].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}
