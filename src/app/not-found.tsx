import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 grid place-items-center p-6">
      <div className="text-center">
        <div className="text-4xl">🔍</div>
        <h1 className="mt-3 text-lg font-medium text-slate-900">ไม่พบหน้าที่ต้องการ</h1>
        <p className="mt-1 text-sm text-slate-500">
          หน้านี้อาจถูกลบ ย้าย หรือคุณไม่มีสิทธิ์เข้าถึง
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          กลับหน้าแรก
        </Link>
      </div>
    </main>
  );
}
