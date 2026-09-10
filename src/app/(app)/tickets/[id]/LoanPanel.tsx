"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { categoryLabel, LOAN_STATUS } from "@/lib/loan-categories";
import { fmtDate } from "@/lib/ui";

type Loan = {
  id: number;
  itemName: string;
  serial: string | null;
  borrowDate: string;
  dueDate: string;
  returnedAt: string | null;
  status: string;
};
type Avail = { id: number; name: string; serial: string | null };

export function LoanPanel({
  ticketId,
  isIT,
  ticketClosed,
  category,
  from,
  to,
  loans,
}: {
  ticketId: number;
  isIT: boolean;
  ticketClosed: boolean;
  category: string;
  from: string;
  to: string;
  loans: Loan[];
}) {
  const router = useRouter();
  const [avail, setAvail] = useState<Avail[] | null>(null);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [referenceNow] = useState(() => Date.now());

  const hasActive = loans.some((l) => l.status === "BOOKED" || l.status === "ONLOAN");
  const canLend = isIT && !ticketClosed && !hasActive && category && from && to;

  useEffect(() => {
    if (!canLend) return;
    const p = new URLSearchParams({ category, from, to });
    fetch(`/api/loan-availability?${p.toString()}`)
      .then((r) => r.json())
      .then((d) => setAvail(Array.isArray(d.items) ? d.items : []))
      .catch(() => setAvail([]));
  }, [canLend, category, from, to]);

  async function lend() {
    if (!pick) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/tickets/${ticketId}/lend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: Number(pick) }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr((await res.json().catch(() => ({}))).error ?? "ให้ยืมไม่สำเร็จ");
  }

  async function ret(loanId: number) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/loans/${loanId}/return`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr("บันทึกการคืนไม่สำเร็จ");
  }

  return (
    <div className="card p-5 shadow-sm">
      <h2 className="font-medium text-slate-900">
        อุปกรณ์ที่ให้ยืม — {categoryLabel(category)}{" "}
        <span className="text-xs text-slate-400">
          ({from || "?"} ถึง {to || "?"})
        </span>
      </h2>

      {err && <p className="mt-2 border-l-2 border-red-400 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}

      {loans.length > 0 && (
        <ul className="mt-3 divide-y divide-border text-sm">
          {loans.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="font-medium text-slate-700">{l.itemName}</span>
              {l.serial && <span className="text-xs text-slate-400">S/N {l.serial}</span>}
              <span className="text-xs text-slate-500">
                {fmtDate(l.borrowDate)} – {fmtDate(l.dueDate)}
              </span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-xs ring-1 ring-inset " +
                  (l.status === "RETURNED"
                    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                    : "bg-amber-100 text-amber-800 ring-amber-200")
                }
              >
                {LOAN_STATUS[l.status] ?? l.status}
              </span>
              {l.status !== "RETURNED" && new Date(l.dueDate).getTime() < referenceNow && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 ring-1 ring-inset ring-red-200">
                  เลยกำหนดคืน {Math.floor((referenceNow - new Date(l.dueDate).getTime()) / 86400000)} วัน
                </span>
              )}
              {isIT && (l.status === "BOOKED" || l.status === "ONLOAN") && (
                <button
                  disabled={busy}
                  onClick={() => ret(l.id)}
                  className="ml-auto rounded-lg border border-border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  บันทึกรับคืน
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canLend && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="h-10 min-w-[240px] rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          >
            <option value="">
              {avail === null
                ? "กำลังโหลด…"
                : avail.length === 0
                  ? "ไม่มีชิ้นที่ว่างในช่วงนี้"
                  : `เลือกชิ้นที่จะให้ยืม (ว่าง ${avail.length})`}
            </option>
            {(avail ?? []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
                {i.serial ? ` — ${i.serial}` : ""}
              </option>
            ))}
          </select>
          <button
            disabled={busy || !pick}
            onClick={lend}
            className="h-10 rounded-lg bg-brand px-4 text-sm text-white transition hover:bg-brand-strong disabled:opacity-50"
          >
            ให้ยืม
          </button>
        </div>
      )}

      {!canLend && loans.length === 0 && (
        <p className="mt-2 text-sm text-slate-400">
          {ticketClosed ? "ปิดงานแล้ว" : isIT ? "รอตรวจสอบวันยืม/คืนในคำร้อง" : "ยังไม่มีการให้ยืม"}
        </p>
      )}
    </div>
  );
}
