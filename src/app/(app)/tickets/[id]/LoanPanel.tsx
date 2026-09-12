"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DetailSection } from "@/components/DetailSection";
import { Pill } from "@/components/Badge";
import { useToast } from "@/components/Toast";
import { categoryLabel, LOAN_STATUS } from "@/lib/loan-categories";
import { cn, fmtDate } from "@/lib/ui";

type Loan = {
  id: number;
  itemName: string;
  serial: string | null;
  borrowDate: string;
  dueDate: string;
  returnedAt: string | null;
  status: string;
};

type AvailableItem = { id: number; name: string; serial: string | null };

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
  const { success, error: toastError } = useToast();
  const [available, setAvailable] = useState<AvailableItem[] | null>(null);
  const [availabilityKey, setAvailabilityKey] = useState<string | null>(null);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [busyAction, setBusyAction] = useState<"lend" | number | null>(null);
  const [pendingReturn, setPendingReturn] = useState<Loan | null>(null);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [referenceNow] = useState(() => Date.now());

  const hasActive = loans.some((loan) => loan.status === "BOOKED" || loan.status === "ONLOAN");
  const canLend = Boolean(isIT && !ticketClosed && !hasActive && category && from && to);
  const currentAvailabilityKey = `${category}|${from}|${to}`;
  const availabilityReady = availabilityKey === currentAvailabilityKey;
  const currentAvailabilityError = availabilityReady && availabilityError;

  useEffect(() => {
    if (!canLend) return;
    let cancelled = false;
    const query = new URLSearchParams({ category, from, to });
    fetch(`/api/loan-availability?${query.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error("availability");
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setAvailable(Array.isArray(data.items) ? data.items : []);
          setAvailabilityError(false);
          setAvailabilityKey(currentAvailabilityKey);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailable([]);
          setAvailabilityError(true);
          setAvailabilityKey(currentAvailabilityKey);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canLend, category, from, to, currentAvailabilityKey, availabilityAttempt]);

  async function lend() {
    if (!selectedId || busyAction !== null) return;
    setBusyAction("lend");
    setErr(null);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/lend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: Number(selectedId) }),
      });
      if (response.ok) {
        success("บันทึกการยืมอุปกรณ์แล้ว");
        router.refresh();
      } else {
        const message = (await response.json().catch(() => ({}))).error ?? "ให้ยืมไม่สำเร็จ";
        setErr(message);
        toastError(message);
      }
    } catch {
      const message = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่";
      setErr(message);
      toastError(message);
    } finally {
      setBusyAction(null);
      setPendingReturn(null);
    }
  }

  async function receiveReturn(loanId: number) {
    if (busyAction !== null) return;
    setBusyAction(loanId);
    setErr(null);
    try {
      const response = await fetch(`/api/loans/${loanId}/return`, { method: "POST" });
      if (response.ok) {
        success("บันทึกรับคืนอุปกรณ์แล้ว");
        router.refresh();
      } else {
        const message = "บันทึกการคืนไม่สำเร็จ";
        setErr(message);
        toastError(message);
      }
    } catch {
      const message = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่";
      setErr(message);
      toastError(message);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <DetailSection
      title="อุปกรณ์ที่ให้ยืม"
      description={`${categoryLabel(category)} · ${from ? fmtDate(from) : "ไม่ระบุวันยืม"} ถึง ${to ? fmtDate(to) : "ไม่ระบุวันคืน"}`}
    >
      {err && (
        <p role="alert" className="mb-3 border-l-2 border-red-400 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        {busyAction === "lend"
          ? "กำลังบันทึกการยืมอุปกรณ์"
          : typeof busyAction === "number"
            ? "กำลังบันทึกการรับคืนอุปกรณ์"
            : ""}
      </p>

      {loans.length > 0 && (
        <ul className="divide-y divide-border" aria-label="รายการอุปกรณ์ที่ให้ยืม">
          {loans.map((loan) => {
            const overdue =
              loan.status !== "RETURNED" && new Date(loan.dueDate).getTime() < referenceNow;
            const overdueDays = overdue
              ? Math.max(1, Math.ceil((referenceNow - new Date(loan.dueDate).getTime()) / 86400000))
              : 0;
            return (
              <li key={loan.id} className={cn("flex flex-wrap items-center gap-2.5 py-2.5 first:pt-0 last:pb-0", overdue && "rounded-md border-l-2 border-red-400 bg-red-50/40 py-2 pl-3") }>
                <span className="font-medium text-slate-800">{loan.itemName}</span>
                {loan.serial && <span className="font-mono text-xs text-slate-400">S/N {loan.serial}</span>}
                <span className="text-xs text-muted">
                  {fmtDate(loan.borrowDate)} – {fmtDate(loan.dueDate)}
                </span>
                <Pill tone={loan.status === "RETURNED" ? "green" : "amber"}>
                  {LOAN_STATUS[loan.status] ?? loan.status}
                </Pill>
                {overdue && (
                  <Pill tone="red">
                    เลยกำหนด {overdueDays} วัน
                  </Pill>
                )}
                {isIT && (loan.status === "BOOKED" || loan.status === "ONLOAN") && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label={`บันทึกรับคืน ${loan.itemName}`}
                    loading={busyAction === loan.id}
                    disabled={busyAction !== null}
                    className="ml-auto"
                    onClick={() => setPendingReturn(loan)}
                  >
                    บันทึกรับคืน
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canLend && (
        <div className={loans.length > 0 ? "mt-4 border-t border-border pt-4" : undefined}>
          <label htmlFor="loan-item" className="text-xs font-medium text-slate-600">
            อุปกรณ์ที่จะให้ยืม
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <select
              id="loan-item"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={busyAction !== null || !availabilityReady || !available || available.length === 0}
              aria-describedby="loan-item-help"
              className="control min-w-[240px] flex-1 px-3 text-sm disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted"
            >
              <option value="">
                {!availabilityReady || available === null
                  ? "กำลังโหลด…"
                  : available.length === 0
                    ? "ไม่มีชิ้นที่ว่างในช่วงนี้"
                    : `เลือกอุปกรณ์ (ว่าง ${available.length} ชิ้น)`}
              </option>
              {(available ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.serial ? ` — ${item.serial}` : ""}
                </option>
              ))}
            </select>
            <Button type="button" disabled={!selectedId || busyAction !== null} loading={busyAction === "lend"} onClick={lend}>
              {busyAction === "lend" ? "กำลังบันทึก..." : "บันทึกให้ยืม"}
            </Button>
          </div>
          <div
            id="loan-item-help"
            role={currentAvailabilityError ? "alert" : "status"}
            aria-live={currentAvailabilityError ? "assertive" : "polite"}
            className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted"
          >
            {!availabilityReady || available === null ? (
              "กำลังตรวจสอบอุปกรณ์ที่ว่างตามช่วงวันที่"
            ) : availabilityError ? (
              <>
                <span>โหลดรายการอุปกรณ์ไม่สำเร็จ</span>
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-md px-2 font-medium text-brand hover:bg-brand-weak/40 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                  onClick={() => {
                    setAvailabilityKey(null);
                    setAvailabilityError(false);
                    setAvailabilityAttempt((attempt) => attempt + 1);
                  }}
                >
                  ลองอีกครั้ง
                </button>
              </>
            ) : available.length === 0 ? (
              "ไม่มีอุปกรณ์ว่างในช่วงวันที่เลือก"
            ) : (
              `พบอุปกรณ์ว่าง ${available.length} รายการ`
            )}
          </div>
        </div>
      )}

      {!canLend && loans.length === 0 && (
        <p className="text-sm text-slate-400">
          {ticketClosed ? "คำร้องนี้ปิดแล้ว" : isIT ? "รอตรวจสอบข้อมูลวันยืมและวันคืน" : "ยังไม่มีการให้ยืมอุปกรณ์"}
        </p>
      )}

      <ConfirmDialog
        open={pendingReturn !== null}
        title="บันทึกรับคืนอุปกรณ์?"
        description={
          pendingReturn
            ? `ยืนยันว่าได้รับ “${pendingReturn.itemName}” คืนแล้ว`
            : ""
        }
        confirmLabel="ยืนยันรับคืน"
        tone="primary"
        busy={pendingReturn !== null && busyAction === pendingReturn.id}
        onCancel={() => setPendingReturn(null)}
        onConfirm={() => {
          const target = pendingReturn;
          if (target) void receiveReturn(target.id);
        }}
      />
    </DetailSection>
  );
}
