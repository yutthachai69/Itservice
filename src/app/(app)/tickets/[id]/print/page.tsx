import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isIT } from "@/lib/constants";
import { PrintDoc } from "@/components/print/PrintDoc";
import { AutoPrint } from "@/components/AutoPrint";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) notFound();

  const user = await getCurrentUser();
  if (!user) return null;

  const t = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      approvals: { include: { approver: true }, orderBy: { seq: "asc" } },
      assignedTo: true,
      closedBy: true,
      loans: { include: { item: true }, orderBy: { id: "asc" } },
    },
  });
  if (!t) notFound();
  if (!isIT(user.role) && t.requesterId !== user.id) notFound();

  return (
    <>
      <AutoPrint backHref={`/tickets/${ticketId}`} />
      <PrintDoc t={t} />
    </>
  );
}
