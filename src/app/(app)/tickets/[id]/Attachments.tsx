"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Trash2 } from "lucide-react";
import { buttonClass } from "@/lib/button-class";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DetailSection } from "@/components/DetailSection";
import { useToast } from "@/components/Toast";
import { fmtDateTime } from "@/lib/ui";

type Item = {
  id: number;
  filename: string;
  size: number;
  uploadedAt: string | Date;
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
  const [busyAction, setBusyAction] = useState<"upload" | "delete" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || busyAction !== null) return;
    setBusyAction("upload");
    setErr(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        body,
      });
      if (response.ok) {
        const record = await response.json();
        setItems((current) => [...current, record]);
        success(`แนบไฟล์ “${record.filename}” แล้ว`);
        router.refresh();
      } else {
        const result = await response.json().catch(() => ({}));
        const message = result.error ?? "อัปโหลดไม่สำเร็จ";
        setErr(message);
        toastError(message);
      }
    } catch {
      const message = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่";
      setErr(message);
      toastError(message);
    } finally {
      setBusyAction(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: number) {
    if (busyAction !== null) return;
    setBusyAction("delete");
    setErr(null);
    try {
      const response = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      if (response.ok) {
        setItems((current) => current.filter((item) => item.id !== id));
        success("ลบไฟล์แล้ว");
        router.refresh();
      } else {
        setErr("ลบไฟล์ไม่สำเร็จ");
        toastError("ลบไฟล์ไม่สำเร็จ");
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

  const attachAction = canModify ? (
    <div className="no-print">
      <button
        type="button"
        className={buttonClass({
          variant: "secondary",
          size: "sm",
          className: busyAction !== null ? "cursor-wait" : undefined,
        })}
        disabled={busyAction !== null}
        aria-busy={busyAction === "upload" || undefined}
        onClick={() => fileRef.current?.click()}
      >
        <Paperclip size={14} aria-hidden="true" />
        {busyAction === "upload" ? "กำลังอัปโหลด..." : "แนบไฟล์"}
      </button>
      <input
        ref={fileRef}
        type="file"
        hidden
        disabled={busyAction !== null}
        aria-describedby="attachment-help"
        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.log"
        onChange={upload}
      />
    </div>
  ) : undefined;

  return (
    <>
      <DetailSection
      title={`ไฟล์แนบ (${items.length})`}
      description="เอกสารหรือภาพที่เกี่ยวข้องกับคำร้อง"
      action={attachAction}
    >
      {err && (
        <p role="alert" className="mb-3 border-l-2 border-red-400 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </p>
      )}

      <p id="attachment-help" className="mb-3 text-xs leading-relaxed text-muted">
        รองรับ PDF, รูปภาพ, เอกสาร และไฟล์บีบอัด ขนาดไม่เกิน 10 MB ต่อไฟล์
      </p>

      <p className="sr-only" aria-live="polite">
        {busyAction === "upload" ? "กำลังอัปโหลดไฟล์" : busyAction === "delete" ? "กำลังลบไฟล์" : ""}
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">ไม่มีไฟล์แนบ</p>
      ) : (
        <ul className="divide-y divide-border" aria-label="รายการไฟล์แนบ">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <Paperclip size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
              <a
                href={`/api/attachments/${item.id}`}
                aria-label={`เปิดไฟล์แนบ ${item.filename}`}
                title={item.filename}
                className="min-w-0 flex-1 break-all rounded-sm text-sm font-medium leading-5 text-brand line-clamp-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
              >
                {item.filename}
              </a>
              <span className="text-xs text-slate-400">{humanSize(item.size)}</span>
              <span className="hidden text-xs text-slate-400 sm:inline">{fmtDateTime(item.uploadedAt)}</span>
              {canModify && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(item)}
                  disabled={busyAction !== null}
                  aria-label={`ลบไฟล์ ${item.filename}`}
                  aria-busy={busyAction === "delete" || undefined}
                  className="no-print flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1 disabled:opacity-50"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      </DetailSection>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="ลบไฟล์แนบนี้?"
        description={pendingDelete ? `ไฟล์ “${pendingDelete.filename}” จะถูกลบออกจากคำร้องนี้` : ""}
        confirmLabel="ยืนยันลบไฟล์"
        tone="danger"
        busy={busyAction === "delete"}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          if (target) void remove(target.id);
        }}
      />
    </>
  );
}
