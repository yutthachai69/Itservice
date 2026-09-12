import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EvaluateForm } from "./EvaluateForm";
import { PageHeader } from "@/components/PageHeader";

export default async function EvaluatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) notFound();

  const user = await getCurrentUser();
  if (!user) return null;

  const t = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { evaluation: true } });
  if (!t || t.requesterId !== user.id) notFound();
  if (t.evaluation || t.status !== "CLOSED") redirect(`/tickets/${ticketId}`);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="ประเมินความพึงพอใจ" subtitle={`${t.docNo} · ${t.formType}`} />
      <EvaluateForm ticketId={ticketId} />
    </div>
  );
}
