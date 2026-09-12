"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { fmtDate } from "@/lib/ui";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Toast";

type Row = { dateKey: string; name: string };

export function HolidaysTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [busyAction, setBusyAction] = useState<"add" | "delete" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (busyAction !== null) return;
    setBusyAction("add");
    setErr(null);
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: date, name }),
      });
      if (res.ok) {
        success("เพิ่มวันหยุดแล้ว");
        setDate("");
        setName("");
        router.refresh();
      } else {
        const message = (await res.json().catch(() => ({}))).error ?? "เพิ่มไม่สำเร็จ";
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

  async function del(dateKey: string) {
    if (busyAction !== null) return;
    setBusyAction("delete");
    setErr(null);
    try {
      const res = await fetch(`/api/admin/holidays/${dateKey}`, { method: "DELETE" });
      if (res.ok) {
        success("ลบวันหยุดแล้ว");
        router.refresh();
      }
      else {
        const message = (await res.json().catch(() => ({}))).error ?? "ลบไม่สำเร็จ";
        setErr(message);
        toastError(message);
      }
    } catch {
      const message = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่";
      setErr(message);
      toastError(message);
    } finally {
      setBusyAction(null);
      setPendingDelete(null);
    }
  }

  const now = new Date();
  const upcoming = (k: string) => new Date(k) >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcomingCount = rows.filter((holiday) => upcoming(holiday.dateKey)).length;

  return (
    <div className="space-y-3">
      {err && <p role="alert" aria-live="assertive" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <form onSubmit={add} aria-busy={busyAction === "add" || undefined} className="flex flex-col gap-3 card p-4 text-sm shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex w-full flex-col sm:w-auto">
          <span className="text-xs text-muted">วันที่</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={busyAction !== null}
            className="control w-full px-3 sm:w-auto"
          />
        </label>
        <label className="flex w-full flex-col sm:min-w-[220px] sm:flex-1">
          <span className="text-xs text-muted">ชื่อวันหยุด</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={busyAction !== null}
            placeholder="วันสงกรานต์"
            className="control px-3"
          />
        </label>
        <Button type="submit" size="sm" loading={busyAction === "add"} disabled={busyAction !== null} className="w-full sm:w-auto">เพิ่มวันหยุด</Button>
      </form>

      <p role="status" aria-live="polite" className="text-xs text-muted">
        มีวันหยุดทั้งหมด <span className="font-semibold tabular-nums text-slate-700">{rows.length}</span> รายการ · กำลังจะถึง <span className="font-semibold tabular-nums text-brand">{upcomingCount}</span> รายการ
      </p>

      <ul className="divide-y divide-border overflow-hidden card lg:hidden" aria-label="รายการวันหยุด">
        {rows.map((h) => (
          <li key={h.dateKey} className={upcoming(h.dateKey) ? "flex items-center justify-between gap-3 p-4" : "flex items-center justify-between gap-3 bg-slate-50/70 p-4"}>
            <div className="min-w-0">
              <p className="font-mono text-sm text-slate-700">
                <time dateTime={h.dateKey}>{fmtDate(h.dateKey)}</time>
                <span className={upcoming(h.dateKey) ? "ml-2 font-sans text-[11px] text-brand" : "ml-2 font-sans text-[11px] text-slate-400"}>
                  {upcoming(h.dateKey) ? "กำลังจะถึง" : "ผ่านมาแล้ว"}
                </span>
              </p>
              <p className="mt-0.5 break-words text-xs text-slate-400">{h.name}</p>
            </div>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => setPendingDelete(h.dateKey)}
              aria-label={`ลบวันหยุด ${h.name} วันที่ ${h.dateKey}`}
              className="inline-flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ลบ
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="px-3 py-8 text-center text-sm text-slate-400">ยังไม่มีวันหยุด</li>}
      </ul>

      <div role="region" aria-label="ตารางวันหยุด" tabIndex={0} aria-busy={busyAction !== null} className="hidden overflow-x-auto card focus-visible:ring-2 focus-visible:ring-brand/30 lg:block">
        <table className="min-w-[600px] w-full text-sm">
          <caption className="sr-only">รายการวันหยุด</caption>
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">วันที่</th>
              <th className="px-3 py-2 text-left font-medium">ชื่อ</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((h) => (
              <tr key={h.dateKey} className={upcoming(h.dateKey) ? "" : "bg-slate-50/70"}>
                <td className="px-3 py-2 font-mono text-slate-600">
                  <time dateTime={h.dateKey}>{fmtDate(h.dateKey)}</time>
                  <span className={upcoming(h.dateKey) ? "ml-2 font-sans text-[11px] text-brand" : "ml-2 font-sans text-[11px] text-slate-400"}>
                    {upcoming(h.dateKey) ? "กำลังจะถึง" : "ผ่านมาแล้ว"}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700">{h.name}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => setPendingDelete(h.dateKey)}
                    aria-label={`ลบวันหยุด ${h.name} วันที่ ${h.dateKey}`}
                    className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-slate-400">
                  ยังไม่มีวันหยุด
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="ลบวันหยุดนี้?"
        description={pendingDelete ? `วันหยุด ${pendingDelete} จะถูกลบออกจากปฏิทิน SLA` : ""}
        confirmLabel="ยืนยันลบวันหยุด"
        busy={busyAction === "delete"}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          if (target) void del(target);
        }}
      />
    </div>
  );
}
