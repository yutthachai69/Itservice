import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Building2,
  ChevronRight,
  CircleDot,
  Clock3,
  Pencil,
  Printer,
  UserRound,
} from "lucide-react";
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
  STATUS_COLOR,
  STATUS_LABEL,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getFormDef } from "@/lib/form-defs";
import { computeSla } from "@/lib/sla";
import { cn, fmtDate, fmtDateTime } from "@/lib/ui";
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
      icon: CircleDot,
      label: "สถานะคำร้อง",
      value: STATUS_LABEL[ticket.status] ?? ticket.status,
      current: true,
    },
    {
      icon: Activity,
      label: it ? "ขั้นตอนฝั่ง IT" : "ความคืบหน้า",
      value: it ? (IT_STATUS_LABEL[ticket.itStatus] ?? ticket.itStatus) : ticket.userStatus,
      meta: it ? ticket.userStatus : undefined,
    },
    {
      icon: UserRound,
      label: "ผู้รับผิดชอบ",
      value: ticket.assignedTo?.displayName ?? "ยังไม่มอบหมาย",
      meta: ticket.assignedTo ? "ผู้ดูแลงานปัจจุบัน" : "รอเจ้าหน้าที่รับงาน",
    },
    {
      icon: Building2,
      label: "บริษัทที่ขอรับบริการ",
      value: siteName(ticket.serviceSiteCode),
    },
    {
      icon: Clock3,
      label: "SLA รับเรื่อง",
      value: ticket.itStatus === "NEW" ? (sla.text || "ไม่ระบุกำหนด") : "รับงานแล้ว",
      meta:
        ticket.itStatus === "NEW"
          ? "ระยะเวลารับเรื่อง"
          : ticket.receivedAt
            ? fmtDateTime(ticket.receivedAt)
            : "สิ้นสุดการจับเวลา",
      alert: sla.overdue,
    },
  ];

  return (
    <div className="space-y-5">
      <nav aria-label="เส้นทางนำทาง" className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
        <Link
          href={it ? "/tickets" : "/tickets?mine=1"}
          className="inline-flex shrink-0 items-center gap-1 rounded-sm font-medium transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          กลับไปรายการคำร้อง
        </Link>
        <ChevronRight size={13} className="shrink-0 text-slate-300" aria-hidden="true" />
        <span className="font-mono text-muted">{ticket.formType}</span>
        <ChevronRight size={13} className="shrink-0 text-slate-300" aria-hidden="true" />
        <span aria-current="page" className="truncate text-muted">รายละเอียดคำร้อง</span>
      </nav>

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
        chip={`${ticket.formType} · คำร้องบริการ IT`}
        title={
          <span>
            <span className="block">รายละเอียดคำร้อง</span>
            <span className="mt-1.5 block font-mono text-[1.45rem] tracking-normal">{ticket.docNo}</span>
          </span>
        }
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

      <dl aria-label="สรุปสถานะคำร้อง" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {statusSummary.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
                className={cn(
                "flex min-w-0 items-start gap-3 rounded-md border px-4 py-3.5",
                item.current
                  ? cn("border-l-4 border-l-brand shadow-sm ring-1", STATUS_COLOR[ticket.status] ?? "bg-brand-weak text-brand-strong ring-brand/20")
                  : item.alert
                    ? "border-red-200 bg-red-50/55"
                    : "border-border bg-card",
              )}
            >
              <Icon
                size={18}
                strokeWidth={1.8}
                className={cn(
                  "mt-0.5 shrink-0",
                  item.current ? "text-current" : item.alert ? "text-red-600" : "text-slate-400",
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <dt className={cn("flex items-center gap-2 text-[11px] font-medium", item.current ? "text-current opacity-70" : "text-muted")}>
                  <span>{item.label}</span>
                  {item.current && <span className="rounded-sm bg-brand px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">ปัจจุบัน</span>}
                </dt>
                  <dd className={cn("mt-0.5 flex min-w-0 items-center gap-2 break-words text-[15px] font-semibold leading-5", item.current ? "text-current" : item.alert ? "text-red-700" : "text-slate-900")}>
                  {item.current && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
                   <span className="line-clamp-2">{item.value}</span>
                </dd>
                {item.meta && (
                    <p className={cn("mt-0.5 line-clamp-2 break-words text-[11px]", item.current ? "text-current opacity-65" : "text-slate-400")}>
                    {item.meta}
                  </p>
                )}
              </div>
            </div>
          );
        })}
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
              {ticket.events.length === 0 && (
                <li className="px-1 py-8 text-center text-sm text-slate-400">
                  ยังไม่มีรายการดำเนินการ
                </li>
              )}
            </ol>
          </section>
        </div>

        <aside className="no-print order-first self-start xl:sticky xl:top-20 xl:order-last xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
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
          <dt className="text-xs font-medium text-muted">{item.label}</dt>
          <dd className="mt-1 break-words whitespace-pre-wrap text-sm font-medium text-slate-800">{item.value}</dd>
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
  if (type === "date") return fmtDate(String(raw));
  if (type === "datetime") return fmtDateTime(String(raw));
  return label(String(raw));
}
