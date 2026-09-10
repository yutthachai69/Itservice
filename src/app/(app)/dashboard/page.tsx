import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isIT, STATUS_LABEL } from "@/lib/constants";
import { FORM_LIST } from "@/lib/form-defs";
import { computeSla } from "@/lib/sla";
import { overdueLoans } from "@/lib/loans";
import { StatusBadge, Pill } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { fmtDateTime, fmtDate } from "@/lib/ui";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isIT(user.role)) redirect("/");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    openCount,
    inProgress,
    resolvedWaiting,
    closedThisMonth,
    newUnreceived,
    byForm,
    byAssignee,
    evalAgg,
    evalDist,
    recentEvals,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "RESOLVED"] } } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { status: "RESOLVED" } }),
    prisma.ticket.count({ where: { status: "CLOSED", closedAt: { gte: monthStart } } }),
    prisma.ticket.findMany({
      where: { itStatus: "NEW", status: { not: "CANCELLED" } },
      select: { id: true, docNo: true, formType: true, slaDueAt: true, itStatus: true, reqName: true, createdAt: true, userStatus: true },
      orderBy: { slaDueAt: "asc" },
    }),
    prisma.ticket.groupBy({
      by: ["formType", "status"],
      _count: { _all: true },
    }),
    prisma.ticket.groupBy({
      by: ["assignedToId"],
      where: { status: { in: ["IN_PROGRESS", "RESOLVED"] }, assignedToId: { not: null } },
      _count: { _all: true },
    }),
    prisma.evaluation.aggregate({ _avg: { score: true }, _count: { _all: true } }),
    prisma.evaluation.groupBy({ by: ["score"], _count: { _all: true } }),
    prisma.evaluation.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { ticket: { select: { id: true, docNo: true, formType: true } } },
    }),
  ]);

  const loansLate = await overdueLoans();

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

  return (
    <div className="space-y-6">
      <PageHeader title="แดชบอร์ด" subtitle="ภาพรวมงาน IT ทั้งหมด อัปเดตแบบเรียลไทม์" />

      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="เปิดค้างทั้งหมด" value={openCount} href="/tickets?status=active" />
        <Kpi label="กำลังดำเนินการ" value={inProgress} tone="blue" />
        <Kpi label="เกิน SLA" value={overdue.length} tone="red" />
        <Kpi label="รอผู้แจ้งยืนยัน" value={resolvedWaiting} tone="blue" />
        <Kpi label="เลยกำหนดคืน" value={loansLate.length} tone="red" />
        <Kpi label="ปิดงานเดือนนี้" value={closedThisMonth} tone="blue" />
      </div>

      {loansLate.length > 0 && (
        <section className="card p-5">
          <h2 className="font-medium text-slate-900">อุปกรณ์เลยกำหนดคืน</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {loansLate.map((l) => {
              const days = Math.floor((now.getTime() - new Date(l.dueDate).getTime()) / 86400000);
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="font-medium text-slate-700">{l.item.name}</span>
                  <span className="text-slate-500">{l.borrowerName}</span>
                  <span className="text-xs text-slate-400">กำหนดคืน {fmtDate(l.dueDate)}</span>
                  <Pill tone="red">เลย {days} วัน</Pill>
                  {l.ticket && (
                    <Link href={`/tickets/${l.ticket.id}`} className="ml-auto font-mono text-xs text-brand hover:underline">
                      {l.ticket.docNo}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card p-5">
        <h2 className="font-medium text-slate-900">แยกตามประเภทแบบฟอร์ม</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-2 py-1 text-left font-medium">ฟอร์ม</th>
                {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"].map((s) => (
                  <th key={s} className="px-2 py-1 text-right font-medium">
                    {STATUS_LABEL[s]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {FORM_LIST.map((f) => {
                const row = formPivot[f.type] ?? {};
                return (
                  <tr key={f.type}>
                    <td className="px-2 py-1.5 text-slate-700">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{f.code}</span>{" "}
                      {f.shortTitle}
                    </td>
                    {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"].map((s) => (
                      <td key={s} className="px-2 py-1.5 text-right tabular-nums text-slate-600">
                        {row[s] ?? 0}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-medium text-slate-900">งานเกิน SLA (ยังไม่รับงาน)</h2>
          {overdue.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">ไม่มี</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {overdue.slice(0, 10).map(({ t, sla }) => (
                <li key={t.id} className="flex items-center gap-2 py-2">
                  <Link href={`/tickets/${t.id}`} className="font-mono text-brand hover:underline">
                    {t.docNo}
                  </Link>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{t.formType}</span>
                  <span className="flex-1 truncate text-slate-500">{t.reqName}</span>
                  <Pill tone="red">{sla.text}</Pill>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-medium text-slate-900">โหลดงานต่อเจ้าหน้าที่</h2>
          {byAssignee.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">ไม่มีงานที่มอบหมาย</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {byAssignee
                .sort((a, b) => b._count._all - a._count._all)
                .map((r) => (
                  <li key={r.assignedToId} className="flex items-center gap-2">
                    <span className="flex-1 text-slate-700">{staffName(r.assignedToId)}</span>
                    <span className="tabular-nums text-slate-500">{r._count._all} งาน</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-baseline gap-3">
          <h2 className="font-medium text-slate-900">รวมประเมินความพึงพอใจ</h2>
          <span className="text-2xl font-semibold text-amber-500">
            {evalAgg._avg.score ? evalAgg._avg.score.toFixed(2) : "-"}
          </span>
          <span className="text-sm text-slate-400">จาก {evalAgg._count._all} รายการ</span>
        </div>
        <div className="mt-3 space-y-1">
          {[5, 4, 3, 2, 1].map((s) => {
            const n = evalDist.find((d) => d.score === s)?._count._all ?? 0;
            const pct = evalAgg._count._all ? (n / evalAgg._count._all) * 100 : 0;
            return (
              <div key={s} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-slate-500">{s} ★</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                  <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right tabular-nums text-slate-400">{n}</span>
              </div>
            );
          })}
        </div>
        {recentEvals.length > 0 && (
          <ul className="mt-4 divide-y divide-border text-sm">
            {recentEvals.map((e) => (
              <li key={e.id} className="py-2">
                <Link href={`/tickets/${e.ticket.id}`} className="font-mono text-brand hover:underline">
                  {e.ticket.docNo}
                </Link>{" "}
                <span className="text-amber-500">{"★".repeat(e.score)}</span>
                {e.comment && <span className="text-slate-600"> — {e.comment}</span>}
                <span className="ml-2 text-xs text-slate-400">{fmtDateTime(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "blue",
  href,
}: {
  label: string;
  value: number;
  tone?: "blue" | "red";
  href?: string;
}) {
  const tones: Record<string, string> = {
    blue: "text-brand",
    red: "text-red-600",
  };
  const inner = (
    <div className="bg-card p-4 transition-colors hover:bg-brand-weak/30">
      <div className={`text-2xl font-semibold ${tones[tone]}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

void StatusBadge;
