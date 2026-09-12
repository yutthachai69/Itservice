"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, fmtDate } from "@/lib/ui";
import { LOAN_STATUS } from "@/lib/loan-categories";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { PackageOpen } from "lucide-react";

type Row = {
  id: number;
  itemName: string;
  category: string;
  serial: string | null;
  borrowerName: string;
  borrowDate: string;
  dueDate: string;
  returnedAt: string | null;
  status: string;
  ticket: { id: number; docNo: string } | null;
};

export function LoansTable({
  rows,
  emptyState,
}: {
  rows: Row[];
  emptyState?: { title: string; hint: string; clearHref?: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [extendId, setExtendId] = useState<number | null>(null);
  const [newDue, setNewDue] = useState("");
  const [pendingReturn, setPendingReturn] = useState<Row | null>(null);
  const extendDateDesktopRef = useRef<HTMLInputElement>(null);
  const extendDateMobileRef = useRef<HTMLInputElement>(null);
  const [referenceNow] = useState(() => Date.now());
  const minimumDue = toDateInputValue(referenceNow);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (extendId === null) return;
    requestAnimationFrame(() => {
      const target = window.matchMedia("(min-width: 1024px)").matches
        ? extendDateDesktopRef.current
        : extendDateMobileRef.current;
      target?.focus();
    });
  }, [extendId]);

  async function act(id: number, url: string, body?: unknown) {
    if (busy !== null) return;
    setBusy(id);
    setErr(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        setExtendId(null);
        success(url.includes("/return") ? "บันทึกรับคืนอุปกรณ์แล้ว" : "ต่ออายุการยืมแล้ว");
        router.refresh();
      } else {
        const message = (await res.json().catch(() => ({}))).error ?? "ทำรายการไม่สำเร็จ";
        setErr(message);
        toastError(message);
      }
    } catch {
      const message = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่";
      setErr(message);
      toastError(message);
    } finally {
      setBusy(null);
      setPendingReturn(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={emptyState?.title ?? "ไม่มีรายการยืม"}
        hint={emptyState?.hint ?? "ยังไม่มีการยืมที่ตรงกับเงื่อนไข"}
        cta={emptyState?.clearHref ? { href: emptyState.clearHref, label: "ล้างตัวกรอง" } : undefined}
      />
    );
  }

  return (
    <div className="space-y-2">
      {err && <p role="alert" aria-live="assertive" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <ul className="divide-y divide-border overflow-hidden card lg:hidden" aria-label="รายการยืมคืน">
        {rows.map((l) => {
          const overdue = l.status !== "RETURNED" && new Date(l.dueDate).getTime() < referenceNow;
          const overdueDays = overdue ? Math.max(1, Math.ceil((referenceNow - new Date(l.dueDate).getTime()) / 86400000)) : 0;
          const active = l.status === "BOOKED" || l.status === "ONLOAN";
          const extensionMinimum = minExtensionDate(l.dueDate, minimumDue);
          return (
            <li key={l.id} className={cn("space-y-3 p-4", overdue && "border-l-2 border-red-400 bg-red-50/40")} aria-busy={busy === l.id || undefined}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{l.itemName}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{l.category}{l.serial ? ` · S/N ${l.serial}` : ""}</p>
                </div>
                <Pill tone={l.status === "RETURNED" ? "green" : overdue ? "red" : "amber"}>
                  {overdue ? "เลยกำหนดคืน" : LOAN_STATUS[l.status] ?? l.status}
                </Pill>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-slate-400">ผู้ยืม</dt><dd className="mt-0.5 text-sm text-slate-700">{l.borrowerName}</dd></div>
                <div><dt className="text-slate-400">กำหนดคืน</dt><dd className="mt-0.5 text-sm text-slate-700">{fmtDate(l.dueDate)}</dd></div>
              </dl>
              {overdue && <p className="text-xs font-medium text-red-600">เลยกำหนด {overdueDays} วัน</p>}
              {l.ticket && <Link href={`/tickets/${l.ticket.id}`} aria-label={`เปิดคำร้อง ${l.ticket.docNo}`} className="inline-flex rounded-sm font-mono text-xs text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">คำร้อง {l.ticket.docNo}</Link>}
              {active && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                  {extendId === l.id ? (
                    <>
                      <input
                        ref={extendDateMobileRef}
                        type="date"
                        aria-label={`กำหนดคืนใหม่สำหรับ ${l.itemName}`}
                        aria-describedby={`loan-extension-min-mobile-${l.id}`}
                        min={extensionMinimum}
                        title={`เลือกวันที่ตั้งแต่ ${fmtDate(extensionMinimum)}`}
                        value={newDue}
                        disabled={busy !== null}
                        onChange={(e) => setNewDue(e.target.value)}
                        className="control min-w-0 flex-1 px-2 text-xs"
                      />
                      <span id={`loan-extension-min-mobile-${l.id}`} className="w-full text-[11px] text-muted">
                        เลือกวันคืนใหม่ตั้งแต่ {fmtDate(extensionMinimum)}
                      </span>
                      <Button type="button" size="sm" disabled={busy !== null || !newDue} loading={busy === l.id} onClick={() => act(l.id, `/api/loans/${l.id}/extend`, { dueDate: newDue })}>ยืนยัน</Button>
                      <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => setExtendId(null)}>ยกเลิก</Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" variant="ghost" size="sm" aria-label={`ต่ออายุ ${l.itemName}`} disabled={busy !== null} onClick={() => { setExtendId(l.id); const currentDue = l.dueDate.slice(0, 10); setNewDue(currentDue < extensionMinimum ? extensionMinimum : currentDue); }}>ต่ออายุ</Button>
                      <Button type="button" variant="secondary" size="sm" aria-label={`บันทึกรับคืน ${l.itemName}`} disabled={busy !== null} loading={busy === l.id} onClick={() => setPendingReturn(l)}>บันทึกรับคืน</Button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div role="region" aria-label="ตารางรายการยืมคืน" tabIndex={0} aria-busy={busy !== null} className="hidden overflow-x-auto card focus-visible:ring-2 focus-visible:ring-brand/30 lg:block">
        <table className="min-w-[900px] w-full text-sm">
          <caption className="sr-only">รายการยืมคืนอุปกรณ์</caption>
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">อุปกรณ์</th>
              <th className="px-3 py-2 text-left font-medium">ผู้ยืม</th>
              <th className="px-3 py-2 text-left font-medium">ยืม–กำหนดคืน</th>
              <th className="px-3 py-2 text-left font-medium">สถานะ</th>
              <th className="px-3 py-2 text-left font-medium">คำร้อง</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((l) => {
              const overdue = l.status !== "RETURNED" && new Date(l.dueDate).getTime() < referenceNow;
              const overdueDays = overdue ? Math.max(1, Math.ceil((referenceNow - new Date(l.dueDate).getTime()) / 86400000)) : 0;
              const active = l.status === "BOOKED" || l.status === "ONLOAN";
              const extensionMinimum = minExtensionDate(l.dueDate, minimumDue);
              return (
                <tr key={l.id} aria-busy={busy === l.id || undefined} className={cn("transition-colors hover:bg-brand-weak/30", overdue && "border-l-2 border-red-400 bg-red-50/40 hover:bg-red-50/60")}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{l.itemName}</div>
                    <div className="text-xs text-slate-400">
                      {l.category}
                      {l.serial ? ` · S/N ${l.serial}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{l.borrowerName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmtDate(l.borrowDate)} – {fmtDate(l.dueDate)}
                    {l.returnedAt && (
                      <div className="text-xs text-emerald-600">คืนแล้ว {fmtDate(l.returnedAt)}</div>
                    )}
                    {overdue && (
                      <div className="text-xs font-medium text-red-600">
                        เลยกำหนด {overdueDays} วัน
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={l.status === "RETURNED" ? "green" : overdue ? "red" : "amber"}>
                      {overdue ? "เลยกำหนดคืน" : LOAN_STATUS[l.status] ?? l.status}
                    </Pill>
                  </td>
                  <td className="px-4 py-3">
                    {l.ticket ? (
                      <Link href={`/tickets/${l.ticket.id}`} aria-label={`เปิดคำร้อง ${l.ticket.docNo}`} className="rounded-sm font-mono text-xs text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                        {l.ticket.docNo}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {active && extendId === l.id ? (
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="date"
                          ref={extendDateDesktopRef}
                          aria-label={`กำหนดคืนใหม่สำหรับ ${l.itemName}`}
                          aria-describedby={`loan-extension-min-desktop-${l.id}`}
                          min={extensionMinimum}
                          title={`เลือกวันที่ตั้งแต่ ${fmtDate(extensionMinimum)}`}
                          value={newDue}
                          disabled={busy !== null}
                          onChange={(e) => setNewDue(e.target.value)}
                          className="control px-1 text-xs"
                        />
                        <span id={`loan-extension-min-desktop-${l.id}`} className="sr-only">
                          เลือกวันคืนใหม่ตั้งแต่ {fmtDate(extensionMinimum)}
                        </span>
                        <Button
                          type="button"
                          disabled={busy !== null || !newDue}
                          loading={busy === l.id}
                          onClick={() => act(l.id, `/api/loans/${l.id}/extend`, { dueDate: newDue })}
                          size="sm"
                        >
                          ยืนยัน
                        </Button>
                        <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => setExtendId(null)}>
                          ยกเลิก
                        </Button>
                      </span>
                    ) : active ? (
                      <span className="inline-flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`ต่ออายุ ${l.itemName}`}
                          disabled={busy !== null}
                          onClick={() => {
                            setExtendId(l.id);
                            const currentDue = l.dueDate.slice(0, 10);
                            setNewDue(currentDue < extensionMinimum ? extensionMinimum : currentDue);
                          }}
                        >
                          ต่ออายุ
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          aria-label={`บันทึกรับคืน ${l.itemName}`}
                          disabled={busy !== null}
                          loading={busy === l.id}
                          onClick={() => setPendingReturn(l)}
                        >
                          บันทึกรับคืน
                        </Button>
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingReturn !== null}
        title="บันทึกรับคืนอุปกรณ์?"
        description={
          pendingReturn
            ? `ยืนยันว่าได้รับ “${pendingReturn.itemName}” คืนจาก ${pendingReturn.borrowerName} แล้ว`
            : ""
        }
        confirmLabel="ยืนยันรับคืน"
        tone="primary"
        busy={pendingReturn !== null && busy === pendingReturn.id}
        onCancel={() => setPendingReturn(null)}
        onConfirm={() => {
          const target = pendingReturn;
          if (target) void act(target.id, `/api/loans/${target.id}/return`);
        }}
      />
    </div>
  );
}

function toDateInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minExtensionDate(dueDate: string, today: string) {
  const currentDue = dueDate.slice(0, 10);
  return currentDue > today ? currentDue : today;
}
