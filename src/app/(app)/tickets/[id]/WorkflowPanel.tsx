"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";

const ACTION_DONE: Record<string, string> = {
  RECEIVE: "รับงานแล้ว",
  PROGRESS: "บันทึกความคืบหน้าแล้ว",
  RESOLVE: "แจ้งเสร็จแล้ว — รอผู้แจ้งยืนยัน",
  CLOSE: "ปิดงานแล้ว",
  ASSIGN: "มอบหมายงานแล้ว",
  CONFIRM_CLOSE: "ยืนยันปิดงานแล้ว ขอบคุณครับ",
  REJECT_RESOLVE: "ส่งกลับให้ IT ดำเนินการต่อแล้ว",
  CANCEL: "ยกเลิกเรื่องแล้ว",
  COMMENT: "บันทึกความเห็นแล้ว",
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
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [assignee, setAssignee] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const closed = status === "CLOSED" || status === "CANCELLED";

  /** button label with a spinner while its own action is in flight */
  const lbl = (action: string, text: string) => (
    <>
      {busyAction === action && <Spinner />}
      {text}
    </>
  );

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setBusyAction(action);
    setErr(null);
    const res = await fetch(`/api/tickets/${ticketId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment: comment || undefined, ...extra }),
    });
    setBusy(false);
    setBusyAction(null);
    if (res.ok) {
      setComment("");
      success(ACTION_DONE[action] ?? "ทำรายการแล้ว");
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      const msg = b.error ?? "ทำรายการไม่สำเร็จ";
      setErr(msg);
      toastError(msg);
    }
  }

  async function decide(approvalId: number, decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    setBusyAction(`decide-${approvalId}-${decision}`);
    setErr(null);
    const res = await fetch(`/api/tickets/${ticketId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalId, decision, comment: comment || undefined }),
    });
    setBusy(false);
    setBusyAction(null);
    if (res.ok) {
      setComment("");
      success(decision === "APPROVED" ? "อนุมัติแล้ว" : "บันทึกว่าไม่อนุมัติแล้ว");
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      const msg = b.error ?? "ทำรายการไม่สำเร็จ";
      setErr(msg);
      toastError(msg);
    }
  }

  const primary =
    "inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 active:scale-[0.99] disabled:opacity-50";
  const secondary =
    "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50";

  // one-line "where are we / what to do" for IT
  const itHint = !isIT
    ? null
    : itStatus === "NEW"
      ? "ยังไม่มีใครรับคำร้องนี้ — กด “รับงาน” เพื่อเริ่มดำเนินการ"
      : status === "RESOLVED"
        ? "แจ้งเสร็จแล้ว กำลังรอผู้แจ้งยืนยันปิดงาน"
        : "คุณกำลังดำเนินการอยู่ — อัปเดตความคืบหน้า หรือกด “แจ้งเสร็จ” เมื่อทำเสร็จ";

  return (
    <div className="space-y-3 card p-4 shadow-sm">
      <div>
        <h2 className="font-semibold text-slate-900">การดำเนินการ</h2>
        {itHint && <p className="mt-1 text-xs text-muted">{itHint}</p>}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="ความเห็น / บันทึกการทำงาน — จะแนบไปกับปุ่มที่กดถัดไป (ไม่บังคับ)"
        className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
      />

      {err && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{err}</p>}

      {isIT && !closed && (
        <div className="space-y-2">
          {pendingApprovals.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-2 space-y-2">
              <p className="text-xs font-medium text-amber-800">รออนุมัติ</p>
              {pendingApprovals.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5">
                  <span className="flex-1 text-xs text-amber-900">{a.name}</span>
                  <button
                    disabled={busy}
                    onClick={() => decide(a.id, "APPROVED")}
                    className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                  >
                    อนุมัติ
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => decide(a.id, "REJECTED")}
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                  >
                    ไม่อนุมัติ
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* primary next step */}
          {itStatus === "NEW" && (
            <button
              disabled={busy}
              onClick={() => run("RECEIVE")}
              className={`${primary} bg-brand hover:bg-brand-strong`}
            >
              {lbl("RECEIVE", "รับงาน")}
            </button>
          )}
          {itStatus !== "NEW" && status !== "RESOLVED" && (
            <button
              disabled={busy}
              onClick={() => run("RESOLVE")}
              className={`${primary} bg-brand hover:bg-brand-strong`}
            >
              {lbl("RESOLVE", "แจ้งเสร็จ (ให้ผู้แจ้งยืนยัน)")}
            </button>
          )}
          {status === "RESOLVED" && (
            <p className="rounded-lg bg-violet-50 px-2 py-1.5 text-xs text-violet-800">
              รอผู้แจ้งยืนยันปิดงาน — ปุ่มด้านล่างใช้เมื่อผู้แจ้งไม่ตอบ
            </p>
          )}

          {/* secondary steps */}
          <div className="space-y-2 border-t border-border pt-2">
            {itStatus !== "NEW" && status !== "RESOLVED" && (
              <button disabled={busy} onClick={() => run("PROGRESS")} className={secondary}>
                {lbl("PROGRESS", "อัปเดตความคืบหน้า")}
              </button>
            )}
            <button disabled={busy} onClick={() => run("CLOSE")} className={secondary}>
              {lbl("CLOSE", status === "RESOLVED" ? "ปิดงาน (ผู้แจ้งไม่ตอบ)" : "ปิดงานทันที")}
            </button>
            <div className="flex gap-1.5">
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="flex-1 rounded-lg border border-border px-2 py-1.5 text-sm"
              >
                <option value="">มอบหมายให้...</option>
                {itStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName}
                  </option>
                ))}
              </select>
              <button
                disabled={busy || !assignee}
                onClick={() => run("ASSIGN", { assignedToId: Number(assignee) })}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-50"
              >
                มอบหมาย
              </button>
            </div>
          </div>
        </div>
      )}

      {isRequester && status === "RESOLVED" && (
        <div className="space-y-2 rounded-lg bg-emerald-50 p-2">
          <p className="text-xs font-medium text-emerald-800">IT แจ้งว่าดำเนินการเสร็จแล้ว</p>
          <button disabled={busy} onClick={() => run("CONFIRM_CLOSE")} className={`${primary} bg-emerald-700 hover:bg-emerald-800`}>
            {lbl("CONFIRM_CLOSE", "ยืนยัน เรียบร้อยแล้ว (ปิดงาน)")}
          </button>
          <button
            disabled={busy}
            onClick={() => run("REJECT_RESOLVE")}
            className="w-full rounded-lg border border-amber-400 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-50 disabled:opacity-50"
          >
            ยังไม่เรียบร้อย (ระบุเหตุผลในช่องความเห็น)
          </button>
        </div>
      )}

      {isRequester && !isIT && !closed && status !== "RESOLVED" && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted">
          IT กำลังตรวจสอบและดำเนินการคำร้องของคุณ ระบบจะแจ้งเมื่อมีความคืบหน้า
        </p>
      )}

      {/* shared secondary / destructive */}
      <div className="space-y-2 border-t border-border pt-2">
        <button disabled={busy} onClick={() => run("COMMENT")} className={secondary}>
          {lbl("COMMENT", "บันทึกความเห็น")}
        </button>

        {!closed && (isIT || isRequester) && (
          <button
            disabled={busy}
            onClick={() => run("CANCEL")}
            className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          >
            ยกเลิกเรื่อง
          </button>
        )}

        {closed && (isIT || isRequester) && (
          <button disabled={busy} onClick={() => run("REOPEN")} className={secondary}>
            {lbl("REOPEN", "เปิดเรื่องอีกครั้ง")}
          </button>
        )}
      </div>

      {status === "CLOSED" && isRequester && !hasEvaluation && (
        <Link href={`/evaluate/${ticketId}`} className={`${primary} block bg-amber-500 text-center hover:bg-amber-600`}>
          ประเมินความพึงพอใจ
        </Link>
      )}
      {hasEvaluation && <p className="text-center text-xs text-slate-400">ประเมินแล้ว ขอบคุณครับ</p>}
    </div>
  );
}
