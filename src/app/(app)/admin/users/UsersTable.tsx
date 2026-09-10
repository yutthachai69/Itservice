"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL } from "@/lib/roles";

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
}: {
  rows: Row[];
  currentAdminId: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function patch(id: number, body: Record<string, unknown>) {
    setBusyId(id);
    setErr(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (res.ok) router.refresh();
    else {
      const b = await res.json().catch(() => ({}));
      setErr(b.error ?? "อัปเดตไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-2">
      {err && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <div className="overflow-x-auto card">
        <table className="min-w-[760px] w-full text-sm">
          <caption className="sr-only">รายชื่อผู้ใช้และสิทธิ์</caption>
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500">
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
                <tr key={u.id} className={(u.active ? "" : "opacity-50 ") + "transition-colors hover:bg-brand-weak/30"}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{u.displayName}</div>
                    <div className="text-xs text-slate-400">
                      {u.username}
                      {u.email ? ` · ${u.email}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.site} · {u.department}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      disabled={busy || self}
                      value={u.role}
                      onChange={(e) => patch(u.id, { role: e.target.value })}
                      className="rounded-lg border border-border px-2 py-1 text-sm disabled:opacity-60"
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
                      disabled={busy}
                      checked={u.roleLocked}
                      onChange={(e) => patch(u.id, { roleLocked: e.target.checked })}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      disabled={busy || self}
                      checked={u.active}
                      onChange={(e) => patch(u.id, { active: e.target.checked })}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  ไม่พบผู้ใช้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        เปลี่ยนบทบาทจะ <b>ล็อก</b> ให้อัตโนมัติ — เอาติ๊กออกถ้าต้องการให้กลับไป sync จากแผนก
      </p>
    </div>
  );
}
