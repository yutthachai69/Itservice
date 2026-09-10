"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOAN_CATEGORIES, categoryLabel, LOAN_ITEM_STATUS } from "@/lib/loan-categories";
import { fmtDate } from "@/lib/ui";
import { Pill } from "@/components/Badge";

type Row = {
  id: number;
  name: string;
  category: string;
  serial: string | null;
  siteCode: string;
  status: string;
  activeLoan: { borrower: string; due: string; status: string } | null;
};

export function LoanItemsTable({
  rows,
  sites,
}: {
  rows: Row[];
  sites: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", category: "notebook", serial: "", siteCode: sites[0]?.code ?? "02" });

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setErr(null);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
      return true;
    }
    const b = await res.json().catch(() => ({}));
    setErr(b.error ?? "ทำรายการไม่สำเร็จ");
    return false;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await call("/api/loan-items", "POST", f)) setF({ ...f, name: "", serial: "" });
  }

  return (
    <div className="space-y-3">
      {err && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <form onSubmit={add} className="flex flex-wrap items-end gap-3 card p-4 text-sm shadow-sm">
        <label className="flex flex-col">
          <span className="text-xs text-slate-500">ชื่ออุปกรณ์</span>
            <input
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            required
            placeholder="Notebook Dell Latitude 5440 #3"
              className="h-10 rounded-lg border border-border px-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-slate-500">หมวด</span>
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="h-10 rounded-lg border border-border px-2 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15">
            {LOAN_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-slate-500">Serial</span>
          <input value={f.serial} onChange={(e) => setF({ ...f, serial: e.target.value })} className="h-10 rounded-lg border border-border px-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-slate-500">บริษัท</span>
          <select value={f.siteCode} onChange={(e) => setF({ ...f, siteCode: e.target.value })} className="h-10 rounded-lg border border-border px-2 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15">
            {sites.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy} className="h-10 rounded-lg bg-brand px-4 text-white transition hover:bg-brand-strong disabled:opacity-60">
          + เพิ่ม
        </button>
      </form>

      <div className="overflow-x-auto card">
        <table className="min-w-[760px] w-full text-sm">
          <caption className="sr-only">รายการอุปกรณ์ในคลัง</caption>
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">อุปกรณ์</th>
              <th className="px-3 py-2 text-left font-medium">หมวด</th>
              <th className="px-3 py-2 text-left font-medium">สถานะ</th>
              <th className="px-3 py-2 text-left font-medium">การยืมปัจจุบัน</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-brand-weak/30">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{r.name}</div>
                  {r.serial && <div className="text-xs text-slate-400">S/N {r.serial}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">{categoryLabel(r.category)}</td>
                <td className="px-4 py-3">
                  <select
                    value={r.status}
                    disabled={busy}
                    onChange={(e) => call(`/api/loan-items/${r.id}`, "PATCH", { status: e.target.value })}
                    className="rounded-lg border border-border px-2 py-1 text-sm"
                  >
                    {Object.entries(LOAN_ITEM_STATUS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.activeLoan ? (
                    <span>
                      {r.activeLoan.borrower}{" "}
                      {new Date(r.activeLoan.due) < new Date() ? (
                        <Pill tone="red">เลยกำหนดคืน {fmtDate(r.activeLoan.due)}</Pill>
                      ) : (
                        <Pill tone="amber">คืน {fmtDate(r.activeLoan.due)}</Pill>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`ลบ ${r.name}?`)) call(`/api/loan-items/${r.id}`, "DELETE");
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  ยังไม่มีอุปกรณ์ในคลัง
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
