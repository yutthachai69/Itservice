"use client";

import { useEffect, useState } from "react";
import { categoryLabel } from "@/lib/loan-categories";

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
  const validRange = Boolean(category && from && to && new Date(to) >= new Date(from));
  const queryKey = validRange ? `${category}:${from}:${to}` : null;

  useEffect(() => {
    if (!queryKey) return;
    let cancelled = false;
    const p = new URLSearchParams({ category, from, to });
    fetch(`/api/loan-availability?${p.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (typeof d.count === "number") setState({ key: queryKey, count: d.count });
        else setState({ key: queryKey, error: "เช็คไม่ได้" });
      })
      .catch(() => !cancelled && setState({ key: queryKey, error: "เช็คไม่ได้" }));
    return () => {
      cancelled = true;
    };
  }, [category, from, queryKey, to]);

  if (!queryKey) return null;
  const loading = state.key !== queryKey;
  const tone = loading || state.error
    ? "border-slate-200 bg-slate-50 text-slate-600"
    : state.count === 0
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className={`mx-5 border-l-2 px-4 py-3 text-sm sm:mx-7 ${tone}`}>
      {loading
        ? "กำลังเช็คอุปกรณ์ว่าง…"
        : state.error
          ? state.error
          : state.count === 0
            ? `ไม่มี "${categoryLabel(category)}" ว่างในช่วง ${from} ถึง ${to} — ส่งคำร้องได้ IT จะประสานงานให้`
            : `มี "${categoryLabel(category)}" ว่าง ${state.count} ชิ้น ในช่วง ${from} ถึง ${to}`}
    </div>
  );
}
