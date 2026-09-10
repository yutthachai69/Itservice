import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFormDef } from "@/lib/form-defs";
import { siteName, isIT, IT_STATUS_LABEL, ACTION_LABEL } from "@/lib/constants";
import { StatusBadge, Pill } from "@/components/Badge";
import { fmtDateTime } from "@/lib/ui";
import { computeSla } from "@/lib/sla";
import { WorkflowPanel } from "./WorkflowPanel";
import { Attachments } from "./Attachments";
import { LoanPanel } from "./LoanPanel";

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

  const t = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: true,
      assignedTo: true,
      closedBy: true,
      approvals: { include: { approver: true }, orderBy: { seq: "asc" } },
      events: { include: { actor: true }, orderBy: { createdAt: "asc" } },
      attachments: { orderBy: { uploadedAt: "asc" } },
      loans: { include: { item: true }, orderBy: { id: "asc" } },
      evaluation: true,
    },
  });
  if (!t) notFound();

  const it = isIT(user.role);
  const isRequester = t.requesterId === user.id;
  if (!it && !isRequester) notFound();

  const def = getFormDef(t.formType);
  const formData: Record<string, unknown> = (() => {
    try {
      return JSON.parse(t.formData) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  const sla = computeSla({ slaDueAt: t.slaDueAt, itStatus: t.itStatus });

  const itStaff = it
    ? await prisma.user.findMany({
        where: { active: true, role: { in: ["IT_STAFF", "IT_LEAD", "ADMIN"] } },
        select: { id: true, displayName: true },
        orderBy: { displayName: "asc" },
      })
    : [];

  const canEdit =
    t.status !== "CANCELLED" && (it || (isRequester && t.itStatus === "NEW"));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        {query.created === "1" && (
          <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            ส่งคำร้องเรียบร้อยแล้ว เลขที่ <span className="font-mono font-semibold">{t.docNo}</span> — ติดตามสถานะได้จากหน้านี้
          </p>
        )}
        {query.attachment === "failed" && (
          <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            สร้างคำร้องแล้ว แต่ไฟล์แนบบางรายการส่งไม่สำเร็จ กรุณาลองแนบใหม่ในส่วนไฟล์แนบด้านล่าง
          </p>
        )}
        <div className="rounded-xl border-l-4 border-brand bg-card p-5 shadow-sm ring-1 ring-border">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-brand/10 text-brand text-sm font-semibold px-2 py-1">
              {t.formType}
            </span>
            <h1 className="font-mono text-lg text-slate-900">{t.docNo}</h1>
            <StatusBadge status={t.status} />
            {sla.overdue && <Pill tone="red">{sla.text}</Pill>}
            <div className="no-print ml-auto flex gap-2">
              {canEdit && (
                <Link
                  href={`/tickets/${t.id}/edit`}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  แก้ไข
                </Link>
              )}
              <Link
                href={`/tickets/${t.id}/print`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                พิมพ์
              </Link>
            </div>
          </div>
          <p className="mt-1 text-slate-600">{def?.title ?? t.formType}</p>

          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row k="ผู้ขอ" v={t.reqName} />
            <Row k="แผนก" v={t.reqDept ?? "-"} />
            <Row k="ตำแหน่ง" v={t.reqPosition ?? "-"} />
            <Row k="เบอร์โทร" v={t.reqPhone ?? "-"} />
            <Row k="อีเมล" v={t.reqEmail ?? "-"} />
            <Row k="บริษัทที่ขอรับบริการ" v={siteName(t.serviceSiteCode)} />
            <Row k="สถานะที่ผู้ขอเห็น" v={t.userStatus} />
            {it && <Row k="ขั้นตอนฝั่ง IT" v={IT_STATUS_LABEL[t.itStatus] ?? t.itStatus} />}
            <Row k="ผู้รับผิดชอบ" v={t.assignedTo?.displayName ?? "ยังไม่มอบหมาย"} />
            <Row k="วันที่แจ้ง" v={fmtDateTime(t.createdAt)} />
            {t.slaDueAt && t.itStatus === "NEW" && <Row k="ครบกำหนดรับงาน (SLA)" v={fmtDateTime(t.slaDueAt)} />}
            {t.receivedAt && <Row k="รับงานเมื่อ" v={fmtDateTime(t.receivedAt)} />}
            {t.closedAt && <Row k="ปิดงานเมื่อ" v={fmtDateTime(t.closedAt)} />}
            {t.closedBy && <Row k="ผู้ปิดงาน" v={t.closedBy.displayName} />}
          </dl>
        </div>

        <div className="rounded-xl bg-card p-5 shadow-sm ring-1 ring-border">
          <h2 className="font-medium text-slate-900">รายละเอียดแบบฟอร์ม</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {def?.sections.flatMap((s) =>
              s.fields
                .filter((f) => !["reqName", "reqDept", "reqPosition", "reqPhone", "reqEmail", "serviceSiteCode"].includes(f.key))
                .map((f) => (
                  <Row
                    key={f.key}
                    k={f.label}
                    v={renderValue(f.type, f.options, formData[f.key])}
                  />
                )),
            )}
            {t.note && <Row k="หมายเหตุ" v={t.note} />}
          </dl>
        </div>

        <Attachments
          ticketId={t.id}
          canModify={t.status !== "CANCELLED" && t.status !== "CLOSED" && (it || isRequester)}
          initial={t.attachments.map((a) => ({
            id: a.id,
            filename: a.filename,
            size: a.size,
            uploadedAt: a.uploadedAt.toISOString(),
          }))}
        />

        {t.formType === "F03" && (
          <LoanPanel
            ticketId={t.id}
            isIT={it}
            ticketClosed={t.status === "CLOSED" || t.status === "CANCELLED"}
            category={String(formData.deviceType ?? "")}
            from={String(formData.borrowDate ?? "")}
            to={String(formData.returnDate ?? "")}
            loans={t.loans.map((l) => ({
              id: l.id,
              itemName: l.item.name,
              serial: l.item.serial,
              borrowDate: l.borrowDate.toISOString(),
              dueDate: l.dueDate.toISOString(),
              returnedAt: l.returnedAt?.toISOString() ?? null,
              status: l.status,
            }))}
          />
        )}

        {t.approvals.length > 0 && (
          <div className="card p-5">
            <h2 className="font-medium text-slate-900">การตรวจสอบ / อนุมัติ</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {t.approvals.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <span className="w-28 text-slate-500">
                    {a.step === "CHECK" ? "ผู้ตรวจสอบ" : a.step === "ACCOUNTING" ? "ผู้ตรวจสอบ(บัญชี)" : "ผู้อนุมัติ"}
                  </span>
                  <span className="flex-1 text-slate-700">{a.approver?.name ?? "-"}</span>
                  <Pill tone={a.status === "APPROVED" ? "green" : a.status === "REJECTED" ? "red" : "amber"}>
                    {a.status === "APPROVED" ? "อนุมัติ" : a.status === "REJECTED" ? "ไม่อนุมัติ" : "รอ"}
                  </Pill>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card p-5">
          <h2 className="font-medium text-slate-900">ประวัติการดำเนินการ</h2>
          <ol className="mt-4 space-y-4 border-l border-border pl-5">
            {t.events.map((e) => (
              <li key={e.id} className="relative text-sm">
                <div className="absolute -left-[25px] top-1 h-2 w-2 rounded-full bg-brand ring-4 ring-card" />
                <div>
                  <p className="text-slate-700">
                    <span className="font-medium">{ACTION_LABEL[e.action] ?? e.action}</span>
                    {" · "}
                    <span className="text-slate-500">{e.actor?.displayName ?? "ระบบ"}</span>
                  </p>
                  {e.comment && <p className="text-slate-600">{e.comment}</p>}
                  <p className="text-xs text-slate-400">{fmtDateTime(e.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="no-print lg:sticky lg:top-20 lg:self-start">
        <WorkflowPanel
          ticketId={t.id}
          status={t.status}
          itStatus={t.itStatus}
          isIT={it}
          isRequester={isRequester}
          hasEvaluation={!!t.evaluation}
          pendingApprovals={t.approvals
            .filter((a) => a.status === "PENDING")
            .map((a) => ({ id: a.id, step: a.step, name: a.approver?.name ?? "-" }))}
          itStaff={itStaff}
        />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
      <dt className="min-w-[120px] shrink-0 text-slate-400">{k}</dt>
      <dd className="text-slate-700 whitespace-pre-wrap">{v}</dd>
    </div>
  );
}

function renderValue(
  type: string,
  options: { value: string; label: string }[] | undefined,
  raw: unknown,
): string {
  const label = (val: string) => options?.find((o) => o.value === val)?.label ?? val;
  if (Array.isArray(raw)) return raw.map((x) => label(String(x))).join(", ") || "-";
  if (raw == null || raw === "") return "-";
  if (type === "datetime" || type === "date") return fmtDateTime(String(raw));
  return label(String(raw));
}
