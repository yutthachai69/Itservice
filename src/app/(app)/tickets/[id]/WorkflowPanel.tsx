"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, MessageSquare, RotateCcw, UserRoundCheck, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { IT_STATUS_LABEL, STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/ui";

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
  const [confirmAction, setConfirmAction] = useState<"CLOSE" | "CANCEL" | null>(null);

  const busy = busyAction !== null;
  const closed = status === "CLOSED" || status === "CANCELLED";
  const canComment = comment.trim().length > 0;
  const workflow = workflowCopy(status, itStatus, closed);
  const currentStage = workflowStageIndex(status, itStatus);

  function reportError(message: string) {
    setErr(message);
    toastError(message);
  }

  async function run(action: string, extra: Record<string, unknown> = {}) {
    if (busy) return;
    if (action === "COMMENT" && !canComment) {
      reportError("กรุณาพิมพ์ความคิดเห็นก่อนบันทึก");
      return;
    }
    if (action === "REJECT_RESOLVE" && !canComment) {
      reportError("กรุณาระบุเหตุผลที่งานยังไม่เรียบร้อย");
      return;
    }
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
      if (action === "CLOSE" || action === "CANCEL") setConfirmAction(null);
    }
  }

  async function decide(approvalId: number, decision: "APPROVED" | "REJECTED") {
    if (busy) return;
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
    <section aria-labelledby="workflow-heading" aria-busy={busy || undefined} className="overflow-hidden rounded-md border border-border bg-card">
      <header className="bg-brand px-5 py-4 text-white">
        <p className="text-[11px] font-medium tracking-[0.08em] text-white/65">ขั้นตอนปัจจุบัน</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h2 id="workflow-heading" className="text-base font-semibold">{workflow.title}</h2>
          <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-medium text-white/90">
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-white/70">{workflow.description}</p>
        <p className="mt-3 border-t border-white/15 pt-2 text-[11px] text-white/70">
          ฝั่ง IT <span className="font-semibold text-white">{IT_STATUS_LABEL[itStatus] ?? itStatus}</span>
        </p>
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        <WorkflowSteps status={status} currentStage={currentStage} />

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
            disabled={busy}
            aria-describedby="workflow-comment-hint"
            placeholder="ระบุความคืบหน้า ความเห็น หรือเหตุผล..."
            className="control-area mt-1.5 w-full resize-y bg-white px-3 py-2 text-sm text-slate-800"
          />
          <div className="mt-1 flex items-start justify-between gap-3 text-[11px] leading-4 text-muted">
            <p id="workflow-comment-hint">ข้อความนี้จะถูกแนบกับรายการที่ดำเนินการถัดไป</p>
            <span className="shrink-0 text-slate-400" aria-live="polite">{comment.length.toLocaleString("th-TH")} ตัวอักษร</span>
          </div>
        </div>

        {err && <p role="alert" aria-live="assertive" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}

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
              <select id="workflow-assignee" value={assignee} disabled={busy} onChange={(event) => setAssignee(event.target.value)} className="control-select w-full bg-white px-3 text-sm text-slate-800">
                <option value="">เลือกเจ้าหน้าที่...</option>
                {itStaff.map((staff) => <option key={staff.id} value={staff.id}>{staff.displayName}</option>)}
              </select>
              <Button className="w-full" variant="secondary" loading={busyAction === "ASSIGN"} disabled={busy || !assignee} onClick={() => run("ASSIGN", { assignedToId: Number(assignee) })}>มอบหมายงาน</Button>
            </div>
          )}
        </section>

        {(isIT || isRequester) && (
          <section aria-labelledby="case-actions-heading" className="space-y-2 border-t border-border pt-4">
            <h3 id="case-actions-heading" className="text-xs font-semibold text-muted">ตัวเลือกคำร้อง</h3>
            {isIT && !closed && <Button className="w-full" variant="secondary" loading={busyAction === "CLOSE"} disabled={busy} onClick={() => setConfirmAction("CLOSE")}>ปิดงานทันที</Button>}
            {!closed && (isIT || itStatus === "NEW") && (
              <Button className="w-full" variant="danger" loading={busyAction === "CANCEL"} disabled={busy} onClick={() => setConfirmAction("CANCEL")}>
                <AlertTriangle size={15} aria-hidden="true" /> ยกเลิกคำร้อง
              </Button>
            )}
            {!closed && !isIT && itStatus !== "NEW" && (
              <p className="text-[11px] leading-5 text-muted">
                IT รับเรื่องแล้ว หากต้องการยกเลิกกรุณาติดต่อ IT โดยตรง (บันทึกความคิดเห็นด้านบนเพื่อแจ้งได้)
              </p>
            )}
            {closed && (
              <Button className="w-full" variant="secondary" loading={busyAction === "REOPEN"} disabled={busy} onClick={() => run("REOPEN")}>
                <RotateCcw size={15} aria-hidden="true" /> เปิดเรื่องอีกครั้ง
              </Button>
            )}
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        tone={confirmAction === "CLOSE" ? "primary" : "danger"}
        title={confirmAction === "CLOSE" ? "ปิดงานทันที?" : "ยกเลิกคำร้องนี้?"}
        description={
          confirmAction === "CLOSE"
            ? "คำร้องจะถูกปิดโดยไม่รอการยืนยันจากผู้แจ้ง และบันทึกไว้ในประวัติ"
            : "การดำเนินการคำร้องจะหยุดลง แต่สามารถเปิดเรื่องอีกครั้งได้ภายหลัง"
        }
        confirmLabel={confirmAction === "CLOSE" ? "ยืนยันปิดงาน" : "ยืนยันยกเลิก"}
        busy={confirmAction !== null && busyAction === confirmAction}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          if (action) void run(action);
        }}
      />
    </section>
  );
}

const WORKFLOW_STAGES = [
  { key: "received", label: "รับคำร้อง" },
  { key: "assigned", label: "รับงาน" },
  { key: "working", label: "ดำเนินการ" },
  { key: "resolved", label: "รอผู้แจ้งยืนยัน" },
  { key: "closed", label: "ปิดงาน" },
] as const;

function workflowStageIndex(status: string, itStatus: string) {
  if (status === "CLOSED") return 4;
  if (status === "RESOLVED") return 3;
  if (itStatus === "RECEIVED") return 1;
  if (itStatus === "IN_PROGRESS" || status === "IN_PROGRESS") return 2;
  return 0;
}

function WorkflowSteps({ status, currentStage }: { status: string; currentStage: number }) {
  const cancelled = status === "CANCELLED";

  return (
    <section aria-labelledby="workflow-steps-heading" className="border-b border-border pb-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id="workflow-steps-heading" className="text-xs font-semibold text-slate-900">
          ขั้นตอนการดำเนินงาน
        </h3>
        <span className={cn("text-[11px]", cancelled ? "text-muted" : "text-brand")}>
          {cancelled ? "ยกเลิกแล้ว" : `ขั้นที่ ${currentStage + 1} จาก ${WORKFLOW_STAGES.length}`}
        </span>
      </div>

      <div className="mt-3 overflow-x-auto pb-1">
        <ol aria-label="ลำดับสถานะคำร้อง" className="grid grid-cols-5 gap-1">
          {WORKFLOW_STAGES.map((stage, index) => {
            const done = !cancelled && index < currentStage;
            const current = !cancelled && index === currentStage;
            return (
              <li
                key={stage.key}
                className={cn("min-w-0 rounded-md px-1.5 pb-1", current && "bg-brand-weak/55")}
                aria-current={current ? "step" : undefined}
                aria-label={`${stage.label}${current ? " (สถานะปัจจุบัน)" : done ? " (เสร็จแล้ว)" : " (ยังไม่ถึงขั้นตอนนี้)"}`}
              >
                <div className="flex items-center">
                  <span
                    title={stage.label}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                      done && "border-brand bg-brand text-white",
                      current && "border-brand bg-brand text-white ring-2 ring-brand/30 ring-offset-1",
                      !done && !current && "border-border-strong bg-surface-subtle text-slate-400",
                      cancelled && "border-border bg-surface-subtle text-slate-300",
                    )}
                  >
                    {done ? <Check size={12} strokeWidth={2.5} aria-hidden="true" /> : index + 1}
                  </span>
                  {index < WORKFLOW_STAGES.length - 1 && (
                    <span
                      className={cn(
                        "mx-1 h-px min-w-0 flex-1",
                        !cancelled && index < currentStage ? "bg-brand" : "bg-border-strong",
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1 block break-words text-xs leading-5",
                    current ? "inline-flex items-center rounded border border-brand/25 bg-brand-weak px-1.5 py-0.5 font-semibold text-brand" : done ? "font-medium text-slate-600" : "text-slate-400",
                    cancelled && "text-slate-300",
                  )}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function workflowCopy(status: string, itStatus: string, closed: boolean) {
  if (status === "CANCELLED") return { title: "ยกเลิกคำร้องแล้ว", description: "คำร้องนี้หยุดดำเนินการ สามารถเปิดเรื่องอีกครั้งได้หากจำเป็น" };
  if (closed) return { title: "ปิดงานแล้ว", description: "การดำเนินงานสิ้นสุดและบันทึกไว้ในประวัติเรียบร้อย" };
  if (status === "RESOLVED") return { title: "รอผู้แจ้งยืนยัน", description: "ดำเนินการเสร็จแล้ว รอผู้แจ้งตรวจสอบก่อนปิดงาน" };
  if (itStatus === "NEW") return { title: "รอรับงาน", description: "คำร้องยังไม่ได้รับมอบหมายหรือเริ่มดำเนินการ" };
  return { title: "กำลังดำเนินการ", description: "บันทึกความคืบหน้า หรือแจ้งเสร็จเมื่อแก้ไขเรียบร้อย" };
}

function approvalStepLabel(step: string) {
  if (step === "CHECK") return "ผู้ตรวจสอบ";
  if (step === "ACCOUNTING") return "ผู้ตรวจสอบบัญชี";
  return "ผู้อนุมัติ";
}
