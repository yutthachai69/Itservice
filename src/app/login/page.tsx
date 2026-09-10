import Image from "next/image";
import { prisma } from "@/lib/db";
import { siteName } from "@/lib/constants";
import { headers } from "next/headers";
import { authMode } from "@/lib/entra";
import { siteNameFromHeaders } from "@/lib/site-detect";
import { ArrowRight, ChevronDown } from "lucide-react";

import { loginAs } from "./actions";
import { AppPreview } from "./AppPreview";

const ROLE_LABEL: Record<string, string> = {
  USER: "ผู้ใช้ทั่วไป",
  IT_STAFF: "เจ้าหน้าที่ IT",
  IT_LEAD: "หัวหน้า IT",
  ADMIN: "ผู้ดูแลระบบ",
};

const ERR_LABEL: Record<string, string> = {
  bad_state: "เซสชันหมดอายุ กรุณาลองใหม่",
  exchange_failed: "ยืนยันตัวตนกับ Microsoft ไม่สำเร็จ",
  access_denied: "การเข้าถึงถูกปฏิเสธ",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;

  const detectedSite = siteNameFromHeaders(await headers());

  const mock = authMode() === "mock";

  const devUsers = mock
    ? await prisma.user.findMany({
        where: { active: true },
        orderBy: { id: "asc" },
      })
    : [];

  return (
    <main className="relative flex min-h-[600px] flex-1 items-center overflow-hidden bg-background text-foreground">
      {/* soft pastel blobs */}
      <div
        className="pointer-events-none absolute -right-40 -top-40 hidden h-[560px] w-[560px] rounded-full bg-brand/[0.07] lg:block"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-44 right-0 hidden h-[380px] w-[380px] rounded-full bg-brand/[0.05] lg:block"
        aria-hidden="true"
      />

      {/* header */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-7 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center gap-3">
          <Image
            src="/TSM.png"
            alt="TSM Group"
            width={48}
            height={48}
            className="h-12 w-12 object-contain [filter:drop-shadow(0_1px_1px_rgb(0_0_0_/_0.35))_drop-shadow(0_9px_16px_rgb(0_0_0_/_0.4))]"
          />
          <span className="text-lg font-bold tracking-tight text-slate-900">TSM GROUP</span>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.27em] text-slate-500">
          IT Service Desk
        </span>
      </header>

      {/* centred content */}
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-x-12 gap-y-14 px-6 py-24 sm:px-10 lg:grid-cols-2 lg:px-14 xl:px-20">
        <div className="w-full max-w-[460px]">
          <h1 className="font-display text-[38px] font-semibold leading-[1.15] tracking-tight sm:text-[46px] lg:text-[50px]">
            <span className="block text-slate-900">ระบบให้บริการ</span>
            <span className="block text-brand">เทคโนโลยีสารสนเทศ</span>
          </h1>

          <div className="mt-6 h-[3px] w-12 bg-brand" />

          {e && (
            <p
              role="alert"
              className="mt-7 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
            >
              {ERR_LABEL[e] ?? "เข้าสู่ระบบไม่สำเร็จ"}
            </p>
          )}

          <div className="mt-8">
            <a
              href="/api/auth/login"
              className="group flex h-[56px] w-full items-center justify-between rounded-xl bg-[#191c20] px-5 text-white shadow-lg transition hover:-translate-y-px hover:bg-black"
            >
              <span className="flex items-center gap-3.5">
                <MsLogo />
                <span className="text-[15px] font-medium">เข้าสู่ระบบด้วย Microsoft</span>
              </span>
              <ArrowRight
                size={20}
                strokeWidth={1.7}
                className="text-white/80 transition-transform group-hover:translate-x-1"
              />
            </a>
            <p className="mt-3 text-sm text-muted">ใช้บัญชี Microsoft 365 ขององค์กรเพื่อยืนยันตัวตน</p>
          </div>

          {mock && (
            <details className="group mt-6">
              <summary className="flex cursor-pointer list-none items-center justify-between border-t border-border pt-4 text-xs font-medium text-muted transition hover:text-slate-700">
                <span>Development access</span>
                <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
              </summary>
              <form action={loginAs} className="mt-4 space-y-3">
                <select
                  name="userId"
                  defaultValue={devUsers[0]?.id}
                  className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                >
                  {devUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} · {ROLE_LABEL[u.role] ?? u.role} · {siteName(u.siteCode ?? "")}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="h-11 w-full rounded-lg border border-border-strong bg-card text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  เข้าสู่ระบบ Dev
                </button>
              </form>
            </details>
          )}
        </div>

        {/* product illustration */}
        <div className="hidden justify-center lg:flex">
          <AppPreview detectedSite={detectedSite} />
        </div>
      </div>

    </main>
  );
}

function MsLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
