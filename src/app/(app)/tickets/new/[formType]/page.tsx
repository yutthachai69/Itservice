import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Clock3, Download, ListChecks, Paperclip } from "lucide-react";
import { buttonClass } from "@/lib/button-class";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { isIT, SITES, siteName, STATUS_LABEL } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formPdfFile } from "@/lib/form-files";
import { docUrls, DESC } from "@/lib/doc-meta";
import { getFormDef } from "@/lib/form-defs";
import { siteCodeFromHeaders } from "@/lib/site-detect";
import { fmtDateTime } from "@/lib/ui";
import { TicketForm } from "./TicketForm";

export default async function NewTicketPage({
  params,
}: {
  params: Promise<{ formType: string }>;
}) {
  const { formType } = await params;
  const def = getFormDef(formType);
  if (!def) notFound();

  const user = await getCurrentUser();
  if (!user) return null;
  if (def.initiatedByIT && !isIT(user.role)) redirect("/");

  const approvers = def.approvals
    ? await prisma.approver.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true },
      })
    : [];

  const detectedSiteCode = siteCodeFromHeaders(await headers());
  const serviceSiteCode = detectedSiteCode ?? user.siteCode ?? "02";
  const autoSiteName = detectedSiteCode ? siteName(detectedSiteCode) : null;
  const pdf = formPdfFile(def.code);

  const departments = await prisma.department.findMany({
    where: { siteCode: serviceSiteCode },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const requiredCount =
    def.sections.reduce(
      (total, section) => total + section.fields.filter((field) => field.required).length,
      0,
    ) + (def.approvals?.length ?? 0);

  // 4.3: warn before a duplicate — same requester, same form type, still open —
  // instead of only catching it after IT has to notice two tickets manually.
  const duplicates = def.initiatedByIT
    ? []
    : await prisma.ticket.findMany({
        where: {
          requesterId: user.id,
          formType: def.type,
          status: { in: ["OPEN", "IN_PROGRESS", "RESOLVED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, docNo: true, status: true, userStatus: true, createdAt: true },
      });

  return (
    <div className="w-full">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-brand-weak/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        กลับไปเลือกบริการ
      </Link>

      <PageHeader
        chip={`${def.code} · เปิดคำร้องใหม่`}
        title={def.shortTitle}
        subtitle={DESC[def.code] ?? def.title}
        actions={
          def.type === "F13" ? (
            <a
              href="/guides/softpro-screen-codes.xlsx"
              download
              aria-label="ดาวน์โหลดรายชื่อโค้ดหน้าจอ Softpro ทั้งหมด (อ้างอิงจาก IT)"
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              <Download size={14} aria-hidden="true" />
              รายชื่อโค้ดหน้าจอ Softpro
            </a>
          ) : pdf ? (
            <a
              href={docUrls(def.code).download}
              download
              aria-label={`ดาวน์โหลดแบบฟอร์มกระดาษ ${def.shortTitle}`}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              <Download size={14} aria-hidden="true" />
              แบบฟอร์มกระดาษ
            </a>
          ) : undefined
        }
      />

      {duplicates.length > 0 && (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-start gap-3 border-l-4 border-amber-400 bg-amber-50/70 px-4 py-3.5"
        >
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              คุณมีคำร้อง {def.code} ประเภทเดียวกันที่ยังไม่ปิดอยู่แล้ว {duplicates.length} รายการ
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              ตรวจสอบก่อนว่าเรื่องเดียวกันหรือไม่ เพื่อไม่ให้ IT ต้องรับงานซ้ำ — ถ้าเป็นปัญหาคนละเรื่อง ส่งคำร้องใหม่ได้ตามปกติ
            </p>
            <ul className="mt-2 space-y-1">
              {duplicates.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tickets/${t.id}`}
                    className="inline-flex flex-wrap items-center gap-1.5 text-xs font-medium text-amber-900 underline decoration-amber-400 underline-offset-2 hover:text-amber-950"
                  >
                    <span className="font-mono">{t.docNo}</span>
                    <span className="font-normal text-amber-700">
                      · {STATUS_LABEL[t.status] ?? t.status} · {t.userStatus} · {fmtDateTime(t.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <section
        aria-label="ข้อมูลก่อนกรอกคำร้อง"
        className="mb-5 grid overflow-hidden rounded-md border border-border bg-card sm:grid-cols-3"
      >
        <ContextItem
          icon={Clock3}
          label="ระยะเวลารับเรื่อง"
          value={`ประมาณ ${def.slaHours} ชั่วโมงทำการ`}
        />
        <ContextItem
          icon={ListChecks}
          label="ข้อมูลจำเป็น"
          value={`${requiredCount} ช่อง`}
        />
        <ContextItem
          icon={Paperclip}
          label="ไฟล์ประกอบ"
          value="สูงสุด 5 ไฟล์ · ไฟล์ละ 10 MB"
        />
      </section>

      <TicketForm
        def={def}
        sites={SITES}
        approvers={approvers}
        departments={departments}
        prefill={{
          reqName: user.displayName,
          reqDept: user.departmentName ?? "",
          reqPosition: user.position ?? "",
          reqPhone: user.phone ?? "",
          reqEmail: user.email ?? "",
          serviceSiteCode,
        }}
        signName={user.displayName}
        showLoanCheck={def.type === "F03"}
        autoSiteName={autoSiteName}
      />
    </div>
  );
}

function ContextItem({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[70px] items-center gap-3 border-t border-border px-5 py-3 first:border-t-0 sm:border-t-0 sm:border-l sm:first:border-l-0">
      {Icon && <Icon size={17} strokeWidth={1.7} className="shrink-0 text-brand" aria-hidden="true" />}
      <span>
        <span className="block text-[11px] text-muted">{label}</span>
        <span className="mt-0.5 block text-sm font-medium text-slate-900">{value}</span>
      </span>
    </div>
  );
}
