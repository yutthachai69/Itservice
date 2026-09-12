import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main aria-labelledby="not-found-heading" className="flex-1 grid place-items-center p-6">
      <div className="text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-brand-weak text-brand">
          <SearchX size={22} aria-hidden="true" />
        </div>
        <h1 id="not-found-heading" className="mt-3 text-lg font-medium text-slate-900">ไม่พบหน้าที่ต้องการ</h1>
        <p className="mt-1 text-sm text-muted">
          หน้านี้อาจถูกลบ ย้าย หรือคุณไม่มีสิทธิ์เข้าถึง
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2"
        >
          กลับหน้าแรก
        </Link>
      </div>
    </main>
  );
}
