"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = { id: number; name: string; email: string | null; type: string; active: boolean };

export function ApproversTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nn, setNn] = useState("");
  const [ne, setNe] = useState("");
  const [nt, setNt] = useState("IT");

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
    if (await call("/api/admin/approvers", "POST", { name: nn, email: ne, type: nt })) {
      setNn("");
      setNe("");
    }
  }

  return (
    <div className="space-y-3">
      {err && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <form onSubmit={add} className="flex flex-wrap items-end gap-3 card p-4 text-sm shadow-sm">
        <label className="flex flex-col">
          <span className="text-xs text-slate-500">ชื่อ-นามสกุล</span>
          <input value={nn} onChange={(e) => setNn(e.target.value)} required className="h-10 rounded-lg border border-border px-3 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-slate-500">อีเมล</span>
          <input value={ne} onChange={(e) => setNe(e.target.value)} type="email" className="h-10 rounded-lg border border-border px-3 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-slate-500">ประเภท</span>
          <select value={nt} onChange={(e) => setNt(e.target.value)} className="h-10 rounded-lg border border-border px-2 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15">
            <option value="IT">IT</option>
            <option value="ACCOUNTING">บัญชี</option>
          </select>
        </label>
        <button disabled={busy} className="h-10 rounded-lg bg-brand px-4 text-white transition hover:bg-brand-strong disabled:opacity-60">
          + เพิ่ม
        </button>
      </form>

      <div className="overflow-x-auto card">
        <table className="min-w-[700px] w-full text-sm">
          <caption className="sr-only">รายชื่อผู้อนุมัติ</caption>
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ชื่อ</th>
              <th className="px-3 py-2 text-left font-medium">อีเมล</th>
              <th className="px-3 py-2 text-left font-medium">ประเภท</th>
              <th className="px-3 py-2 text-center font-medium">ใช้งาน</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a) => (
              <ApproverRow key={a.id} a={a} busy={busy} onCall={call} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  ยังไม่มีรายชื่อ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApproverRow({
  a,
  busy,
  onCall,
}: {
  a: Row;
  busy: boolean;
  onCall: (url: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [name, setName] = useState(a.name);
  const [email, setEmail] = useState(a.email ?? "");
  const dirty = name !== a.name || email !== (a.email ?? "");

  return (
    <tr className={a.active ? "" : "opacity-50"}>
      <td className="px-3 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-transparent px-1 py-0.5 hover:border-border focus:border-border"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="—"
          className="w-full rounded border border-transparent px-1 py-0.5 hover:border-border focus:border-border"
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={a.type}
          disabled={busy}
          onChange={(e) => onCall(`/api/admin/approvers/${a.id}`, "PATCH", { type: e.target.value })}
          className="rounded-lg border border-border px-2 py-1"
        >
          <option value="IT">IT</option>
          <option value="ACCOUNTING">บัญชี</option>
        </select>
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          disabled={busy}
          checked={a.active}
          onChange={(e) => onCall(`/api/admin/approvers/${a.id}`, "PATCH", { active: e.target.checked })}
        />
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        {dirty && (
          <button
            disabled={busy}
            onClick={() => onCall(`/api/admin/approvers/${a.id}`, "PATCH", { name, email })}
            className="mr-2 rounded bg-brand px-2 py-1 text-xs text-white"
          >
            บันทึก
          </button>
        )}
        <button
          disabled={busy}
          onClick={() => {
            if (confirm(`ลบ ${a.name}?`)) onCall(`/api/admin/approvers/${a.id}`, "DELETE");
          }}
          className="text-xs text-red-600 hover:underline"
        >
          ลบ
        </button>
      </td>
    </tr>
  );
}
