import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Inbox,
  ListChecks,
  PackageCheck,
  TimerReset,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FORM_LIST } from "@/lib/form-defs";
import { SERVICE_ICON } from "@/lib/doc-meta";
import { isIT } from "@/lib/constants";
import { computeSla } from "@/lib/sla";
import { Pill, StatusBadge } from "@/components/Badge";
import { Card, CardHeader } from "@/components/Card";
import Image from "next/image";
import { fmtDateTime, cn } from "@/lib/ui";
import { EmptyInboxArt } from "./HomeArt";
import { ButtonLink } from "@/components/Button";

// docs/ui-foundation.md: category icons stay monochrome — one brand tint for
// every service card instead of a color per form type. Icon comes from the
// shared SERVICE_ICON map; only the home-page-specific title/description
// copy lives here.
const SERVICE_META: Record<string, { title: string; description: string }> = {
  F06: { title: "แจ้งปัญหา IT", description: "คอมพิวเตอร์ โปรแกรม อินเทอร์เน็ต หรืออุปกรณ์มีปัญหา" },
  F11: { title: "แก้ไขรหัสผ่าน", description: "รีเซ็ตรหัสผ่านคอมพิวเตอร์ อีเมล หรือระบบงาน" },
  F10: { title: "ขอสิทธิ์ใช้งานระบบ", description: "เพิ่ม เปลี่ยน หรือยกเลิกสิทธิ์ระบบ" },
  F13: { title: "ขอสิทธิ์ Softpro", description: "ขอ/ปรับปรุงสิทธิ์การใช้งานระบบ ERP Softpro" },
  F03: { title: "ขอยืมอุปกรณ์", description: "โน้ตบุ๊ก โปรเจกเตอร์ จอมอนิเตอร์ และอุปกรณ์เสริม" },
  F12: { title: "ขอจัดประชุมออนไลน์", description: "เตรียมระบบ Video Conference สำหรับประชุมหรืออบรม" },
  F07: { title: "ขอแก้ไขข้อมูลในระบบ", description: "เปลี่ยนแปลงข้อมูลในระบบงานที่ใช้อยู่" },
  F02: { title: "ส่งมอบคอมพิวเตอร์", description: "บันทึกการส่งมอบอุปกรณ์ให้ผู้รับ" },
};

const SERVICE_ORDER = ["F06", "F11", "F10", "F13", "F03", "F12", "F07"];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const it = isIT(user.role);

  const [mine, myQueue, newQueue, newForSla] = await Promise.all([
    prisma.ticket.findMany({ where: { requesterId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    it
      ? prisma.ticket.findMany({
          where: { assignedToId: user.id, status: { in: ["IN_PROGRESS", "RESOLVED"] } },
          orderBy: { createdAt: "asc" },
          take: 6,
        })
      : Promise.resolve([]),
    it
      ? prisma.ticket.findMany({
          where: { itStatus: "NEW", status: { notIn: ["CLOSED", "CANCELLED"] } },
          orderBy: { createdAt: "asc" },
          take: 6,
        })
      : Promise.resolve([]),
    it
      ? prisma.ticket.findMany({
          where: { itStatus: "NEW", status: { notIn: ["CLOSED", "CANCELLED"] } },
          select: { id: true, slaDueAt: true, itStatus: true },
        })
      : Promise.resolve([]),
  ]);

  const now = new Date();
  const overdueCount = it
    ? newForSla.filter((t) => computeSla({ slaDueAt: t.slaDueAt, itStatus: t.itStatus, now }).overdue).length
    : 0;

  const services = SERVICE_ORDER.flatMap((type) => {
    const form = FORM_LIST.find((item) => item.type === type);
    return form ? [form] : [];
  });
  const handover = FORM_LIST.find((form) => form.type === "F02");
  const firstName = user.displayName.trim().split(/\s+/)[0];

  return (
    <div className="relative space-y-8">
      {/* ── hero ── */}
      <section className="relative overflow-hidden rounded-md border border-border bg-gradient-to-br from-brand-weak via-white to-white p-6 sm:p-8">
        <div className="relative z-10 grid items-center gap-6 lg:grid-cols-[1fr_minmax(0,440px)]">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">ยินดีต้อนรับกลับ</p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[32px]">
              สวัสดี {firstName}
            </h1>
            <p className="mt-1 text-lg font-semibold text-slate-700 sm:text-xl">
              วันนี้ต้องการให้ IT ช่วยเรื่องอะไร?
            </p>
            <p className="mt-2 text-sm text-muted">
              เราพร้อมให้บริการ ดูแล และช่วยแก้ไขปัญหา เพื่อให้คุณทำงานได้อย่างราบรื่น
            </p>
            <Link
              href="/tickets?mine=1"
              className="mt-5 inline-flex items-center gap-3 rounded-md card px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-weak text-brand">
                <ListChecks size={18} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">คำร้องของฉัน</span>
                <span className="block text-xs text-muted">ติดตามสถานะคำร้องและดูประวัติ</span>
              </span>
              <ArrowRight size={16} className="ml-1 text-slate-400" aria-hidden="true" />
            </Link>
          </div>

          <Image
            src="/Home.png"
            alt="ทีม IT พร้อมให้บริการ"
            width={1680}
            height={945}
            priority
            className="hidden w-full rounded-md lg:block"
          />
        </div>
      </section>

      {it && (
        <div className="relative grid gap-3 sm:grid-cols-3">
          <StatCard
            href="/tickets?status=open"
            icon={Inbox}
            label="คำร้องใหม่รอรับ"
            value={newForSla.length}
            tone="blue"
          />
          <StatCard
            href="/tickets?assignee=me"
            icon={ListChecks}
            label="งานของฉันที่ค้าง"
            value={myQueue.length >= 6 ? "6+" : myQueue.length}
            tone="slate"
          />
          <StatCard
            href="/dashboard"
            icon={TimerReset}
            label="เกิน SLA · ยังไม่รับงาน"
            value={overdueCount}
            tone={overdueCount > 0 ? "red" : "slate"}
            alert={overdueCount > 0}
          />
        </div>
      )}

      {/* ── services ── */}
      <section aria-labelledby="services-heading" className="relative">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-6 w-1 rounded-full bg-brand" />
          <div>
            <h2 id="services-heading" className="text-lg font-bold text-slate-900">บริการ IT</h2>
            <p className="mt-0.5 text-sm text-muted">เลือกบริการที่ต้องการ เพื่อส่งคำร้องให้ทีม IT</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border bg-card">
          {services.map((form) => {
            const meta = SERVICE_META[form.type];
            const Icon = SERVICE_ICON[form.type];
            const featured = form.type === "F06";
            return (
              <Link
                key={form.type}
                href={`/tickets/new/${form.type}`}
                className={cn(
                  "group relative flex items-center gap-3.5 rounded-sm border-b border-border p-4 transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35 sm:px-5",
                  featured ? "bg-brand text-white hover:bg-brand-strong" : "hover:bg-brand-weak/25",
                )}
              >
                {featured && (
                  <span className="absolute top-3 right-4 rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                    ใช้งานบ่อย
                  </span>
                )}
                <span className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-md",
                  featured ? "bg-white/15 text-white" : "bg-brand-weak text-brand",
                )}>
                  <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold", featured ? "text-white" : "text-slate-900")}>{meta.title}</span>
                  <span className={cn("mt-0.5 block text-xs leading-relaxed", featured ? "text-white/75" : "text-muted")}>{meta.description}</span>
                </span>
                <span className={cn("shrink-0 font-mono text-[11px]", featured ? "text-white/70" : "text-slate-400")}>{form.code}</span>
                <ArrowRight
                  size={16}
                  className={cn(
                    "shrink-0 transition group-hover:translate-x-0.5",
                    featured ? "text-white/75" : "text-slate-300 group-hover:text-brand",
                  )}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── recent ── */}
      <section aria-labelledby="recent-heading" className="relative">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-6 w-1 rounded-full bg-brand" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 id="recent-heading" className="text-lg font-bold text-slate-900">คำร้องล่าสุดของฉัน</h2>
              <Link href="/tickets?mine=1" className="rounded-sm text-sm font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2">ดูทั้งหมด</Link>
            </div>
            <p className="mt-0.5 text-sm text-muted">ติดตามสถานะงานที่คุณแจ้งไว้</p>
          </div>
        </div>

        <div className="card overflow-hidden">
          {mine.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <EmptyInboxArt className="h-24 w-auto" />
              <p className="mt-3 text-sm font-semibold text-slate-700">ยังไม่มีคำร้อง</p>
              <p className="mt-1 text-xs text-muted">เมื่อแจ้งปัญหาหรือขอรับบริการ รายการจะปรากฏที่นี่</p>
              <ButtonLink
                href="/tickets/new/F06"
                size="md"
                className="mt-4"
              >
                + สร้างคำร้องใหม่
              </ButtonLink>
            </div>
          ) : (
            <TicketMiniList tickets={mine} empty="" flush={false} />
          )}
        </div>
      </section>

      {it && (
        <Card aria-labelledby="it-work-heading">
          <CardHeader
            title="พื้นที่ทำงาน IT"
            description="งานที่รับผิดชอบและคำร้องใหม่ที่รอรับ"
            action={
              handover ? (
                <ButtonLink
                  href={`/tickets/new/${handover.type}`}
                  variant="secondary"
                  size="sm"
                >
                  <PackageCheck size={16} aria-hidden="true" />
                  บันทึกส่งมอบคอมพิวเตอร์
                </ButtonLink>
              ) : undefined
            }
          />
          <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-border">
            <div className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">งานที่มอบหมายให้ฉัน</h3>
                <Link href="/tickets?assignee=me" className="rounded-sm text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2">ดูทั้งหมด</Link>
              </div>
              <TicketMiniList tickets={myQueue} empty="ไม่มีงานที่มอบหมายให้คุณ" flush />
            </div>
            <div className="border-t border-border p-5 lg:border-t-0">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">คำร้องใหม่ที่ยังไม่มีผู้รับ</h3>
                <Link href="/tickets?status=open" className="rounded-sm text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2">ดูทั้งหมด</Link>
              </div>
              <TicketMiniList tickets={newQueue} empty="ไม่มีงานค้างในคิว" flush />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
  tone,
  alert,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone: "blue" | "red" | "slate";
  alert?: boolean;
}) {
  const t = {
    blue: { bar: "bg-brand", chip: "bg-brand-weak text-brand", num: "text-slate-900" },
    red: { bar: "bg-red-500", chip: "bg-red-100 text-red-600", num: "text-red-600" },
    slate: { bar: "bg-slate-300", chip: "bg-slate-100 text-muted", num: "text-slate-900" },
  }[tone];

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3.5 overflow-hidden rounded-md border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2",
        alert ? "border-red-200 ring-1 ring-red-100" : "border-border hover:border-brand/40",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", t.bar)} aria-hidden="true" />
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", t.chip)}>
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-3xl font-bold leading-none tabular-nums", t.num)}>{value}</span>
        <span className="mt-1 block truncate text-xs text-muted">{label}</span>
      </span>
      <ArrowRight
        size={16}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand"
        aria-hidden="true"
      />
    </Link>
  );
}

function TicketMiniList({
  tickets,
  empty,
  flush,
}: {
  tickets: { id: number; docNo: string; formType: string; userStatus: string; status: string; itStatus: string; slaDueAt: Date | null; createdAt: Date }[];
  empty: string;
  flush?: boolean;
}) {
  if (tickets.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn("flex flex-col items-center gap-1 text-center text-slate-400", flush ? "py-8" : "px-5 py-12")}
      >
        <Inbox size={22} strokeWidth={1.6} aria-hidden="true" />
        <p className="text-sm">{empty}</p>
      </div>
    );
  }

  return (
    <ul aria-label="รายการคำร้อง" className={cn("divide-y divide-border", !flush && "border-t border-border")}>
      {tickets.map((ticket) => {
        const sla = computeSla({ slaDueAt: ticket.slaDueAt, itStatus: ticket.itStatus });
        return (
        <li key={ticket.id} className={sla.overdue ? "border-l-2 border-red-400 bg-red-50/25" : undefined}>
          <Link
            href={`/tickets/${ticket.id}`}
            aria-label={`เปิดคำร้อง ${ticket.docNo}: ${ticket.userStatus}`}
            className={cn("flex items-center gap-3 rounded-sm py-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35", flush ? "px-1" : "px-5")}
          >
            <span className="font-mono text-xs text-slate-400">{ticket.docNo}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-muted">{ticket.formType}</span>
            <span className="min-w-0 flex-1 line-clamp-2 break-words text-sm leading-5 text-slate-700" title={ticket.userStatus}>{ticket.userStatus}</span>
            <span className="hidden text-xs text-slate-400 xl:inline">{fmtDateTime(ticket.createdAt)}</span>
            {sla.overdue && <Pill tone="red">{sla.text}</Pill>}
            <StatusBadge status={ticket.status} />
          </Link>
        </li>
        );
      })}
    </ul>
  );
}
