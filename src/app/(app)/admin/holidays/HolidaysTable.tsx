"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/ui";

type Row = { dateKey: string; name: string };

export function HolidaysTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateKey: date, name }),
    });
    setBusy(false);
    if (res.ok) {
      setDate("");
      setName("");
      router.refresh();
    } else {
      setErr((await res.json().catch(() => ({}))).error ?? "เพิ่มไม่สำเร็จ");
    }
  }

  async function del(dateKey: string) {
    if (!confirm(`ลบวันหยุด ${dateKey}?`)) return;
    setBusy(true);
    await fetch(`/api/admin/holidays/${dateKey}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  const now = new Date();
  const upcoming = (k: string) => new Date(k) >= new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="space-y-3">
      {err && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <form onSubmit={add} className="flex flex-wrap items-end gap-3 card p-4 text-sm shadow-sm">
        <label className="flex flex-col">
          <span className="text-xs text-slate-500">วันที่</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-10 rounded-lg border border-border px-3 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>
        <label className="flex flex-1 flex-col">
          <span className="text-xs text-slate-500">ชื่อวันหยุด</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="วันสงกรานต์"
            className="h-10 rounded-lg border border-border px-3 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>
        <button disabled={busy} className="h-10 rounded-lg bg-brand px-4 text-white transition hover:bg-brand-strong disabled:opacity-60">
          + เพิ่ม
        </button>
      </form>

      <div className="overflow-x-auto card">
        <table className="min-w-[600px] w-full text-sm">
          <caption className="sr-only">รายการวันหยุด</caption>
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">วันที่</th>
              <th className="px-3 py-2 text-left font-medium">ชื่อ</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((h) => (
              <tr key={h.dateKey} className={upcoming(h.dateKey) ? "" : "opacity-50"}>
                <td className="px-3 py-2 font-mono text-slate-600">
                  {fmtDate(h.dateKey)} <span className="text-xs text-slate-400">({h.dateKey})</span>
                </td>
                <td className="px-3 py-2 text-slate-700">{h.name}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    disabled={busy}
                    onClick={() => del(h.dateKey)}
                    className="text-xs text-red-600 hover:underline"
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
    </div>
  );
}
