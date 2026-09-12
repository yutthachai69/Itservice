"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/ui";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "กลับไป",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const Icon = tone === "danger" ? AlertTriangle : Info;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
      previousFocusRef.current?.focus({ preventScroll: true });
      previousFocusRef.current = null;
    }

    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      aria-busy={busy || undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md overflow-hidden rounded-md border border-border bg-card p-0 text-left text-foreground shadow-xl backdrop:bg-slate-950/35 backdrop:backdrop-blur-[1px]"
    >
      <div className="flex items-start gap-3 px-5 pt-5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            tone === "danger" ? "bg-red-50 text-red-600" : "bg-brand-weak text-brand",
          )}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 id={titleId} className="text-base font-semibold text-slate-950">{title}</h2>
          <div id={descriptionId} className="mt-1 text-sm leading-6 text-muted">{description}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border bg-surface-subtle/60 px-5 py-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" disabled={busy} autoFocus onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={tone === "danger" ? "danger" : "primary"}
          loading={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
