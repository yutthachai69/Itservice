import { Pencil, Printer } from "lucide-react";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/Button";
import { DetailSection } from "@/components/DetailSection";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Badge";
import { getCurrentUser } from "@/lib/auth";
import {
  ACTION_LABEL,
  isIT,
  IT_STATUS_LABEL,
  siteName,
  STATUS_LABEL,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getFormDef } from "@/lib/form-defs";
import { computeSla } from "@/lib/sla";
import { cn, fmtDateTime } from "@/lib/ui";
import { Attachments } from "./Attachments";
import { LoanPanel } from "./LoanPanel";
import { WorkflowPanel } from "./WorkflowPanel";

const REQUESTER_FIELDS = new Set([
  "reqName",
  "reqDept",
  "reqPosition",
  "reqPhone",
  "reqEmail",
  "serviceSiteCode",
]);

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ attachment?: string; created?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) notFound();

  const user = await getCurrentUser();
  if (!user) return null;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: true,
      assignedTo: true,
      closedBy: true,
      approvals: { include: { approver: true }, orderBy: { seq: "asc" } },
      events: { include: { actor: true }, orderBy: { createdAt: "desc" } },
      attachments: { orderBy: { uploadedAt: "asc" } },
      loans: { include: { item: true }, orderBy: { id: "asc" } },
      evaluation: true,
    },
  });
  if (!ticket) notFound();

  const it = isIT(user.role);
  const isRequester = ticket.requesterId === user.id;
  if (!it && !isRequester) notFound();

  const def = getFormDef(ticket.formType);
  const formData: Record<string, unknown> = (() => {
    try {
      return JSON.parse(ticket.formData) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  const sla = computeSla({ slaDueAt: ticket.slaDueAt, itStatus: ticket.itStatus });

  const itStaff = it
    ? await prisma.user.findMany({
        where: { active: true, role: { in: ["IT_STAFF", "IT_LEAD", "ADMIN"] } },
        select: { id: true, displayName: true },
        orderBy: { displayName: "asc" },
      })
    : [];

  const canEdit =
    ticket.status !== "CANCELLED" && (it || (isRequester && ticket.itStatus === "NEW"));

  const requesterDetails = [
    { label: "ชื่อผู้ขอ", value: ticket.reqName ?? "" },
    { label: "ฝ่าย / แผนก", value: ticket.reqDept ?? "" },
    { label: "ตำแหน่ง", value: ticket.reqPosition ?? "" },
    { label: "เบอร์โทร", value: ticket.reqPhone ?? "" },
    { label: "อีเมล", value: ticket.reqEmail ?? "" },
    { label: "วันที่แจ้ง", value: fmtDateTime(ticket.createdAt) },
    ticket.receivedAt ? { label: "รับงานเมื่อ", value: fmtDateTime(ticket.receivedAt) } : null,
    ticket.closedAt ? { label: "ปิดงานเมื่อ", value: fmtDateTime(ticket.closedAt) } : null,
    ticket.closedBy ? { label: "ผู้ปิดงาน", value: ticket.closedBy.displayName } : null,
  ].filter(isDetailItem);

  const formDetails = (def?.sections ?? []).flatMap((section) =>
    section.fields
      .filter((field) => !REQUESTER_FIELDS.has(field.key))
      .map((field) => ({
        label: field.label,
        value: renderValue(field.type, field.options, formData[field.key]),
        wide: field.type === "textarea" || field.type === "checkboxes",
      }))
      .filter((item) => item.value),
  );
  if (ticket.note) formDetails.push({ label: "หมายเหตุ", value: ticket.note, wide: true });

  const statusSummary = [
    {
      label: "สถานะคำร้อง",
      value: STATUS_LABEL[ticket.status] ?? ticket.status,
      meta: ticket.itStatus === "NEW" && ticket.slaDueAt ? sla.text : undefined,
      alert: sla.overdue,
    },
    {
      label: it ? "ขั้นตอนฝั่ง IT" : "ความคืบหน้า",
      value: it ? (IT_STATUS_LABEL[ticket.itStatus] ?? ticket.itStatus) : ticket.userStatus,
      meta: it ? ticket.userStatus : undefined,
    },
    {
      label: "ผู้รับผิดชอบ",
      value: ticket.assignedTo?.displayName ?? "ยังไม่มอบหมาย",
    },
    {
      label: "บริษัทที่ขอรับบริการ",
      value: siteName(ticket.serviceSiteCode),
    },
  ];

  return (
    <div className="space-y-5">
      {query.created === "1" && (
        <p role="status" className="border-l-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ส่งคำร้องเรียบร้อยแล้ว เลขที่ <span className="font-mono font-semibold">{ticket.docNo}</span> สามารถติดตามสถานะได้จากหน้านี้
        </p>
      )}
      {query.attachment === "failed" && (
        <p role="alert" className="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          สร้างคำร้องแล้ว แต่ไฟล์บางรายการส่งไม่สำเร็จ กรุณาแนบใหม่ในส่วนไฟล์แนบ
        </p>
      )}

      <PageHeader
        chip={`${ticket.formType} · รายละเอียดคำร้อง`}
        title={<span className="font-mono text-[1.3rem]">{ticket.docNo}</span>}
        subtitle={def?.title ?? ticket.formType}
        actions={
          <>
            {canEdit && (
              <ButtonLink href={`/tickets/${ticket.id}/edit`} variant="secondary" size="sm">
                <Pencil size={14} aria-hidden="true" />
                แก้ไข
              </ButtonLink>
            )}
            <ButtonLink href={`/tickets/${ticket.id}/print`} variant="secondary" size="sm">
              <Printer size={14} aria-hidden="true" />
              พิมพ์
            </ButtonLink>
          </>
        }
      />

      <dl className="grid overflow-hidden rounded-md bg-sidebar text-white sm:grid-cols-2 xl:grid-cols-4">
        {statusSummary.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "px-5 py-4",
              index > 0 && "border-t border-white/10 sm:border-t-0 sm:border-l",
            )}
          >
            <dt className="text-[11px] font-medium text-blue-100/55">{item.label}</dt>
            <dd className={cn("mt-1 truncate text-sm font-semibold", item.alert ? "text-amber-300" : "text-white")}>
              {item.value}
            </dd>
            {item.meta && (
              <p className={cn("mt-0.5 truncate text-[11px]", item.alert ? "text-amber-200" : "text-blue-100/55")}>
                {item.meta}
              </p>
            )}
          </div>
        ))}
      </dl>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <article className="overflow-hidden rounded-md border border-border bg-card">
            <DetailSection
              title="ข้อมูลผู้ขอ"
              description="ข้อมูลสำหรับติดต่อและบริษัทที่รับบริการ"
              className="border-t-0"
            >
              <DetailGrid items={requesterDetails} />
            </DetailSection>

            <DetailSection title="รายละเอียดคำร้อง" description="ข้อมูลที่ระบุไว้ในแบบฟอร์ม">
              {formDetails.length > 0 ? (
                <DetailGrid items={formDetails} />
              ) : (
                <p className="text-sm text-slate-400">ไม่มีรายละเอียดเพิ่มเติม</p>
              )}
            </DetailSection>

            {ticket.approvals.length > 0 && (
              <DetailSection title="การตรวจสอบ / อนุมัติ" description="ลำดับผู้ดำเนินการตามแบบฟอร์ม">
                <ul className="divide-y divide-border">
                  {ticket.approvals.map((approval) => (
                    <li key={approval.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="w-32 shrink-0 text-xs text-muted">{approvalLabel(approval.step)}</span>
                      <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                        {approval.approver?.name ?? "ยังไม่ระบุ"}
                      </span>
                      <Pill tone={approval.status === "APPROVED" ? "green" : approval.status === "REJECTED" ? "red" : "amber"}>
                        {approval.status === "APPROVED" ? "อนุมัติ" : approval.status === "REJECTED" ? "ไม่อนุมัติ" : "รอดำเนินการ"}
                      </Pill>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}

            <Attachments
              ticketId={ticket.id}
              canModify={
                ticket.status !== "CANCELLED" &&
                ticket.status !== "CLOSED" &&
                (it || isRequester)
              }
              initial={ticket.attachments.map((attachment) => ({
                id: attachment.id,
                filename: attachment.filename,
                size: attachment.size,
                uploadedAt: attachment.uploadedAt.toISOString(),
              }))}
            />

            {ticket.formType === "F03" && (
              <LoanPanel
                ticketId={ticket.id}
                isIT={it}
                ticketClosed={ticket.status === "CLOSED" || ticket.status === "CANCELLED"}
                category={String(formData.deviceType ?? "")}
                from={String(formData.borrowDate ?? "")}
                to={String(formData.returnDate ?? "")}
                loans={ticket.loans.map((loan) => ({
                  id: loan.id,
                  itemName: loan.item.name,
                  serial: loan.item.serial,
                  borrowDate: loan.borrowDate.toISOString(),
                  dueDate: loan.dueDate.toISOString(),
                  returnedAt: loan.returnedAt?.toISOString() ?? null,
                  status: loan.status,
                }))}
              />
            )}
          </article>

          <section aria-labelledby="history-heading" className="overflow-hidden rounded-md border border-border bg-card">
            <header className="flex items-center justify-between border-b border-border bg-surface-subtle/70 px-5 py-3.5">
              <div>
                <h2 id="history-heading" className="text-sm font-semibold text-slate-950">ประวัติการดำเนินการ</h2>
                <p className="mt-0.5 text-xs text-muted">เรียงจากรายการล่าสุด</p>
              </div>
              <span className="text-xs text-slate-400">{ticket.events.length} รายการ</span>
            </header>
            <ol className="divide-y divide-border px-5 sm:px-6">
              {ticket.events.map((event) => (
                <li key={event.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                  <time className="text-xs text-slate-400">{fmtDateTime(event.createdAt)}</time>
                  <div>
                    <p className="text-slate-800">
                      <span className="font-medium">{ACTION_LABEL[event.action] ?? event.action}</span>
                      <span className="text-slate-400"> · {event.actor?.displayName ?? "ระบบ"}</span>
                    </p>
                    {event.comment && <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-600">{event.comment}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="no-print order-first xl:order-last xl:sticky xl:top-20">
          <WorkflowPanel
            ticketId={ticket.id}
            status={ticket.status}
            itStatus={ticket.itStatus}
            isIT={it}
            isRequester={isRequester}
            hasEvaluation={!!ticket.evaluation}
            pendingApprovals={ticket.approvals
              .filter((approval) => approval.status === "PENDING")
              .map((approval) => ({
                id: approval.id,
                step: approval.step,
                name: approval.approver?.name ?? "ยังไม่ระบุ",
              }))}
            itStaff={itStaff}
          />
        </aside>
      </div>
    </div>
  );
}

type DetailItem = { label: string; value: string; wide?: boolean };

function isDetailItem(item: DetailItem | null): item is DetailItem {
  return Boolean(item?.value?.trim());
}

function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 2xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className={item.wide ? "sm:col-span-2 2xl:col-span-3" : undefined}
        >
          <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function approvalLabel(step: string) {
  if (step === "CHECK") return "ผู้ตรวจสอบ";
  if (step === "ACCOUNTING") return "ผู้ตรวจสอบบัญชี";
  return "ผู้อนุมัติ";
}

function renderValue(
  type: string,
  options: { value: string; label: string }[] | undefined,
  raw: unknown,
): string {
  const label = (value: string) => options?.find((option) => option.value === value)?.label ?? value;
  if (Array.isArray(raw)) return raw.map((value) => label(String(value))).filter(Boolean).join(", ");
  if (raw == null || raw === "") return "";
  if (type === "datetime" || type === "date") return fmtDateTime(String(raw));
  return label(String(raw));
}
