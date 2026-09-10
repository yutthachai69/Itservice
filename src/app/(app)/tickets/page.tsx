import Link from "next/link";
import { TicketFilterDisclosure } from "./TicketFilterDisclosure";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SITES, siteName, isIT } from "@/lib/constants";
import { FORM_LIST } from "@/lib/form-defs";
import { StatusBadge, Pill } from "@/components/Badge";
import { fmtDateTime } from "@/lib/ui";
import { computeSla } from "@/lib/sla";

const PAGE_SIZE = 20;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function TicketsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;
  const it = isIT(user.role);

  const formType = one(sp.formType);
  const status = one(sp.status) || "active";
  const site = one(sp.site);
  const q = one(sp.q).trim();
  const mine = one(sp.mine) === "1" || !it;
  const assigneeMe = it && one(sp.assignee) === "me";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const hasFilters =
    !!formType || status !== "active" || !!site || !!q || (it && mine) || assigneeMe;

  const where: Prisma.TicketWhereInput = {};
  if (mine) where.requesterId = user.id;
  if (assigneeMe) where.assignedToId = user.id;
  if (formType) where.formType = formType;
  if (site) where.serviceSiteCode = site;
  if (status === "active") where.status = { in: ["OPEN", "IN_PROGRESS", "RESOLVED"] };
  else if (status === "closed") where.status = { in: ["CLOSED", "CANCELLED"] };
  else if (status === "closed_only") where.status = "CLOSED";
  else if (status !== "all") where.status = status.toUpperCase();
  if (q) {
    where.OR = [
      { docNo: { contains: q } },
      { reqName: { contains: q } },
      { note: { contains: q } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { assignedTo: { select: { displayName: true } } },
    }),
    prisma.ticket.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({
    formType,
    status,
    site,
    q,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">ศูนย์คำร้อง</p>
          <h1 className="font-display text-2xl text-slate-900">
            รายการคำร้อง <span className="font-sans text-base font-normal text-slate-400">{total} รายการ</span>
          </h1>
          <p className="mt-1 text-sm text-muted">ค้นหา ติดตาม และดำเนินการกับคำร้องในระบบ</p>
        </div>
        <a
          href={exportHref}
          className="inline-flex h-10 items-center rounded-lg border border-border-strong px-3.5 text-sm font-medium text-slate-700 transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand"
        >
          ส่งออก Excel
        </a>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50/70 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">ค้นหาคำร้อง</h2>
            <p className="mt-0.5 text-xs text-muted">กรองตามประเภท สถานะ บริษัท หรือผู้แจ้ง</p>
          </div>
          {hasFilters && (
            <Link href="/tickets" className="text-xs font-medium text-brand hover:underline">
              ล้างตัวกรองทั้งหมด
            </Link>
          )}
        </div>
        <TicketFilterDisclosure>
          <summary className="flex cursor-pointer list-none items-center justify-between border-b border-border px-4 py-3 text-sm font-medium text-slate-700 lg:hidden">
            <span>แสดงตัวกรอง</span>
            <span className="text-xs font-normal text-muted group-open:hidden">แตะเพื่อค้นหาแบบละเอียด</span>
            <span className="hidden text-xs font-normal text-muted group-open:inline">ซ่อนตัวกรอง</span>
          </summary>
        <form className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.45fr_1fr_1.35fr_auto]">
          <label className="flex flex-col gap-1 text-xs text-muted">
            <span className="font-medium text-slate-600">ประเภทฟอร์ม</span>
            <select name="formType" defaultValue={formType} className="h-10 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15">
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
            <select name="status" defaultValue={status} className="h-10 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15">
              <optgroup label="กลุ่ม">
                <option value="active">กำลังดำเนินการ (เปิด + รับงาน + รอปิด)</option>
                <option value="closed">ปิดแล้ว / ยกเลิก</option>
                <option value="all">ทั้งหมด</option>
              </optgroup>
              <optgroup label="เจาะจงสถานะเดียว">
                <option value="open">เปิดเรื่อง (ยังไม่รับงาน)</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="resolved">เสร็จ รอผู้แจ้งยืนยัน</option>
                <option value="closed_only">ปิดงานแล้ว</option>
                <option value="cancelled">ยกเลิก</option>
              </optgroup>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            <span className="font-medium text-slate-600">บริษัท</span>
            <select name="site" defaultValue={site} className="h-10 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15">
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
              className="h-10 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>
          <button className="h-10 self-end rounded-lg bg-brand px-5 text-sm font-medium text-white transition hover:bg-brand-strong focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2">
            ค้นหา
          </button>
        </div>
        {it && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3">
            <span className="w-full text-xs font-medium text-slate-500 sm:w-auto sm:pr-1">มุมมองของฉัน</span>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" name="mine" value="1" defaultChecked={mine} className="h-4 w-4 rounded border-border text-brand accent-brand" />
              คำร้องที่ฉันแจ้ง
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" name="assignee" value="me" defaultChecked={assigneeMe} className="h-4 w-4 rounded border-border text-brand accent-brand" />
              งานที่มอบหมายให้ฉัน
            </label>
          </div>
        )}
        </form>
        </TicketFilterDisclosure>

      {/* mobile: stacked rows */}
      <ul className="divide-y divide-border border-t border-border lg:hidden">
        {rows.map((t) => {
          const sla = computeSla({ slaDueAt: t.slaDueAt, itStatus: t.itStatus });
          return (
            <li key={t.id} className="p-4 transition-colors hover:bg-slate-50">
              <Link href={`/tickets/${t.id}`} className="block">
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
          </li>
        )}
      </ul>

      {/* desktop: table */}
      <div className="hidden overflow-x-auto border-t border-border lg:block">
        <table className="min-w-[980px] w-full text-sm">
          <caption className="sr-only">รายการคำร้องทั้งหมด</caption>
          <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500">
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
                <tr key={t.id} className="group relative transition-colors hover:bg-brand-weak/35">
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <Link
                      href={`/tickets/${t.id}`}
                      className="font-mono font-medium text-brand after:absolute after:inset-0 hover:underline"
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
                    <td className="px-4 py-3 align-top text-slate-500">
                      {t.assignedTo?.displayName ?? <span className="text-slate-300">ยังไม่มอบหมาย</span>}
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
                      <Link href="/tickets" className="text-brand hover:underline">
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
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm">
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
                aria-current={p === page ? "page" : undefined}
                className={
                  p === page
                    ? "rounded-lg bg-brand px-3 py-1 font-medium text-white"
                    : "rounded-lg border border-border px-3 py-1 text-slate-600 transition hover:bg-slate-50"
                }
              >
                {p}
              </Link>
            ),
          )}
          <PageLink href={pageHref(page + 1)} disabled={page === pages} label="ถัดไป" />
          <PageLink href={pageHref(pages)} disabled={page === pages} label="หน้าสุดท้าย" />
        </div>
      )}
    </div>
  );
}

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) {
    return <span className="rounded-lg border border-border px-3 py-1 text-slate-300">{label}</span>;
  }
  return (
    <Link href={href} className="rounded-lg border border-border px-3 py-1 text-slate-600 transition hover:bg-slate-50">
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
