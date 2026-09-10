"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDateTime } from "@/lib/ui";
import { useToast } from "@/components/Toast";

type Item = {
  id: number;
  filename: string;
  size: number;
  uploadedAt: string | Date;
};

function humanSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function Attachments({
  ticketId,
  initial,
  canModify,
}: {
  ticketId: number;
  initial: Item[];
  canModify: boolean;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<Item[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/tickets/${ticketId}/attachments`, { method: "POST", body: fd });
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (res.ok) {
      const rec = await res.json();
      setItems((p) => [...p, rec]);
      success(`แนบไฟล์ “${rec.filename}” แล้ว`);
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      const msg = b.error ?? "อัปโหลดไม่สำเร็จ";
      setErr(msg);
      toastError(msg);
    }
  }

  async function remove(id: number) {
    if (!confirm("ลบไฟล์นี้?")) return;
    setBusy(true);
    const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setItems((p) => p.filter((x) => x.id !== id));
      success("ลบไฟล์แล้ว");
      router.refresh();
    } else {
      setErr("ลบไม่สำเร็จ");
      toastError("ลบไฟล์ไม่สำเร็จ");
    }
  }

  return (
    <div className="card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-900">ไฟล์แนบ ({items.length})</h2>
        {canModify && (
          <label className="no-print cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm text-slate-600 transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand">
            {busy ? "กำลังอัปโหลด..." : "+ แนบไฟล์"}
            <input
              ref={fileRef}
              type="file"
              hidden
              disabled={busy}
              onChange={upload}
            />
          </label>
        )}
      </div>

      {err && <p className="mt-2 border-l-2 border-red-400 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">ไม่มีไฟล์แนบ</p>
      ) : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {items.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-2">
              <a
                href={`/api/attachments/${a.id}`}
                className="flex-1 truncate text-brand hover:underline"
              >
                {a.filename}
              </a>
              <span className="text-xs text-slate-400">{humanSize(a.size)}</span>
              <span className="hidden text-xs text-slate-400 sm:inline">
                {fmtDateTime(a.uploadedAt)}
              </span>
              {canModify && (
                <button
                  onClick={() => remove(a.id)}
                  disabled={busy}
                  className="no-print rounded px-1.5 py-1 text-xs text-red-600 hover:bg-red-50 hover:underline"
                >
                  ลบ
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
