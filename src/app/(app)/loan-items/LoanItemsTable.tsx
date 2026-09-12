"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOAN_CATEGORIES, categoryLabel, LOAN_ITEM_STATUS } from "@/lib/loan-categories";
import { cn, fmtDate } from "@/lib/ui";
import { Pill } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

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
  initialFilters,
}: {
  rows: Row[];
  sites: { code: string; name: string }[];
  initialFilters?: { q: string; status: string; siteCode: string };
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [f, setF] = useState({ name: "", category: "notebook", serial: "", siteCode: sites[0]?.code ?? "02" });
  const [filters, setFilters] = useState(initialFilters ?? { q: "", status: "ALL", siteCode: "ALL" });
  const siteLabel = (code: string) => sites.find((site) => site.code === code)?.name ?? code;
  const { success, error: toastError } = useToast();
  const normalizedQuery = filters.q.trim().toLocaleLowerCase();
  const visibleRows = rows.filter((row) => {
    const matchesQuery = !normalizedQuery || [row.name, row.serial ?? "", categoryLabel(row.category), siteLabel(row.siteCode)].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    const matchesStatus = filters.status === "ALL"
      || (filters.status === "__unavailable" && (row.status === "MAINTENANCE" || row.status === "RETIRED"))
      || row.status === filters.status;
    const matchesSite = filters.siteCode === "ALL" || row.siteCode === filters.siteCode;
    return matchesQuery && matchesStatus && matchesSite;
  });
  const filtersActive = Boolean(normalizedQuery || filters.status !== "ALL" || filters.siteCode !== "ALL");

  async function call(url: string, method: string, body?: unknown, actionKey = "request") {
    if (busyAction !== null) return false;
    setBusyAction(actionKey);
    setErr(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        success(method === "POST" ? "เพิ่มอุปกรณ์แล้ว" : method === "DELETE" ? "ลบอุปกรณ์แล้ว" : "อัปเดตสถานะอุปกรณ์แล้ว");
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
      setBusyAction(null);
      setPendingDelete(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await call("/api/loan-items", "POST", f, "add")) setF({ ...f, name: "", serial: "" });
  }

  return (
    <div className="space-y-3">
      {err && <p role="alert" aria-live="assertive" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <section aria-label="กรองรายการคลังอุปกรณ์" className="card space-y-3 p-4 text-sm shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label htmlFor="loan-item-search" className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-slate-600 sm:min-w-[240px]">
            ค้นหาอุปกรณ์
            <input
              id="loan-item-search"
              value={filters.q}
              onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
              placeholder="ชื่ออุปกรณ์ / Serial / บริษัท"
              className="control w-full px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            สถานะ
            <select aria-label="กรองสถานะอุปกรณ์" value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))} className="control-select">
              <option value="ALL">ทุกสถานะ</option>
              {Object.entries(LOAN_ITEM_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              <option value="__unavailable">ซ่อม / ปลดระวาง</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            บริษัท
            <select aria-label="กรองบริษัทของอุปกรณ์" value={filters.siteCode} onChange={(e) => setFilters((current) => ({ ...current, siteCode: e.target.value }))} className="control-select">
              <option value="ALL">ทุกบริษัท</option>
              {sites.map((site) => <option key={site.code} value={site.code}>{site.name}</option>)}
            </select>
          </label>
          {filtersActive && (
            <Button type="button" variant="secondary" size="md" onClick={() => setFilters({ q: "", status: "ALL", siteCode: "ALL" })}>
              ล้างตัวกรอง
            </Button>
          )}
        </div>
        <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>แสดง <span className="font-semibold tabular-nums text-slate-700">{visibleRows.length}</span> จาก {rows.length} รายการ</span>
          {filtersActive && <span className="text-slate-300" aria-hidden="true">·</span>}
          {normalizedQuery && <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-slate-600">คำค้น: {filters.q.trim()}</span>}
          {filters.status !== "ALL" && <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-slate-600">สถานะ: {filters.status === "__unavailable" ? "ซ่อม / ปลดระวาง" : LOAN_ITEM_STATUS[filters.status] ?? filters.status}</span>}
          {filters.siteCode !== "ALL" && <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-slate-600">บริษัท: {siteLabel(filters.siteCode)}</span>}
        </div>
      </section>

      <form onSubmit={add} aria-busy={busyAction !== null} className="flex flex-col gap-3 card p-4 text-sm shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex w-full flex-col sm:min-w-[240px] sm:flex-1">
          <span className="text-xs text-muted">ชื่ออุปกรณ์</span>
          <input
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            required
            disabled={busyAction !== null}
            placeholder="Notebook Dell Latitude 5440 #3"
            className="control px-3"
          />
        </label>
        <label className="flex w-full flex-col sm:w-auto">
          <span className="text-xs text-muted">หมวด</span>
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} disabled={busyAction !== null} className="control-select">
            {LOAN_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-full flex-col sm:min-w-[160px] sm:flex-1">
          <span className="text-xs text-muted">Serial</span>
          <input value={f.serial} onChange={(e) => setF({ ...f, serial: e.target.value })} disabled={busyAction !== null} className="control px-3" />
        </label>
        <label className="flex w-full flex-col sm:w-auto">
          <span className="text-xs text-muted">บริษัท</span>
          <select value={f.siteCode} onChange={(e) => setF({ ...f, siteCode: e.target.value })} disabled={busyAction !== null} className="control-select">
            {sites.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm" loading={busyAction === "add"} disabled={busyAction !== null} className="w-full sm:w-auto">
          เพิ่มอุปกรณ์
        </Button>
      </form>

      <ul className="divide-y divide-border overflow-hidden card lg:hidden" aria-label="รายการคลังอุปกรณ์">
        {visibleRows.map((r) => (
          <li key={r.id} className={cn("space-y-3 p-4", itemStateClass(r.status))}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{r.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {categoryLabel(r.category)} · {siteLabel(r.siteCode)}
                  {r.serial ? ` · S/N ${r.serial}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => setPendingDelete(r)}
                aria-label={`ลบอุปกรณ์ ${r.name}`}
                aria-busy={busyAction === `delete-${r.id}` || undefined}
                className="flex h-8 shrink-0 items-center rounded-md px-2 text-xs text-red-600 hover:bg-red-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyAction === `delete-${r.id}` ? "กำลังลบ..." : "ลบ"}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-muted">
                สถานะ
                <select
                  aria-label={`สถานะ ${r.name}`}
                  value={r.status}
                  disabled={busyAction !== null}
                  onChange={(e) => call(`/api/loan-items/${r.id}`, "PATCH", { status: e.target.value }, `status-${r.id}`)}
                  className={cn("control-select w-full text-sm text-slate-700", statusSelectClass(r.status))}
                >
                  {Object.entries(LOAN_ITEM_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <div className="text-xs text-muted">
                <span className="block">การยืมปัจจุบัน</span>
                {r.activeLoan ? (
                  <p className="mt-1 text-sm text-slate-700">
                    {r.activeLoan.borrower} · {new Date(r.activeLoan.due) < new Date() ? <Pill tone="red">เลยกำหนด {fmtDate(r.activeLoan.due)}</Pill> : <Pill tone="amber">คืน {fmtDate(r.activeLoan.due)}</Pill>}
                  </p>
                ) : <p className="mt-1 text-sm text-slate-400">ยังไม่มีการยืม</p>}
              </div>
            </div>
          </li>
        ))}
        {visibleRows.length === 0 && <li className="px-3 py-8 text-center text-sm text-slate-400">{rows.length === 0 ? "ยังไม่มีอุปกรณ์ในคลัง" : "ไม่พบอุปกรณ์ที่ตรงกับตัวกรอง"}</li>}
      </ul>

      <div role="region" aria-label="ตารางคลังอุปกรณ์" tabIndex={0} aria-busy={busyAction !== null} className="hidden overflow-x-auto card focus-visible:ring-2 focus-visible:ring-brand/30 lg:block">
        <table className="min-w-[860px] w-full text-sm">
          <caption className="sr-only">รายการอุปกรณ์ในคลัง</caption>
          <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">อุปกรณ์</th>
              <th className="px-3 py-2 text-left font-medium">หมวด</th>
              <th className="px-3 py-2 text-left font-medium">บริษัท</th>
              <th className="px-3 py-2 text-left font-medium">สถานะ</th>
              <th className="px-3 py-2 text-left font-medium">การยืมปัจจุบัน</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleRows.map((r) => (
              <tr
                key={r.id}
                aria-busy={busyAction === `status-${r.id}` || busyAction === `delete-${r.id}` || undefined}
                className={cn("transition-colors hover:bg-brand-weak/30", itemStateClass(r.status))}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{r.name}</div>
                  {r.serial && <div className="text-xs text-slate-400">S/N {r.serial}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">{categoryLabel(r.category)}</td>
                <td className="px-4 py-3 text-slate-600">{siteLabel(r.siteCode)}</td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`สถานะ ${r.name}`}
                    value={r.status}
                    disabled={busyAction !== null}
                    onChange={(e) => call(`/api/loan-items/${r.id}`, "PATCH", { status: e.target.value }, `status-${r.id}`)}
                    className={cn("control-select-compact text-sm text-slate-700", statusSelectClass(r.status))}
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
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => setPendingDelete(r)}
                    aria-busy={busyAction === `delete-${r.id}` || undefined}
                    aria-label={`ลบอุปกรณ์ ${r.name}`}
                    className="inline-flex h-8 items-center rounded-md px-2 text-xs text-red-600 hover:bg-red-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyAction === `delete-${r.id}` ? "กำลังลบ..." : "ลบ"}
                  </button>
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  {rows.length === 0 ? "ยังไม่มีอุปกรณ์ในคลัง" : "ไม่พบอุปกรณ์ที่ตรงกับตัวกรอง"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="ลบอุปกรณ์ออกจากคลัง?"
        description={pendingDelete ? `อุปกรณ์ “${pendingDelete.name}” จะถูกลบออกจากรายการยืมคืน` : ""}
        confirmLabel="ยืนยันลบอุปกรณ์"
        busy={pendingDelete ? busyAction === `delete-${pendingDelete.id}` : false}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          if (target) void call(`/api/loan-items/${target.id}`, "DELETE", undefined, `delete-${target.id}`);
        }}
      />
    </div>
  );
}

function itemStateClass(status: string) {
  if (status === "MAINTENANCE") return "border-l-2 border-amber-300 bg-amber-50/25";
  if (status === "RETIRED") return "border-l-2 border-slate-300 bg-slate-50/70";
  return "";
}

function statusSelectClass(status: string) {
  if (status === "MAINTENANCE") return "border-amber-300 bg-amber-50/70";
  if (status === "RETIRED") return "border-slate-300 bg-slate-50";
  return "";
}
