"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL } from "@/lib/roles";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

type Row = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  site: string;
  department: string;
  role: string;
  roleLocked: boolean;
  active: boolean;
};

export function UsersTable({
  rows,
  currentAdminId,
  emptyMessage = "ไม่พบผู้ใช้",
}: {
  rows: Row[];
  currentAdminId: number;
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<Row | null>(null);
  const { success, error: toastError } = useToast();

  async function patch(id: number, body: Record<string, unknown>) {
    if (busyId !== null) return;
    setBusyId(id);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        success("บันทึกการเปลี่ยนแปลงสิทธิ์แล้ว");
        router.refresh();
      }
      else {
        const b = await res.json().catch(() => ({}));
        const message = b.error ?? "อัปเดตไม่สำเร็จ";
        setErr(message);
        toastError(message);
      }
    } catch {
      const message = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่";
      setErr(message);
      toastError(message);
    } finally {
      setBusyId(null);
      setPendingDeactivate(null);
    }
  }

  function requestActiveChange(user: Row, active: boolean) {
    if (active) {
      void patch(user.id, { active: true });
    } else {
      setPendingDeactivate(user);
    }
  }

  return (
    <div className="space-y-2">
      {err && <p role="alert" aria-live="assertive" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <ul className="divide-y divide-border overflow-hidden card lg:hidden" aria-label="รายการผู้ใช้">
        {rows.map((u) => {
          const self = u.id === currentAdminId;
          const busy = busyId === u.id;
          return (
            <li key={u.id} aria-busy={busy || undefined} className={(u.active ? "" : "bg-slate-50/70 ") + (busy ? "opacity-70 " : "") + "space-y-3 p-4"}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {u.displayName}
                    {self && <span className="ml-2 text-xs font-medium text-brand">(บัญชีของคุณ)</span>}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-slate-400">{u.username}{u.email ? ` · ${u.email}` : ""}</p>
                  <p className="mt-1 text-xs text-muted">{u.site} · {u.department}</p>
                </div>
                {busy && <span role="status" className="shrink-0 text-[11px] font-medium text-brand">กำลังบันทึก...</span>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-muted">
                  บทบาท
                  <select
                    disabled={busyId !== null || self}
                    title={self ? "ไม่สามารถเปลี่ยนบทบาทของตนเอง" : undefined}
                    aria-label={`บทบาทของ ${u.displayName}`}
                    value={u.role}
                    onChange={(e) => patch(u.id, { role: e.target.value })}
                    className="control-select w-full text-sm disabled:opacity-60"
                  >
                    {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <div className="flex items-end gap-4 pb-2 text-xs text-slate-600">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1" disabled={busyId !== null} aria-label={`ล็อกบทบาทของ ${u.displayName}`} checked={u.roleLocked} onChange={(e) => patch(u.id, { roleLocked: e.target.checked })} />
                    ล็อกบทบาท
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1" disabled={busyId !== null || self} title={self ? "ไม่สามารถปิดการใช้งานบัญชีของตนเอง" : undefined} aria-label={`เปิดใช้งาน ${u.displayName}`} checked={u.active} onChange={(e) => requestActiveChange(u, e.target.checked)} />
                    {u.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                  </label>
                </div>
              </div>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-slate-400">
            {emptyMessage}
          </li>
        )}
      </ul>

      <div role="region" aria-label="ตารางผู้ใช้" tabIndex={0} aria-busy={busyId !== null} className="hidden overflow-x-auto card focus-visible:ring-2 focus-visible:ring-brand/30 lg:block">
        <table className="min-w-[760px] w-full text-sm">
          <caption className="sr-only">รายชื่อผู้ใช้และสิทธิ์</caption>
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ชื่อ</th>
              <th className="px-3 py-2 text-left font-medium">บริษัท / แผนก</th>
              <th className="px-3 py-2 text-left font-medium">บทบาท</th>
              <th className="px-3 py-2 text-center font-medium">ล็อกบทบาท</th>
              <th className="px-3 py-2 text-center font-medium">ใช้งาน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((u) => {
              const self = u.id === currentAdminId;
              const busy = busyId === u.id;
              return (
                <tr
                  key={u.id}
                  aria-busy={busy || undefined}
                  className={(u.active ? "" : "bg-slate-50/70 ") + (busy ? "opacity-70 " : "") + "transition-colors hover:bg-brand-weak/30"}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {u.displayName}
                      {self && <span className="ml-2 text-xs font-medium text-brand">(บัญชีของคุณ)</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      {u.username}
                      {u.email ? ` · ${u.email}` : ""}
                    </div>
                    {busy && <span role="status" className="mt-1 block text-[11px] font-medium text-brand">กำลังบันทึก...</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.site} · {u.department}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      disabled={busyId !== null || self}
                      title={self ? "ไม่สามารถเปลี่ยนบทบาทของตนเอง" : undefined}
                      aria-label={`บทบาทของ ${u.displayName}`}
                      value={u.role}
                      onChange={(e) => patch(u.id, { role: e.target.value })}
                      className="control-select-compact text-sm disabled:opacity-60"
                    >
                      {Object.entries(ROLE_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                      disabled={busyId !== null}
                      aria-label={`ล็อกบทบาทของ ${u.displayName}`}
                      checked={u.roleLocked}
                      onChange={(e) => patch(u.id, { roleLocked: e.target.checked })}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="inline-flex flex-col items-center gap-1 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                        disabled={busyId !== null || self}
                        title={self ? "ไม่สามารถปิดการใช้งานบัญชีของตนเอง" : undefined}
                        aria-label={`เปิดใช้งาน ${u.displayName}`}
                        checked={u.active}
                        onChange={(e) => requestActiveChange(u, e.target.checked)}
                      />
                      <span className={u.active ? "text-emerald-700" : "text-slate-400"}>{u.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</span>
                    </label>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="ปิดการใช้งานบัญชีนี้?"
        description={pendingDeactivate ? `“${pendingDeactivate.displayName}” จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง` : ""}
        confirmLabel="ปิดการใช้งานบัญชี"
        tone="danger"
        busy={pendingDeactivate !== null && busyId === pendingDeactivate.id}
        onCancel={() => setPendingDeactivate(null)}
        onConfirm={() => {
          const target = pendingDeactivate;
          if (target) void patch(target.id, { active: false });
        }}
      />
      <p className="text-xs text-slate-400">
        เปลี่ยนบทบาทจะ <b>ล็อก</b> ให้อัตโนมัติ — เอาติ๊กออกถ้าต้องการให้กลับไป sync จากแผนก
      </p>
    </div>
  );
}
