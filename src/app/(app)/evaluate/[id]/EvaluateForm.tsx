"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// three dimensions mirroring the legacy "ประเมินการให้บริการ" form
const DIMENSIONS = [
  { key: "score", label: "ความพึงพอใจในการให้บริการ" },
  { key: "scoreQuality", label: "ความเรียบร้อยของงาน" },
  { key: "scoreSpeed", label: "ความรวดเร็วในการให้บริการ" },
] as const;

type DimKey = (typeof DIMENSIONS)[number]["key"];

function StarRating({
  name,
  value,
  invalid,
  disabled,
  onChange,
}: {
  name: string;
  value: number | null;
  invalid: boolean;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <div
      className={invalid ? "flex gap-2 rounded-md bg-red-50/60 p-1 ring-1 ring-red-300" : "flex gap-2"}
      role="radiogroup"
      aria-label={name}
      aria-required="true"
      aria-invalid={invalid ? "true" : undefined}
      aria-orientation="horizontal"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          ref={(node) => {
            refs.current[n - 1] = node;
          }}
          tabIndex={(value ?? 1) === n ? 0 : -1}
          disabled={disabled}
          onClick={() => onChange(n)}
          onKeyDown={(event) => {
            if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next =
              event.key === "ArrowRight" || event.key === "ArrowDown"
                ? (n % 5) + 1
                : event.key === "ArrowLeft" || event.key === "ArrowUp"
                  ? ((n + 3) % 5) + 1
                  : event.key === "Home"
                    ? 1
                    : event.key === "End"
                      ? 5
                      : n;
            onChange(next);
            requestAnimationFrame(() => refs.current[next - 1]?.focus());
          }}
          role="radio"
          aria-label={n + " คะแนน" + (n === value ? " (เลือกอยู่)" : "")}
          aria-checked={n === value}
          title={n + " คะแนน"}
          className={
            value !== null && n <= value
              ? "flex h-10 w-10 items-center justify-center rounded-md bg-brand text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              : "flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-400 transition hover:bg-brand-weak hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          }
        >
          <Star size={18} strokeWidth={1.8} fill={value !== null && n <= value ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function EvaluateForm({ ticketId }: { ticketId: number }) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<DimKey, number | null>>({
    score: null,
    scoreQuality: null,
    scoreSpeed: null,
  });
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const isDirty = DIMENSIONS.some((d) => scores[d.key] !== null) || comment.trim().length > 0;
  const firstMissing = DIMENSIONS.find((d) => scores[d.key] === null)?.key ?? null;
  const showErrors = err !== null && firstMissing !== null;

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
    if (firstMissing) {
      setErr("กรุณาให้คะแนนครบทุกหัวข้อก่อนส่งแบบประเมิน");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: scores.score,
          scoreQuality: scores.scoreQuality,
          scoreSpeed: scores.scoreSpeed,
          comment: comment || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          body.error === "ALREADY_RATED"
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
        <p className="text-xs text-muted">ให้คะแนน 1–5 ทุกหัวข้อ · ความเห็นเพิ่มเติมไม่บังคับ</p>
        {DIMENSIONS.map((d) => (
          <fieldset key={d.key}>
            <legend className="text-sm font-medium text-slate-700">
              {d.label} <span className="text-red-500">*</span>
            </legend>
            <div className="mt-2">
              <StarRating
                name={d.label}
                value={scores[d.key]}
                invalid={showErrors && scores[d.key] === null}
                disabled={busy}
                onChange={(n) => {
                  setScores((prev) => ({ ...prev, [d.key]: n }));
                  setErr(null);
                }}
              />
            </div>
          </fieldset>
        ))}
        <div className="flex w-[14.5rem] max-w-full justify-between text-xs text-slate-500" aria-hidden="true">
          <span>ไม่พอใจมาก</span>
          <span>พอใจมาก</span>
        </div>
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
          <span id="evaluation-comment-hint" className="mt-1 block text-right text-xs text-slate-500">{comment.length}/1,000</span>
        </label>
        {err && (
          <p role="alert" aria-live="assertive" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </p>
        )}
        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-slate-500 sm:max-w-[22rem]">
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
