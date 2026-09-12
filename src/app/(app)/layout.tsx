import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { siteName, isIT } from "@/lib/constants";
import { AppNav } from "./AppNav";
import { ServiceNav } from "./ServiceNav";
import { NavProgress } from "./NavProgress";
import { RememberSite } from "./RememberSite";
import { ToastProvider } from "@/components/Toast";
import { buttonClass } from "@/components/Button";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const it = isIT(user.role);
  const links = [
    { href: "/", label: "หน้าแรก" },
    { href: "/tickets", label: "รายการคำร้อง" },
    { href: "/documents", label: "แบบฟอร์มเอกสาร" },
    { href: "/knowledge", label: "ความรู้" },
    ...(it
      ? [
          { href: "/dashboard", label: "แดชบอร์ด" },
          { href: "/assets", label: "ทะเบียนเครื่อง" },
          { href: "/loans", label: "ยืม-คืนอุปกรณ์" },
        ]
      : []),
    ...(user.role === "ADMIN" ? [{ href: "/admin/users", label: "จัดการสิทธิ์" }] : []),
  ];
  return (
    <div className="min-w-0 flex-1">
      <a
        href="#main-content"
        className="no-print fixed left-4 top-2 z-[60] -translate-y-16 rounded-md bg-sidebar px-3 py-2 text-sm font-medium text-white shadow-md transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-background"
      >
        ข้ามไปเนื้อหาหลัก
      </a>
      <NavProgress />
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[248px] overflow-y-auto border-r border-border bg-card lg:flex lg:flex-col">
        <Link href="/" className="flex h-16 items-center gap-3 border-b border-border px-5 text-lg font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35">
          <Image
            src="/TSM.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain [filter:drop-shadow(0_2px_4px_rgb(16_24_40_/_0.15))]"
          />
          <span>IT Service</span>
        </Link>

        <div className="px-3 py-5">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">เมนูหลัก</p>
          <AppNav links={links} variant="sidebar" />
        </div>

        <div className="border-t border-border px-3 py-5">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">บริการ</p>
          <ServiceNav />
        </div>

        <p className="mt-auto px-5 pb-5 pt-3 text-[11px] text-slate-400">{siteName(user.siteCode ?? "")} · IT Service Desk</p>
      </aside>

      <div className="min-w-0 lg:ml-[248px]">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6 xl:px-8">
            <Link href="/" className="flex items-center gap-2 rounded-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 lg:hidden">
              <Image
                src="/TSM.png"
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 object-contain [filter:drop-shadow(0_2px_3px_rgb(0_0_0_/_0.22))]"
              />
              IT Service
            </Link>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span
                role="img"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-weak text-xs font-semibold text-brand sm:hidden"
                title={user.displayName}
                aria-label={user.displayName}
              >
                {initials(user.displayName)}
              </span>
              <div className="hidden items-center gap-2.5 sm:flex">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-weak text-sm font-semibold text-brand"
                >
                  {initials(user.displayName)}
                </span>
                <div className="leading-tight">
                  <p className="font-medium text-slate-900">{user.displayName}</p>
                  <p className="text-xs text-muted">{isIT(user.role) ? "IT" : "ผู้ใช้"} · {siteName(user.siteCode ?? "")}</p>
                </div>
              </div>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className={buttonClass({ variant: "secondary", size: "sm" })}>ออกจากระบบ</button>
              </form>
            </div>
          </div>
          <div className="h-11 border-t border-border bg-card px-4 lg:hidden">
            <AppNav links={links} />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="w-full scroll-mt-20 px-4 py-6 outline-none sm:px-6 xl:px-8">
          <ToastProvider>{children}</ToastProvider>
        </main>
        <RememberSite siteName={user.siteCode ? siteName(user.siteCode) : null} />
      </div>
    </div>
  );
}
