import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  Hourglass,
  Inbox,
  Loader2,
  PackageX,
  Star,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isIT, STATUS_LABEL, SITES, siteName } from "@/lib/constants";
import { FORM_LIST } from "@/lib/form-defs";
import { computeSla } from "@/lib/sla";
import { overdueLoans } from "@/lib/loans";
import { Pill } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { fmtDateTime, fmtDate, cn } from "@/lib/ui";
import { DashboardFilters } from "./DashboardFilters";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"] as const;

const STATUS_DOT_COLOR: Record<(typeof STATUSES)[number], string> = {
  OPEN: "bg-amber-400",
  IN_PROGRESS: "bg-brand",
  RESOLVED: "bg-amber-500",
  CLOSED: "bg-slate-400",
  CANCELLED: "bg-slate-300",
};

const RANGE_WORD: Record<string, string> = {
  "7d": "7 วันล่าสุด",
  "30d": "30 วันล่าสุด",
  month: "เดือนนี้",
  all: "ทั้งหมด",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; site?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isIT(user.role)) redirect("/");

  const sp = await searchParams;
  const range = ["7d", "30d", "month", "all"].includes(sp.range ?? "") ? sp.range! : "30d";
  const site = SITES.some((s) => s.code === sp.site) ? sp.site! : "";

  const now = new Date();
  const from =
    range === "all"
      ? null
      : range === "month"
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getTime() - (range === "7d" ? 7 : 30) * 86_400_000);

  const siteWhere = site ? { serviceSiteCode: site } : {};
  const createdWhere = from ? { createdAt: { gte: from } } : {};
  const evalWhere = {
    ...(from ? { createdAt: { gte: from } } : {}),
    ...(site ? { ticket: { serviceSiteCode: site } } : {}),
  };

  const [
    openCount,
    inProgress,
    resolvedWaiting,
    createdInRange,
    closedInRange,
    newUnreceived,
    byForm,
    byAssignee,
    evalAgg,
    evalDist,
    recentEvals,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "RESOLVED"] }, ...siteWhere } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS", ...siteWhere } }),
    prisma.ticket.count({ where: { status: "RESOLVED", ...siteWhere } }),
    prisma.ticket.count({ where: { status: { not: "CANCELLED" }, ...siteWhere, ...createdWhere } }),
    prisma.ticket.count({
      where: { status: "CLOSED", ...siteWhere, ...(from ? { closedAt: { gte: from } } : {}) },
    }),
    prisma.ticket.findMany({
      where: { itStatus: "NEW", status: { notIn: ["CLOSED", "CANCELLED"] }, ...siteWhere },
      select: {
        id: true,
        docNo: true,
        formType: true,
        slaDueAt: true,
        itStatus: true,
        reqName: true,
        createdAt: true,
        userStatus: true,
      },
      orderBy: { slaDueAt: "asc" },
    }),
    prisma.ticket.groupBy({
      by: ["formType", "status"],
      where: { ...siteWhere, ...createdWhere },
      _count: { _all: true },
    }),
    prisma.ticket.groupBy({
      by: ["assignedToId"],
      where: { status: { in: ["IN_PROGRESS", "RESOLVED"] }, assignedToId: { not: null }, ...siteWhere },
      _count: { _all: true },
    }),
    prisma.evaluation.aggregate({
      _avg: { score: true, scoreQuality: true, scoreSpeed: true },
      _count: { _all: true },
      where: evalWhere,
    }),
    prisma.evaluation.groupBy({ by: ["score"], _count: { _all: true }, where: evalWhere }),
    prisma.evaluation.findMany({
      where: evalWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        score: true,
        scoreQuality: true,
        scoreSpeed: true,
        comment: true,
        createdAt: true,
        ticket: { select: { id: true, docNo: true, formType: true } },
      },
    }),
  ]);

  const loansLate = await overdueLoans(site || undefined);

  const overdue = newUnreceived
    .map((t) => ({ t, sla: computeSla({ slaDueAt: t.slaDueAt, itStatus: t.itStatus, now }) }))
    .filter((x) => x.sla.overdue);

  const staffIds = byAssignee.map((r) => r.assignedToId!).filter(Boolean);
  const staff = staffIds.length
    ? await prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, displayName: true } })
    : [];
  const staffName = (id: number | null) => staff.find((s) => s.id === id)?.displayName ?? "-";

  // pivot byForm -> { formType: { status: n } }
  const formPivot: Record<string, Record<string, number>> = {};
  for (const r of byForm) {
    (formPivot[r.formType] ??= {})[r.status] = r._count._all;
  }

  const rangeWord = RANGE_WORD[range];
  const scoped = `${site ? siteName(site) : "ทุกบริษัท"} · ${rangeWord}`;
  const workloadMax = Math.max(1, ...byAssignee.map((r) => r._count._all));
  // three evaluation dimensions (legacy parity): satisfaction / quality /
  // speed. Old single-score rows have null quality/speed — Prisma _avg skips
  // nulls, so each axis averages over the rows that have it. The headline is
  // the mean of whichever axis averages exist.
  const dimAvgs = [
    { label: "พึงพอใจ", value: evalAgg._avg.score },
    { label: "เรียบร้อย", value: evalAgg._avg.scoreQuality },
    { label: "รวดเร็ว", value: evalAgg._avg.scoreSpeed },
  ];
  const presentAvgs = dimAvgs.map((d) => d.value).filter((v): v is number => v != null);
  const avgScore = presentAvgs.length ? presentAvgs.reduce((a, b) => a + b, 0) / presentAvgs.length : null;
  const rowAvg = (e: { score: number; scoreQuality: number | null; scoreSpeed: number | null }) => {
    const vals = [e.score, e.scoreQuality, e.scoreSpeed].filter((v): v is number => v != null);
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };
  const ticketSiteQuery = site ? `&site=${site}` : "";
  const activeQueueHref = `/tickets?status=active${ticketSiteQuery}`;
  const inProgressHref = `/tickets?status=in_progress${ticketSiteQuery}`;
  const resolvedHref = `/tickets?status=resolved${ticketSiteQuery}`;
  const closedHref = `/tickets?status=closed_only${ticketSiteQuery}${from ? `&closedFrom=${encodeURIComponent(from.toISOString())}` : ""}`;
  const formHref = (formType: string) => `/tickets?status=all&formType=${formType}${ticketSiteQuery}${from ? `&createdFrom=${encodeURIComponent(from.toISOString())}` : ""}`;
  const urgentCount = overdue.length + loansLate.length;
  const firstOverdue = overdue[0];
  const priorityHref = firstOverdue
    ? `/tickets/${firstOverdue.t.id}`
    : loansLate.length
      ? `/loans?view=overdue${site ? `&site=${site}` : ""}`
      : activeQueueHref;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <PageHeader
        title="แดชบอร์ด"
        subtitle={`ภาพรวมงาน IT · ${scoped}`}
        actions={<DashboardFilters sites={SITES} range={range} site={site} />}
      />

      <section
        className={cn(
          "overflow-hidden rounded-md border bg-card shadow-sm",
          urgentCount > 0 ? "border-red-200/70 ring-1 ring-red-100" : "border-border",
        )}
      >
        <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="px-5 py-5 sm:px-6">
            <p
              className={cn(
                "text-[11px] font-semibold tracking-[0.16em]",
                urgentCount > 0 ? "text-red-500" : "text-brand",
              )}
            >
              ลำดับความสำคัญวันนี้
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className={cn("text-2xl font-bold sm:text-3xl", urgentCount > 0 ? "text-red-600" : "text-slate-900")}>
                {urgentCount > 0 ? `${urgentCount} รายการต้องจัดการก่อน` : "ไม่มีงานเร่งด่วน"}
              </h2>
              <span className="text-sm text-muted">ข้อมูลสถานะปัจจุบัน</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {firstOverdue
                ? `งานที่เกินเวลามากที่สุด ${firstOverdue.t.docNo} · ${firstOverdue.sla.text}`
                : loansLate.length
                  ? "ไม่มีคำร้องเกิน SLA แต่ยังมีอุปกรณ์ที่เลยกำหนดคืน"
                  : "คำร้องใหม่ยังอยู่ใน SLA และไม่มีอุปกรณ์เลยกำหนดคืน"}
            </p>
          </div>

          <div className="grid grid-cols-2 border-t border-border bg-slate-50/60 lg:border-t-0 lg:border-l">
            <div className="border-r border-border px-5 py-4">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <AlertTriangle size={12} aria-hidden="true" />
                </span>
                เกิน SLA
              </div>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">{overdue.length}</p>
              <p className="text-[11px] text-slate-400">ยังไม่รับงาน</p>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                  <PackageX size={12} aria-hidden="true" />
                </span>
                เกินกำหนดคืน
              </div>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">{loansLate.length}</p>
              <p className="text-[11px] text-slate-400">รายการอุปกรณ์</p>
            </div>
            <Link
              href={priorityHref}
              className="col-span-2 flex items-center justify-between border-t border-border px-5 py-3 text-sm font-medium text-brand transition-colors hover:bg-brand-weak/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
            >
              <span>{urgentCount > 0 ? "เปิดรายการที่ควรทำก่อน" : "เปิดคิวงานทั้งหมด"}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="สรุปตัวชี้วัด" className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-3 xl:grid-cols-6">
        <Kpi
          icon={Inbox}
          label="เปิดค้างทั้งหมด"
          sub="สถานะปัจจุบัน"
          value={openCount}
          href={activeQueueHref}
        />
        <Kpi icon={Loader2} label="กำลังดำเนินการ" sub="สถานะปัจจุบัน" value={inProgress} href={inProgressHref} />
        <Kpi icon={Hourglass} label="รอผู้แจ้งยืนยัน" sub="สถานะปัจจุบัน" value={resolvedWaiting} href={resolvedHref} />
        <Kpi icon={FilePlus2} label="งานเข้าใหม่" sub={rangeWord} value={createdInRange} />
        <Kpi icon={CheckCircle2} label="ปิดงาน" sub={rangeWord} value={closedInRange} href={closedHref} />
        <Kpi
          icon={Star}
          label="ความพึงพอใจ"
          sub={`${rangeWord} · ${evalAgg._count._all} รายการ`}
          value={avgScore ? avgScore.toFixed(2) : "—"}
        />
      </section>

      {loansLate.length > 0 && (
        <section className="card p-5">
          <SectionTitle icon={PackageX} tone="amber">
            อุปกรณ์เลยกำหนดคืน
          </SectionTitle>
          <ul className="mt-3 divide-y divide-border text-sm">
            {loansLate.map((l) => {
              const days = Math.max(1, Math.ceil((now.getTime() - new Date(l.dueDate).getTime()) / 86_400_000));
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="font-medium text-slate-700">{l.item.name}</span>
                  <span className="text-muted">{l.borrowerName}</span>
                  <span className="text-xs text-slate-400">กำหนดคืน {fmtDate(l.dueDate)}</span>
                  <Pill tone="red">เลย {days} วัน</Pill>
                  {l.ticket && (
                    <Link
                      href={`/tickets/${l.ticket.id}`}
                      aria-label={`เปิดคำร้อง ${l.ticket.docNo}`}
                      className="ml-auto rounded-sm font-mono text-xs text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                    >
                      {l.ticket.docNo}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-md border border-border bg-card lg:border-0 lg:bg-transparent">
        <input id="dashboard-report-toggle" type="checkbox" className="peer sr-only" />
        <label htmlFor="dashboard-report-toggle" className="flex cursor-pointer items-center justify-between gap-4 p-4 focus-within:ring-2 focus-within:ring-brand/35 sm:p-5 lg:hidden">
          <div>
            <p className="font-semibold text-slate-900">รายงานและรายละเอียดเพิ่มเติม</p>
            <p className="mt-0.5 text-xs text-muted">แยกตามแบบฟอร์ม · งานเกิน SLA · ภาระงาน · ผลประเมิน</p>
          </div>
          <span aria-hidden="true" className="shrink-0 text-sm text-muted">⌄</span>
        </label>
        <div className="dashboard-report-content space-y-6 border-t border-border bg-surface-subtle/30 p-4 sm:p-5 lg:border-0 lg:bg-transparent lg:p-0">
      <section className="card p-5">
        <SectionTitle>แยกตามประเภทแบบฟอร์ม</SectionTitle>
        <p className="mt-0.5 text-xs text-muted">นับจากงานที่สร้างในช่วง {rangeWord}</p>
        <ul className="mt-4 space-y-2 lg:hidden" aria-label="สรุปคำร้องตามประเภทฟอร์ม">
          {FORM_LIST.map((f) => {
            const row = formPivot[f.type] ?? {};
            const total = STATUSES.reduce((sum, s) => sum + (row[s] ?? 0), 0);
            return (
              <li key={f.type} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <Link href={formHref(f.type)} className="min-w-0 rounded-sm text-sm font-medium text-slate-800 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                    <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{f.code}</span>
                    {f.shortTitle}
                  </Link>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{total}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {STATUSES.filter((s) => row[s]).map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-1 text-[11px] text-slate-600">
                      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_COLOR[s])} aria-hidden="true" />
                      {STATUS_LABEL[s]} {row[s]}
                    </span>
                  ))}
                  {total === 0 && <span className="text-[11px] text-slate-400">ยังไม่มีรายการในช่วงนี้</span>}
                </div>
              </li>
            );
          })}
        </ul>

        <div role="region" aria-label="ตารางสรุปคำร้องตามประเภทฟอร์ม" tabIndex={0} className="mt-4 hidden overflow-x-auto focus-visible:ring-2 focus-visible:ring-brand/30 lg:block">
          <table className="w-full min-w-[620px] text-sm">
            <caption className="sr-only">สรุปจำนวนคำร้องแยกตามประเภทฟอร์มและสถานะ</caption>
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-2 pb-2 text-left font-medium">ฟอร์ม</th>
                {STATUSES.map((s) => (
                  <th key={s} className="px-2 pb-2 text-right font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", STATUS_DOT_COLOR[s])} aria-hidden="true" />
                      {STATUS_LABEL[s]}
                    </span>
                  </th>
                ))}
                <th className="px-2 pb-2 text-right font-semibold text-slate-600">รวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {FORM_LIST.map((f) => {
                const row = formPivot[f.type] ?? {};
                const total = STATUSES.reduce((sum, s) => sum + (row[s] ?? 0), 0);
                return (
                  <tr key={f.type} className="transition-colors hover:bg-brand-weak/20">
                    <td className="px-2 py-2.5">
                      <Link
                        href={formHref(f.type)}
                        className="inline-flex items-center gap-2 rounded-sm text-slate-700 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                      >
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{f.code}</span>
                        <span className="hidden sm:inline">{f.shortTitle}</span>
                      </Link>
                    </td>
                    {STATUSES.map((s) => (
                      <td
                        key={s}
                        className={cn(
                          "px-2 py-2.5 text-right tabular-nums",
                          row[s] ? "text-slate-600" : "text-slate-300",
                        )}
                      >
                        {row[s] ?? 0}
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-slate-800">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <SectionTitle icon={AlertTriangle} tone="red">
            งานเกิน SLA (ยังไม่รับงาน)
          </SectionTitle>
          {overdue.length === 0 ? (
            <EmptyLine>ไม่มีงานที่เกิน SLA — ตามทันทุกงาน</EmptyLine>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {overdue.slice(0, 10).map(({ t, sla }) => (
                <li
                  key={t.id}
                  className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border-l-2 border-red-400 bg-red-50/40 py-2 pr-2 pl-3"
                >
                  <Link href={`/tickets/${t.id}`} aria-label={`เปิดคำร้อง ${t.docNo}`} className="rounded-sm font-mono text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                    {t.docNo}
                  </Link>
                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-600 ring-1 ring-border">
                    {t.formType}
                  </span>
                   <span className="min-w-0 flex-1 line-clamp-2 break-words text-muted" title={t.reqName}>{t.reqName}</span>
                   <span className="w-full text-xs font-medium leading-5 text-red-700">{sla.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <SectionTitle>โหลดงานต่อเจ้าหน้าที่</SectionTitle>
          {byAssignee.length === 0 ? (
            <EmptyLine>ยังไม่มีงานที่มอบหมาย</EmptyLine>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {byAssignee
                .slice()
                .sort((a, b) => b._count._all - a._count._all)
                .map((r) => {
                  const name = staffName(r.assignedToId);
                  return (
                    <li key={r.assignedToId} className="flex items-center gap-3">
                      <Avatar name={name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                           <span className="truncate text-slate-700" title={name}>{name}</span>
                          <span className="shrink-0 tabular-nums text-xs text-muted">
                            {r._count._all} งาน
                          </span>
                        </div>
                        <div
                          className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"
                          role="progressbar"
                          aria-label={`สัดส่วนงานของ ${name}`}
                          aria-valuemin={0}
                          aria-valuemax={workloadMax}
                          aria-valuenow={r._count._all}
                        >
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${(r._count._all / workloadMax) * 100}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <SectionTitle icon={Star} tone="amber">
          ประเมินความพึงพอใจ
        </SectionTitle>
        <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
          <span className="text-3xl font-bold text-amber-500">
            {avgScore ? avgScore.toFixed(2) : "—"}
          </span>
          <span className="pb-1 text-sm text-slate-400">
            เฉลี่ยจาก {evalAgg._count._all} รายการ · {rangeWord}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {dimAvgs.map((d) => (
            <span key={d.label} className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
              {d.label} <span className="font-semibold tabular-nums">{d.value != null ? d.value.toFixed(2) : "—"}</span>
            </span>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {[5, 4, 3, 2, 1].map((s) => {
            const n = evalDist.find((d) => d.score === s)?._count._all ?? 0;
            const pct = evalAgg._count._all ? (n / evalAgg._count._all) * 100 : 0;
            return (
              <div key={s} className="flex items-center gap-2 text-sm">
                <span className="inline-flex w-9 shrink-0 items-center gap-1 text-muted">
                  {s}
                  <Star size={12} fill="currentColor" aria-hidden="true" />
                </span>
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label={`${s} คะแนน`}
                  aria-valuemin={0}
                  aria-valuemax={evalAgg._count._all}
                  aria-valuenow={n}
                >
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right tabular-nums text-xs text-slate-400">{n}</span>
              </div>
            );
          })}
        </div>
        {recentEvals.length > 0 && (
          <ul className="mt-4 divide-y divide-border text-sm">
            {recentEvals.map((e) => (
               <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-2">
                <Link href={`/tickets/${e.ticket.id}`} aria-label={`เปิดคำร้อง ${e.ticket.docNo}`} className="rounded-sm font-mono text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                  {e.ticket.docNo}
                </Link>{" "}
                <span
                  role="img"
                  aria-label={`เฉลี่ย ${rowAvg(e)} จาก 5 คะแนน`}
                  className="inline-flex items-center gap-1 text-amber-500"
                >
                  <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: Math.round(rowAvg(e)) }, (_, index) => (
                      <Star key={index} size={13} fill="currentColor" aria-hidden="true" />
                    ))}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">{rowAvg(e).toFixed(1)}</span>
                </span>
                 {e.comment && <span className="min-w-full break-words text-slate-600">{e.comment}</span>}
                 <span className="text-xs text-slate-400">{fmtDateTime(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div
      className={cn(
        "h-full bg-card p-4",
        href && "group transition hover:bg-brand-weak/25",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {/* docs/ui-foundation.md: category icons stay monochrome — one brand
            tint for every KPI tile, differentiated by icon + number only. */}
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-weak text-brand">
          <Icon size={17} aria-hidden="true" />
        </span>
        {href && <span aria-hidden="true" className="text-xs text-slate-300 transition-colors group-hover:text-brand">→</span>}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-600">{label}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
    >
      {inner}
    </Link>
  ) : inner;
}

function SectionTitle({
  children,
  icon: Icon,
  tone = "slate",
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  tone?: "slate" | "red" | "amber";
}) {
  const tile =
    tone === "red"
      ? "bg-red-50 text-red-500"
      : tone === "amber"
        ? "bg-amber-50 text-amber-500"
        : "bg-slate-100 text-muted";
  return (
    <h2 className="flex items-center gap-2.5 font-semibold text-slate-900">
      {Icon && (
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", tile)}>
          <Icon size={14} aria-hidden="true" />
        </span>
      )}
      {children}
    </h2>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-md bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">{children}</p>;
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-weak text-xs font-semibold text-brand">
      {initials || "?"}
    </span>
  );
}
