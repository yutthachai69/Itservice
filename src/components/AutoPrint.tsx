"use client";

import { useEffect } from "react";

export function AutoPrint({ backHref }: { backHref?: string }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="no-print mx-auto mt-4 flex max-w-[186mm] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3 text-center text-xs text-muted">
      <p role="status" aria-live="polite">
        กำลังเปิดหน้าต่างพิมพ์… หากไม่เปิดขึ้นมา
        <button
          type="button"
          onClick={() => window.print()}
          className="ml-1 inline-flex min-h-8 items-center rounded-md px-2 font-medium text-brand transition-colors hover:bg-brand-weak/40 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
        >
          เปิดอีกครั้ง
        </button>
      </p>
      {backHref && (
        <a
          href={backHref}
          className="inline-flex min-h-8 items-center rounded-md border border-border px-2.5 font-medium text-slate-600 transition-colors hover:border-brand/40 hover:bg-brand-weak/35 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
        >
          กลับรายละเอียดคำร้อง
        </a>
      )}
    </div>
  );
}
