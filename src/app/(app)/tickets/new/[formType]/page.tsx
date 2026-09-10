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
import { Download } from "lucide-react";
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
    <div className="w-full">
      <Link href="/" className="text-sm text-muted transition hover:text-brand hover:underline">
        ← กลับไปเลือกบริการ
      </Link>
      <PageHeader
        className="mt-4"
        chip={`${def.code} · เปิดคำร้องใหม่`}
        title={def.title}
        subtitle="กรอกข้อมูลด้านล่างให้ครบถ้วนเพื่อให้ IT ตรวจสอบและดำเนินการได้เร็วขึ้น"
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
