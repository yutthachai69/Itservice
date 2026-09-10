"use client";

import { useEffect } from "react";

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
      <div>
        <div className="text-4xl">⚠️</div>
        <h1 className="mt-3 text-lg font-medium text-slate-900">เกิดข้อผิดพลาด</h1>
        <p className="mt-1 text-sm text-slate-500">ระบบทำงานผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          ลองใหม่
        </button>
      </div>
    </div>
  );
}
