"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Toast";

type Row = { id: number; name: string; email: string | null; type: string; active: boolean };

export function ApproversTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [nn, setNn] = useState("");
  const [ne, setNe] = useState("");
  const [nt, setNt] = useState("IT");
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const { success, error: toastError } = useToast();

  async function call(url: string, method: string, body?: unknown, actionKey = "global") {
    if (busyKey !== null) return false;
    setBusyKey(actionKey);
    setErr(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        success(method === "DELETE" ? "ลบผู้อนุมัติแล้ว" : "บันทึกข้อมูลผู้อนุมัติแล้ว");
        router.refresh();
        return true;
      }
      const b = await res.json().catch(() => ({}));
      const message = b.error ?? "ทำรายการไม่สำเร็จ";
      setErr(message);
      toastError(message);
      return false;
    } catch {
      const message = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่";
      setErr(message);
      toastError(message);
      return false;
    } finally {
      setBusyKey(null);
      setPendingDelete(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await call("/api/admin/approvers", "POST", { name: nn, email: ne, type: nt }, "add")) {
      setNn("");
      setNe("");
    }
  }

  return (
    <div className="space-y-3">
      {err && <p role="alert" aria-live="assertive" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <form onSubmit={add} aria-busy={busyKey === "add"} className="flex flex-col gap-3 card p-4 text-sm shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex w-full flex-col sm:min-w-[220px] sm:flex-1">
          <span className="text-xs text-muted">ชื่อ-นามสกุล</span>
          <input value={nn} onChange={(e) => setNn(e.target.value)} required disabled={busyKey !== null} className="control px-3" />
        </label>
        <label className="flex w-full flex-col sm:min-w-[220px] sm:flex-1">
          <span className="text-xs text-muted">อีเมล</span>
          <input value={ne} onChange={(e) => setNe(e.target.value)} type="email" disabled={busyKey !== null} className="control px-3" />
        </label>
        <label className="flex w-full flex-col sm:w-auto">
          <span className="text-xs text-muted">ประเภท</span>
          <select value={nt} onChange={(e) => setNt(e.target.value)} disabled={busyKey !== null} aria-label="ประเภทผู้อนุมัติใหม่" className="control-select">
            <option value="IT">IT</option>
            <option value="ACCOUNTING">บัญชี</option>
          </select>
        </label>
        <Button type="submit" size="sm" loading={busyKey === "add"} disabled={busyKey !== null} className="w-full sm:w-auto">เพิ่มผู้อนุมัติ</Button>
      </form>

      <ul className="divide-y divide-border overflow-hidden card lg:hidden" aria-label="รายการผู้อนุมัติ">
        {rows.map((a) => (
          <ApproverCard
            key={a.id}
            a={a}
            busy={busyKey === `row-${a.id}`}
            disabled={busyKey !== null}
            onCall={(url, method, body) => call(url, method, body, `row-${a.id}`)}
            onRequestDelete={() => setPendingDelete(a)}
          />
        ))}
        {rows.length === 0 && <li className="px-3 py-8 text-center text-sm text-slate-400">ยังไม่มีรายชื่อ</li>}
      </ul>

      <div role="region" aria-label="ตารางผู้อนุมัติ" tabIndex={0} aria-busy={busyKey !== null} className="hidden overflow-x-auto card focus-visible:ring-2 focus-visible:ring-brand/30 lg:block">
        <table className="min-w-[700px] w-full text-sm">
          <caption className="sr-only">รายชื่อผู้อนุมัติ</caption>
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-muted">
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
              <ApproverRow
                key={a.id}
                a={a}
                busy={busyKey === `row-${a.id}`}
                disabled={busyKey !== null}
                onCall={(url, method, body) => call(url, method, body, `row-${a.id}`)}
                onRequestDelete={() => setPendingDelete(a)}
              />
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="ลบผู้อนุมัตินี้?"
        description={pendingDelete ? `“${pendingDelete.name}” จะถูกลบออกจากรายชื่อผู้อนุมัติ` : ""}
        confirmLabel="ยืนยันลบผู้อนุมัติ"
        busy={pendingDelete ? busyKey === `row-${pendingDelete.id}` : false}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          if (target) void call(`/api/admin/approvers/${target.id}`, "DELETE", undefined, `row-${target.id}`);
        }}
      />
    </div>
  );
}

function ApproverRow({
  a,
  busy,
  disabled,
  onCall,
  onRequestDelete,
}: {
  a: Row;
  busy: boolean;
  disabled: boolean;
  onCall: (url: string, method: string, body?: unknown) => Promise<boolean>;
  onRequestDelete: () => void;
}) {
  const [name, setName] = useState(a.name);
  const [email, setEmail] = useState(a.email ?? "");
  const dirty = name !== a.name || email !== (a.email ?? "");

  return (
    <>
      <tr aria-busy={busy || undefined} className={a.active ? "" : "bg-slate-50/70"}>
      <td className="px-3 py-2">
        <input
          aria-label={`ชื่อผู้อนุมัติ ${a.id}`}
          value={name}
          disabled={disabled}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-transparent px-1 py-0.5 hover:border-border focus:border-border focus:outline-none focus:ring-2 focus:ring-brand/15 focus-visible:ring-2 focus-visible:ring-brand/35"
        />
      </td>
      <td className="px-3 py-2">
        <input
          aria-label={`อีเมลผู้อนุมัติ ${a.id}`}
          type="email"
          value={email}
          disabled={disabled}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="—"
          className="w-full rounded border border-transparent px-1 py-0.5 hover:border-border focus:border-border focus:outline-none focus:ring-2 focus:ring-brand/15 focus-visible:ring-2 focus-visible:ring-brand/35"
        />
      </td>
      <td className="px-3 py-2">
        <select
          aria-label={`ประเภทผู้อนุมัติ ${a.id}`}
          value={a.type}
          disabled={disabled}
          onChange={(e) => onCall(`/api/admin/approvers/${a.id}`, "PATCH", { type: e.target.value })}
          className="control-select-compact px-2"
        >
          <option value="IT">IT</option>
          <option value="ACCOUNTING">บัญชี</option>
        </select>
      </td>
      <td className="px-3 py-2 text-center">
        <label className="inline-flex flex-col items-center gap-1 text-xs text-slate-600">
          <input
            aria-label={`เปิดใช้งานผู้อนุมัติ ${a.id}`}
            type="checkbox"
            disabled={disabled}
            checked={a.active}
            onChange={(e) => onCall(`/api/admin/approvers/${a.id}`, "PATCH", { active: e.target.checked })}
            className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
          />
          <span className={a.active ? "text-emerald-700" : "text-slate-400"}>{a.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</span>
        </label>
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        {dirty && (
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            loading={busy}
            aria-label={`บันทึกผู้อนุมัติ ${name}`}
            onClick={() => onCall(`/api/admin/approvers/${a.id}`, "PATCH", { name, email })}
            className="mr-2"
          >
            บันทึก
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={disabled}
          aria-label={`ลบผู้อนุมัติ ${a.name}`}
          onClick={onRequestDelete}
          className="px-2"
        >
          ลบ
        </Button>
      </td>
      </tr>
    </>
  );
}

function ApproverCard({
  a,
  busy,
  disabled,
  onCall,
  onRequestDelete,
}: {
  a: Row;
  busy: boolean;
  disabled: boolean;
  onCall: (url: string, method: string, body?: unknown) => Promise<boolean>;
  onRequestDelete: () => void;
}) {
  const [name, setName] = useState(a.name);
  const [email, setEmail] = useState(a.email ?? "");
  const dirty = name !== a.name || email !== (a.email ?? "");

  return (
    <li aria-busy={busy || undefined} className={a.active ? "space-y-3 p-4" : "space-y-3 bg-slate-50/70 p-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <label className="block text-xs text-muted">
            ชื่อ-นามสกุล
            <input aria-label={`ชื่อผู้อนุมัติ ${a.id}`} value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} className="control mt-1 w-full px-3 text-sm" />
          </label>
          <label className="block text-xs text-muted">
            อีเมล
            <input aria-label={`อีเมลผู้อนุมัติ ${a.id}`} type="email" value={email} disabled={disabled} onChange={(e) => setEmail(e.target.value)} placeholder="—" className="control mt-1 w-full px-3 text-sm" />
          </label>
        </div>
        {busy && <span role="status" className="shrink-0 text-[11px] font-medium text-brand">กำลังบันทึก...</span>}
      </div>
      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-muted">
          ประเภท
          <select aria-label={`ประเภทผู้อนุมัติ ${a.id}`} value={a.type} disabled={disabled} onChange={(e) => onCall(`/api/admin/approvers/${a.id}`, "PATCH", { type: e.target.value })} className="control-select w-full text-sm">
            <option value="IT">IT</option>
            <option value="ACCOUNTING">บัญชี</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 pb-2 text-xs text-slate-600">
          <input aria-label={`เปิดใช้งานผู้อนุมัติ ${a.id}`} type="checkbox" disabled={disabled} checked={a.active} onChange={(e) => onCall(`/api/admin/approvers/${a.id}`, "PATCH", { active: e.target.checked })} className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1" />
          {a.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
        </label>
      </div>
      <div className="flex justify-end gap-2">
        {dirty && <Button type="button" size="sm" disabled={disabled} loading={busy} aria-label={`บันทึกผู้อนุมัติ ${name}`} onClick={() => onCall(`/api/admin/approvers/${a.id}`, "PATCH", { name, email })}>บันทึก</Button>}
        <Button type="button" size="sm" variant="danger" disabled={disabled} aria-label={`ลบผู้อนุมัติ ${a.name}`} onClick={onRequestDelete}>ลบ</Button>
      </div>
    </li>
  );
}
