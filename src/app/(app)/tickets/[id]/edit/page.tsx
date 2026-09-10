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
    reqPosition: t.reqPosition ?? "",
    reqPhone: t.reqPhone ?? "",
    reqEmail: t.reqEmail ?? "",
    serviceSiteCode: t.serviceSiteCode,
  };
  for (const [k, v] of Object.entries(formData)) {
    initialValues[k] = Array.isArray(v) ? v.map(String) : String(v ?? "");
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        chip={def.code}
        title={`แก้ไข ${t.docNo}`}
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
        prefill={{}}
        signName={t.reqName}
        initialValues={initialValues}
        initialNote={t.note ?? ""}
      />
    </div>
  );
}
