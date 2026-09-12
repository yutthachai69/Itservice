"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function EvaluateForm({ ticketId }: { ticketId: number }) {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const firstScoreRef = useRef<HTMLButtonElement>(null);
  const scoreButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isDirty = score !== null || comment.trim().length > 0;
  const scoreError = score === null && err !== null;

  useEffect(() => {
    if (!isDirty || busy) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty, busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (score === null) {
      setErr("กรุณาเลือกคะแนนก่อนส่งแบบประเมิน");
      requestAnimationFrame(() => firstScoreRef.current?.focus());
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment: comment || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = body.error === "ALREADY_RATED"
          ? "คำร้องนี้ได้รับการประเมินแล้ว"
          : body.error === "NOT_READY"
            ? "คำร้องนี้ยังไม่ปิดงาน จึงยังประเมินไม่ได้"
            : body.error === "FORBIDDEN"
              ? "คุณไม่มีสิทธิ์ประเมินคำร้องนี้"
              : "ส่งแบบประเมินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
        throw new Error(message);
      }
      router.push(`/tickets/${ticketId}`);
      router.refresh();
    } catch (error) {
      setBusy(false);
      setErr(error instanceof Error ? error.message : "ส่งแบบประเมินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  return (
    <>
      <form onSubmit={submit} aria-busy={busy || undefined} className="mt-4 space-y-5 card p-5 shadow-sm sm:p-7">
      {busy && <span role="status" className="sr-only">กำลังส่งแบบประเมิน กรุณารอสักครู่</span>}
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">ให้คะแนน <span className="text-red-500">*</span></legend>
        <p className="mt-1 text-xs text-muted">เลือก 1–5 คะแนน · ความเห็นเพิ่มเติมไม่บังคับ</p>
        <div
          className={scoreError ? "mt-2 flex gap-2 rounded-md bg-red-50/60 p-1 ring-1 ring-red-300" : "mt-2 flex gap-2"}
          role="radiogroup"
          aria-label="คะแนนความพึงพอใจ"
          aria-describedby={scoreError ? "evaluation-score-hint evaluation-score-error" : "evaluation-score-hint"}
          aria-required="true"
          aria-invalid={scoreError ? "true" : undefined}
          aria-orientation="horizontal"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              ref={(node) => {
                scoreButtonRefs.current[n - 1] = node;
                if (n === 1) firstScoreRef.current = node;
              }}
              tabIndex={(score ?? 1) === n ? 0 : -1}
              disabled={busy}
              onClick={() => {
                setScore(n);
                setErr(null);
              }}
              onKeyDown={(event) => {
                const current = score ?? 1;
                const next =
                  event.key === "ArrowRight" || event.key === "ArrowDown"
                    ? Math.min(5, current + 1)
                    : event.key === "ArrowLeft" || event.key === "ArrowUp"
                      ? Math.max(1, current - 1)
                      : event.key === "Home"
                        ? 1
                        : event.key === "End"
                          ? 5
                          : current;
                if (next === current) return;
                event.preventDefault();
                setScore(next);
                setErr(null);
                requestAnimationFrame(() => scoreButtonRefs.current[next - 1]?.focus());
              }}
              role="radio"
              aria-label={n + " คะแนน" + (n === score ? " (เลือกอยู่)" : "")}
              aria-checked={n === score}
              title={n + " คะแนน"}
              className={score !== null && n <= score ? "flex h-10 w-10 items-center justify-center rounded-md bg-brand text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60" : "flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-400 transition hover:bg-brand-weak hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"}
            >
              <Star size={18} strokeWidth={1.8} fill={score !== null && n <= score ? "currentColor" : "none"} aria-hidden="true" />
            </button>
           ))}
        </div>
        <div className="mt-1 flex w-[13.5rem] justify-between text-[11px] text-slate-400" aria-hidden="true">
          <span>ไม่พอใจมาก</span>
          <span>พอใจมาก</span>
        </div>
        <p id="evaluation-score-hint" className="mt-2 text-xs text-muted" aria-live="polite">
          {score === null ? "กรุณาเลือก 1–5 คะแนน" : `เลือก ${score} จาก 5 คะแนน`}
        </p>
      </fieldset>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">ความเห็นเพิ่มเติม</span>
        <textarea
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (err) setErr(null);
          }}
          rows={3}
          maxLength={1000}
          disabled={busy}
          aria-describedby="evaluation-comment-hint"
          placeholder="สิ่งที่ประทับใจ หรือสิ่งที่อยากให้เราปรับปรุง"
          className="control-area mt-1 w-full px-3 py-2 text-sm"
        />
        <span id="evaluation-comment-hint" className="mt-1 block text-right text-[11px] text-slate-400">{comment.length}/1,000</span>
      </label>
      {err && (
        <p
          id={scoreError ? "evaluation-score-error" : undefined}
          role="alert"
          aria-live="assertive"
          className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {err}
        </p>
      )}
      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-slate-400 sm:max-w-[22rem]">
          การประเมินจะบันทึกไว้กับคำร้องนี้และส่งซ้ำไม่ได้
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <Link
            href={"/tickets/" + ticketId}
            onClick={(event) => {
              if (isDirty) {
                event.preventDefault();
                setCancelOpen(true);
              }
            }}
            className="rounded-sm text-center text-sm font-medium text-muted transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1 sm:text-left"
          >กลับรายละเอียดคำร้อง</Link>
          <Button type="submit" loading={busy} disabled={busy} className="w-full sm:w-auto">ส่งแบบประเมิน</Button>
        </div>
      </div>
      </form>
      <ConfirmDialog
        open={cancelOpen}
        title="ออกจากแบบประเมิน?"
        description="คะแนนหรือความคิดเห็นที่กรอกไว้จะไม่ถูกบันทึก"
        confirmLabel="ออกจากแบบประเมิน"
        cancelLabel="อยู่ต่อ"
        tone="danger"
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => router.push(`/tickets/${ticketId}`)}
      />
    </>
  );
}
