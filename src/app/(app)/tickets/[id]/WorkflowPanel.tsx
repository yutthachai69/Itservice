"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, MessageSquare, RotateCcw, UserRoundCheck, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { useToast } from "@/components/Toast";

const ACTION_DONE: Record<string, string> = {
  RECEIVE: "รับงานแล้ว",
  PROGRESS: "บันทึกความคืบหน้าแล้ว",
  RESOLVE: "แจ้งดำเนินการเสร็จแล้ว รอผู้แจ้งยืนยัน",
  CLOSE: "ปิดงานแล้ว",
  ASSIGN: "มอบหมายงานแล้ว",
  CONFIRM_CLOSE: "ยืนยันปิดงานแล้ว ขอบคุณครับ",
  REJECT_RESOLVE: "ส่งกลับให้ IT ดำเนินการต่อแล้ว",
  CANCEL: "ยกเลิกเรื่องแล้ว",
  COMMENT: "บันทึกความคิดเห็นแล้ว",
  REOPEN: "เปิดเรื่องอีกครั้งแล้ว",
};

type Approval = { id: number; step: string; name: string };
type Staff = { id: number; displayName: string };

export function WorkflowPanel({
  ticketId,
  status,
  itStatus,
  isIT,
  isRequester,
  hasEvaluation,
  pendingApprovals,
  itStaff,
}: {
  ticketId: number;
  status: string;
  itStatus: string;
  isIT: boolean;
  isRequester: boolean;
  hasEvaluation: boolean;
  pendingApprovals: Approval[];
  itStaff: Staff[];
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [assignee, setAssignee] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const busy = busyAction !== null;
  const closed = status === "CLOSED" || status === "CANCELLED";
  const canComment = comment.trim().length > 0;
  const workflow = workflowCopy(status, itStatus, closed);

  function reportError(message: string) {
    setErr(message);
    toastError(message);
  }

  async function run(action: string, extra: Record<string, unknown> = {}) {
    if (action === "COMMENT" && !canComment) {
      reportError("กรุณาพิมพ์ความคิดเห็นก่อนบันทึก");
      return;
    }
    if (action === "REJECT_RESOLVE" && !canComment) {
      reportError("กรุณาระบุเหตุผลที่งานยังไม่เรียบร้อย");
      return;
    }
    if (action === "CLOSE" && !window.confirm("ต้องการปิดคำร้องนี้ทันทีใช่หรือไม่?")) return;
    if (action === "CANCEL" && !window.confirm("ต้องการยกเลิกคำร้องนี้ใช่หรือไม่? การดำเนินการจะหยุดลง")) return;

    setBusyAction(action);
    setErr(null);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment.trim() || undefined, ...extra }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "ทำรายการไม่สำเร็จ");
      }
      setComment("");
      success(ACTION_DONE[action] ?? "ทำรายการแล้ว");
      router.refresh();
    } catch (error) {
      reportError(error instanceof Error ? error.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusyAction(null);
    }
  }

  async function decide(approvalId: number, decision: "APPROVED" | "REJECTED") {
    const actionKey = `decide-${approvalId}-${decision}`;
    setBusyAction(actionKey);
    setErr(null);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, decision, comment: comment.trim() || undefined }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "ทำรายการไม่สำเร็จ");
      }
      setComment("");
      success(decision === "APPROVED" ? "อนุมัติแล้ว" : "บันทึกว่าไม่อนุมัติแล้ว");
      router.refresh();
    } catch (error) {
      reportError(error instanceof Error ? error.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section aria-labelledby="workflow-heading" className="overflow-hidden rounded-md border border-border bg-card">
      <header className="bg-sidebar px-5 py-4 text-white">
        <p className="text-[11px] font-medium tracking-[0.08em] text-blue-100/60">ขั้นตอนปัจจุบัน</p>
        <h2 id="workflow-heading" className="mt-1 text-base font-semibold">{workflow.title}</h2>
        <p className="mt-1 text-xs leading-5 text-blue-100/65">{workflow.description}</p>
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <label htmlFor="workflow-comment" className="text-xs font-semibold text-slate-700">บันทึกการดำเนินงาน</label>
          <textarea
            id="workflow-comment"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              if (err) setErr(null);
            }}
            rows={3}
            placeholder="ระบุความคืบหน้า ความเห็น หรือเหตุผล..."
            className="mt-1.5 w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <p className="mt-1 text-[11px] leading-4 text-muted">ข้อความนี้จะถูกแนบกับรายการที่ดำเนินการถัดไป</p>
        </div>

        {err && <p role="alert" aria-live="polite" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}

        {isIT && !closed && pendingApprovals.length > 0 && (
          <section aria-labelledby="approval-heading" className="border-t border-border pt-4">
            <h3 id="approval-heading" className="text-xs font-semibold text-slate-900">รายการรออนุมัติ</h3>
            <div className="mt-2 divide-y divide-border rounded-md border border-border">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="space-y-2.5 p-3">
                  <div>
                    <p className="text-[11px] text-muted">{approvalStepLabel(approval.step)}</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-800">{approval.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary" loading={busyAction === `decide-${approval.id}-APPROVED`} disabled={busy} onClick={() => decide(approval.id, "APPROVED")}>
                      <Check size={14} aria-hidden="true" /> อนุมัติ
                    </Button>
                    <Button size="sm" variant="danger" loading={busyAction === `decide-${approval.id}-REJECTED`} disabled={busy} onClick={() => decide(approval.id, "REJECTED")}>
                      <X size={14} aria-hidden="true" /> ไม่อนุมัติ
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {isIT && !closed && itStatus === "NEW" && (
          <Button className="w-full" loading={busyAction === "RECEIVE"} disabled={busy} onClick={() => run("RECEIVE")}>
            <UserRoundCheck size={16} aria-hidden="true" /> รับงานนี้
          </Button>
        )}

        {isIT && !closed && itStatus !== "NEW" && status !== "RESOLVED" && (
          <Button className="w-full" loading={busyAction === "RESOLVE"} disabled={busy} onClick={() => run("RESOLVE")}>
            <Check size={16} aria-hidden="true" /> แจ้งดำเนินการเสร็จ
          </Button>
        )}

        {isIT && !closed && status === "RESOLVED" && (
          <p className="border-l-2 border-brand bg-brand-weak px-3 py-2.5 text-xs leading-5 text-slate-700">ส่งผลให้ผู้แจ้งแล้ว ขณะนี้รอผู้แจ้งตรวจสอบและยืนยันปิดงาน</p>
        )}

        {isRequester && status === "RESOLVED" && (
          <section aria-labelledby="requester-decision-heading" className="space-y-2.5 border-t border-border pt-4">
            <div>
              <h3 id="requester-decision-heading" className="text-sm font-semibold text-slate-900">ตรวจสอบผลการดำเนินงาน</h3>
              <p className="mt-0.5 text-xs text-muted">IT แจ้งว่าดำเนินการเสร็จแล้ว กรุณายืนยันผล</p>
            </div>
            <Button className="w-full" loading={busyAction === "CONFIRM_CLOSE"} disabled={busy} onClick={() => run("CONFIRM_CLOSE")}>
              <Check size={16} aria-hidden="true" /> เรียบร้อยแล้ว ปิดงาน
            </Button>
            <Button className="w-full" variant="secondary" loading={busyAction === "REJECT_RESOLVE"} disabled={busy} onClick={() => run("REJECT_RESOLVE")}>ยังไม่เรียบร้อย</Button>
          </section>
        )}

        {isRequester && !isIT && !closed && status !== "RESOLVED" && (
          <p className="border-l-2 border-brand bg-surface-subtle px-3 py-2.5 text-xs leading-5 text-slate-600">ทีม IT กำลังตรวจสอบคำร้อง ระบบจะแสดงความคืบหน้าที่หน้านี้เมื่อมีการอัปเดต</p>
        )}

        {status === "CLOSED" && isRequester && !hasEvaluation && <ButtonLink href={`/evaluate/${ticketId}`} className="w-full">ประเมินความพึงพอใจ</ButtonLink>}
        {hasEvaluation && <p className="border-l-2 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">ประเมินความพึงพอใจแล้ว ขอบคุณสำหรับความคิดเห็น</p>}

        <section aria-labelledby="supporting-actions-heading" className="space-y-3 border-t border-border pt-4">
          <h3 id="supporting-actions-heading" className="text-xs font-semibold text-slate-900">เครื่องมือเพิ่มเติม</h3>
          {isIT && !closed && itStatus !== "NEW" && status !== "RESOLVED" && (
            <Button className="w-full" variant="secondary" loading={busyAction === "PROGRESS"} disabled={busy} onClick={() => run("PROGRESS")}>บันทึกความคืบหน้า</Button>
          )}
          <Button className="w-full" variant="secondary" loading={busyAction === "COMMENT"} disabled={busy || !canComment} onClick={() => run("COMMENT")}>
            <MessageSquare size={15} aria-hidden="true" /> บันทึกความคิดเห็น
          </Button>
          {isIT && !closed && (
            <div className="space-y-1.5">
              <label htmlFor="workflow-assignee" className="text-xs font-medium text-slate-600">มอบหมายผู้รับผิดชอบ</label>
              <select id="workflow-assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15">
                <option value="">เลือกเจ้าหน้าที่...</option>
                {itStaff.map((staff) => <option key={staff.id} value={staff.id}>{staff.displayName}</option>)}
              </select>
              <Button className="w-full" variant="secondary" loading={busyAction === "ASSIGN"} disabled={busy || !assignee} onClick={() => run("ASSIGN", { assignedToId: Number(assignee) })}>มอบหมายงาน</Button>
            </div>
          )}
        </section>

        {(isIT || isRequester) && (
          <section aria-labelledby="case-actions-heading" className="space-y-2 border-t border-border pt-4">
            <h3 id="case-actions-heading" className="text-xs font-semibold text-slate-500">ตัวเลือกคำร้อง</h3>
            {isIT && !closed && <Button className="w-full" variant="secondary" loading={busyAction === "CLOSE"} disabled={busy} onClick={() => run("CLOSE")}>ปิดงานทันที</Button>}
            {!closed && (
              <Button className="w-full" variant="danger" loading={busyAction === "CANCEL"} disabled={busy} onClick={() => run("CANCEL")}>
                <AlertTriangle size={15} aria-hidden="true" /> ยกเลิกคำร้อง
              </Button>
            )}
            {closed && (
              <Button className="w-full" variant="secondary" loading={busyAction === "REOPEN"} disabled={busy} onClick={() => run("REOPEN")}>
                <RotateCcw size={15} aria-hidden="true" /> เปิดเรื่องอีกครั้ง
              </Button>
            )}
          </section>
        )}
      </div>
    </section>
  );
}

function workflowCopy(status: string, itStatus: string, closed: boolean) {
  if (status === "CANCELLED") return { title: "ยกเลิกคำร้องแล้ว", description: "คำร้องนี้หยุดดำเนินการ สามารถเปิดเรื่องอีกครั้งได้หากจำเป็น" };
  if (closed) return { title: "ปิดงานแล้ว", description: "การดำเนินงานสิ้นสุดและบันทึกไว้ในประวัติเรียบร้อย" };
  if (status === "RESOLVED") return { title: "รอยืนยันผล", description: "ดำเนินการเสร็จแล้ว รอผู้แจ้งตรวจสอบก่อนปิดงาน" };
  if (itStatus === "NEW") return { title: "รอรับงาน", description: "คำร้องยังไม่ได้รับมอบหมายหรือเริ่มดำเนินการ" };
  return { title: "กำลังดำเนินการ", description: "บันทึกความคืบหน้า หรือแจ้งเสร็จเมื่อแก้ไขเรียบร้อย" };
}

function approvalStepLabel(step: string) {
  if (step === "CHECK") return "ผู้ตรวจสอบ";
  if (step === "ACCOUNTING") return "ผู้ตรวจสอบบัญชี";
  return "ผู้อนุมัติ";
}
