"use client";

import { useEffect, useState } from "react";
import { categoryLabel } from "@/lib/loan-categories";
import { fmtDate } from "@/lib/ui";

export function LoanAvailabilityHint({
  category,
  from,
  to,
}: {
  category: string;
  from: string;
  to: string;
}) {
  const [state, setState] = useState<
    { key: string; count?: number; error?: string }
  >({ key: "" });
  const [attempt, setAttempt] = useState(0);
  const validRange = Boolean(category && from && to && new Date(to) >= new Date(from));
  const queryKey = validRange ? `${category}:${from}:${to}` : null;

  useEffect(() => {
    if (!queryKey) return;
    let cancelled = false;
    const p = new URLSearchParams({ category, from, to });
    fetch(`/api/loan-availability?${p.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("availability");
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        if (typeof d.count === "number") setState({ key: queryKey, count: d.count });
        else setState({ key: queryKey, error: "ตรวจสอบอุปกรณ์ไม่สำเร็จ" });
      })
      .catch(() => !cancelled && setState({ key: queryKey, error: "ตรวจสอบอุปกรณ์ไม่สำเร็จ" }));
    return () => {
      cancelled = true;
    };
  }, [attempt, category, from, queryKey, to]);

  if (!queryKey) return null;
  const loading = state.key !== queryKey;
  const currentError = !loading && Boolean(state.error);
  const tone = loading || state.error
    ? "border-slate-300 text-slate-600"
    : state.count === 0
      ? "border-amber-400 text-amber-800"
      : "border-emerald-500 text-emerald-700";

  return (
    <div
      role={currentError ? "alert" : "status"}
      aria-live={currentError ? "assertive" : "polite"}
      aria-atomic="true"
      aria-busy={loading || undefined}
      className={`mt-4 border-l-2 py-1 pl-3 text-xs ${tone}`}
    >
      {loading ? (
        "กำลังเช็คอุปกรณ์ว่าง…"
      ) : state.error ? (
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{state.error}</span>
          <button
            type="button"
            className="inline-flex min-h-8 items-center rounded-md px-2 font-medium text-brand transition-colors hover:bg-brand-weak/50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
            onClick={() => {
              setState({ key: "" });
              setAttempt((current) => current + 1);
            }}
          >
            ลองอีกครั้ง
          </button>
        </span>
      ) : state.count === 0 ? (
        `ไม่มี "${categoryLabel(category)}" ว่างในช่วง ${fmtDate(from)} ถึง ${fmtDate(to)} — ส่งคำร้องได้ IT จะประสานงานให้`
      ) : (
        `มี "${categoryLabel(category)}" ว่าง ${state.count} ชิ้น ในช่วง ${fmtDate(from)} ถึง ${fmtDate(to)}`
      )}
    </div>
  );
}
