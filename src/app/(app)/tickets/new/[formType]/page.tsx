import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFormDef } from "@/lib/form-defs";
import { SITES, isIT, siteName } from "@/lib/constants";
import { siteCodeFromHeaders } from "@/lib/site-detect";
import { formPdfFile } from "@/lib/form-files";
import { TicketForm } from "./TicketForm";
import { PageHeader } from "@/components/PageHeader";
import { Check, Clock, Download } from "lucide-react";
import Link from "next/link";

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

  // If the request comes from a known site LAN, default the "service site" to
  // where the requester physically is — otherwise fall back to their profile.
  const detectedSiteCode = siteCodeFromHeaders(await headers());
  const serviceSiteCode = detectedSiteCode ?? user.siteCode ?? "02";
  const autoSiteName = detectedSiteCode ? siteName(detectedSiteCode) : null;
  const pdf = formPdfFile(def.code);

  // department options for the initial service site — the form re-fetches
  // client-side whenever the user changes "บริษัทที่ขอรับบริการ"
  const departments = await prisma.department.findMany({
    where: { siteCode: serviceSiteCode },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto w-full max-w-[64rem]">
      <Link href="/" className="text-sm text-muted transition hover:text-brand hover:underline">
        ← กลับไปเลือกบริการ
      </Link>
      <PageHeader
        className="mt-4"
        chip={`${def.code} · เปิดคำร้องใหม่`}
        title={def.title}
        subtitle="กรอกข้อมูลตามขั้นตอนด้านล่าง ระบบจะส่งให้ IT ตรวจสอบทันทีที่กด “ส่งคำร้อง”"
        actions={
          pdf ? (
            <a
              href={`/forms/${encodeURIComponent(pdf)}`}
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand"
            >
              <Download size={15} aria-hidden="true" />
              แบบฟอร์มกระดาษ (PDF)
            </a>
          ) : undefined
        }
      />

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_16.5rem] lg:items-start lg:gap-7">
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

        <aside className="mt-5 lg:sticky lg:top-24 lg:mt-0">
          <div className="card space-y-4 p-5">
            <div>
              <p className="font-display text-slate-900">{def.shortTitle}</p>
              <p className="mt-0.5 text-xs text-muted">
                {def.code} · {def.title}
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-brand-weak/60 px-3 py-2 text-xs text-slate-600">
              <Clock size={14} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
              <span>
                IT รับเรื่องภายในราว{" "}
                <span className="font-medium text-slate-800">{def.slaHours} ชั่วโมงทำการ</span>
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-slate-700">ช่วยให้งานเสร็จเร็วขึ้น</p>
              <ul className="mt-2 space-y-2 text-xs text-muted">
                {[
                  "อธิบายอาการให้ชัด เกิดตอนไหน มีข้อความแจ้งเตือนว่าอะไร",
                  "แนบภาพหน้าจอหรือไฟล์ที่เกี่ยวข้อง",
                  "ระบุเบอร์ที่ติดต่อได้จริง เผื่อ IT โทรกลับ",
                ].map((tip) => (
                  <li key={tip} className="flex gap-1.5">
                    <Check size={13} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
            {pdf && (
              <a
                href={`/forms/${encodeURIComponent(pdf)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 border-t border-border pt-3 text-xs font-medium text-brand transition hover:underline"
              >
                <Download size={13} aria-hidden="true" />
                ดูแบบฟอร์มกระดาษ (PDF)
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
