import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFormDef } from "@/lib/form-defs";
import { SITES, isIT } from "@/lib/constants";
import { TicketForm } from "../../new/[formType]/TicketForm";
import { PageHeader } from "@/components/PageHeader";

export default async function EditTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) notFound();

  const user = await getCurrentUser();
  if (!user) return null;

  const t = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!t) notFound();

  const it = isIT(user.role);
  const isRequester = t.requesterId === user.id;
  const canEdit =
    t.status !== "CANCELLED" && (it || (isRequester && t.itStatus === "NEW"));
  if (!canEdit) redirect(`/tickets/${ticketId}`);

  const def = getFormDef(t.formType);
  if (!def) notFound();

  const formData: Record<string, unknown> = (() => {
    try {
      return JSON.parse(t.formData);
    } catch {
      return {};
    }
  })();

  const initialValues: Record<string, string | string[]> = {
    reqName: t.reqName,
    reqDept: t.reqDept ?? "",
    reqPosition: t.reqPosition ?? "",
    reqPhone: t.reqPhone ?? "",
    reqEmail: t.reqEmail ?? "",
    serviceSiteCode: t.serviceSiteCode,
  };
  for (const [k, v] of Object.entries(formData)) {
    initialValues[k] = Array.isArray(v) ? v.map(String) : String(v ?? "");
  }

  const departments = await prisma.department.findMany({
    where: { siteCode: t.serviceSiteCode },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="w-full">
      <nav aria-label="เส้นทางแก้ไขคำร้อง" className="mb-1 text-xs text-muted">
        <Link
          href={`/tickets/${ticketId}`}
          className="inline-flex items-center gap-1.5 rounded-sm px-1 py-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          กลับรายละเอียดคำร้อง
        </Link>
      </nav>
      <PageHeader
        chip={`${def.code} · แก้ไขคำร้อง`}
        title={
          <>
            แก้ไขคำร้อง <span className="font-mono text-[1.15rem]">{t.docNo}</span>
          </>
        }
        subtitle={
          it
            ? "IT แก้ไขได้ทุกสถานะ"
            : "แก้ไขได้จนกว่า IT จะรับงาน — การแก้ไขจะถูกบันทึกในประวัติ"
        }
      />

      <TicketForm
        mode="edit"
        ticketId={ticketId}
        def={def}
        sites={SITES}
        approvers={[]}
        departments={departments}
        prefill={{}}
        signName={t.reqName}
        initialValues={initialValues}
        initialNote={t.note ?? ""}
      />
    </div>
  );
}
