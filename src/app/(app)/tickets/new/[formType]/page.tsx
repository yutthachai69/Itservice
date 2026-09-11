import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock3, Download, ListChecks, Paperclip } from "lucide-react";
import { buttonClass } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { isIT, SITES, siteName } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formPdfFile } from "@/lib/form-files";
import { docUrls, DESC, SERVICE_ICON } from "@/lib/doc-meta";
import { getFormDef } from "@/lib/form-defs";
import { siteCodeFromHeaders } from "@/lib/site-detect";
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

  return (
    <div className="w-full">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        กลับไปเลือกบริการ
      </Link>

      <PageHeader
        icon={SERVICE_ICON[def.code]}
        chip={`${def.code} · เปิดคำร้องใหม่`}
        title={def.shortTitle}
        subtitle={DESC[def.code] ?? def.title}
        actions={
          pdf ? (
            <a
              href={docUrls(def.code).download}
              target="_blank"
              rel="noreferrer"
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              <Download size={14} aria-hidden="true" />
              แบบฟอร์มกระดาษ
            </a>
          ) : undefined
        }
      />

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
