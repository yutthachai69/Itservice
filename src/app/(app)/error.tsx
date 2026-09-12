"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid place-items-center py-20 text-center">
      <div role="alert" aria-labelledby="app-error-heading" className="card w-full max-w-md p-8">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-600">
          <AlertTriangle size={22} aria-hidden="true" />
        </div>
        <h1 id="app-error-heading" className="mt-3 text-lg font-medium text-slate-900">เกิดข้อผิดพลาด</h1>
        <p className="mt-1 text-sm text-muted">ระบบทำงานผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset}>ลองใหม่</Button>
          <ButtonLink href="/" variant="secondary">กลับหน้าแรก</ButtonLink>
        </div>
      </div>
    </div>
  );
}
