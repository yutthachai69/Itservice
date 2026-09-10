"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/ui";
import { LOAN_STATUS } from "@/lib/loan-categories";
import { EmptyState } from "@/components/EmptyState";
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

export function LoansTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [extendId, setExtendId] = useState<number | null>(null);
  const [newDue, setNewDue] = useState("");
  const [referenceNow] = useState(() => Date.now());

  async function act(id: number, url: string, body?: unknown) {
    setBusy(id);
    setErr(null);
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(null);
    if (res.ok) {
      setExtendId(null);
      router.refresh();
    } else {
      setErr((await res.json().catch(() => ({}))).error ?? "ทำรายการไม่สำเร็จ");
    }
  }

  if (rows.length === 0) {
    return <EmptyState icon={PackageOpen} title="ไม่มีรายการยืม" hint="ยังไม่มีการยืมที่ตรงกับเงื่อนไข" />;
  }

  return (
    <div className="space-y-2">
      {err && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <div className="overflow-x-auto card">
        <table className="min-w-[900px] w-full text-sm">
          <caption className="sr-only">รายการยืมคืนอุปกรณ์</caption>
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500">
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
              const active = l.status === "BOOKED" || l.status === "ONLOAN";
              return (
                <tr key={l.id} className="transition-colors hover:bg-brand-weak/30">
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
                        เลยกำหนด {Math.floor((referenceNow - new Date(l.dueDate).getTime()) / 86400000)} วัน
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs ring-1 ring-inset " +
                        (l.status === "RETURNED"
                          ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                          : overdue
                            ? "bg-red-100 text-red-700 ring-red-200"
                            : "bg-amber-100 text-amber-800 ring-amber-200")
                      }
                    >
                      {LOAN_STATUS[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {l.ticket ? (
                      <Link href={`/tickets/${l.ticket.id}`} className="font-mono text-xs text-brand hover:underline">
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
                          value={newDue}
                          onChange={(e) => setNewDue(e.target.value)}
                          className="rounded-lg border border-border px-1 py-0.5 text-xs"
                        />
                        <button
                          disabled={busy === l.id || !newDue}
                          onClick={() => act(l.id, `/api/loans/${l.id}/extend`, { dueDate: newDue })}
                          className="rounded-lg bg-brand px-2 py-1 text-xs text-white"
                        >
                          ยืนยัน
                        </button>
                        <button onClick={() => setExtendId(null)} className="text-xs text-slate-400">
                          ยกเลิก
                        </button>
                      </span>
                    ) : active ? (
                      <span className="inline-flex gap-2">
                        <button
                          onClick={() => {
                            setExtendId(l.id);
                            setNewDue(l.dueDate.slice(0, 10));
                          }}
                          className="text-xs text-slate-600 hover:underline"
                        >
                          ต่ออายุ
                        </button>
                        <button
                          disabled={busy === l.id}
                          onClick={() => act(l.id, `/api/loans/${l.id}/return`)}
                          className="rounded-lg border border-border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          บันทึกรับคืน
                        </button>
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
