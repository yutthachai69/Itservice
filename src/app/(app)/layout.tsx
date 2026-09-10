import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { siteName, isIT } from "@/lib/constants";
import { AppNav } from "./AppNav";
import { NavProgress } from "./NavProgress";
import { RememberSite } from "./RememberSite";
import { ToastProvider } from "@/components/Toast";
import {
  DatabaseZap,
  KeyRound,
  Laptop,
  MonitorCog,
  ShieldCheck,
  Video,
} from "lucide-react";

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
    ...(it
      ? [
          { href: "/dashboard", label: "แดชบอร์ด" },
          { href: "/assets", label: "ทะเบียนเครื่อง" },
          { href: "/loans", label: "ยืม-คืนอุปกรณ์" },
        ]
      : []),
    ...(user.role === "ADMIN" ? [{ href: "/admin/users", label: "จัดการสิทธิ์" }] : []),
  ];
  const services = [
    { href: "/tickets/new/F06", label: "แจ้งปัญหา IT", icon: MonitorCog, tint: "bg-blue-50 text-blue-600" },
    { href: "/tickets/new/F11", label: "แก้ไขรหัสผ่าน", icon: KeyRound, tint: "bg-emerald-50 text-emerald-600" },
    { href: "/tickets/new/F10", label: "ขอสิทธิ์ใช้งานระบบ", icon: ShieldCheck, tint: "bg-violet-50 text-violet-600" },
    { href: "/tickets/new/F03", label: "ขอยืมอุปกรณ์", icon: Laptop, tint: "bg-amber-50 text-amber-600" },
    { href: "/tickets/new/F12", label: "ขอจัดประชุมออนไลน์", icon: Video, tint: "bg-rose-50 text-rose-600" },
    { href: "/tickets/new/F07", label: "ขอแก้ไขข้อมูลระบบ", icon: DatabaseZap, tint: "bg-teal-50 text-teal-600" },
  ];

  return (
    <div className="min-w-0 flex-1">
      <NavProgress />
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[260px] overflow-y-auto border-r border-border bg-card lg:flex lg:flex-col">
        <Link href="/" className="flex h-16 items-center gap-3 border-b border-border px-5 text-lg font-bold text-slate-900">
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
          <nav className="space-y-0.5">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Link
                  key={service.href}
                  href={service.href}
                  className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${service.tint}`}>
                    <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span>{service.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <p className="mt-auto px-5 pb-5 pt-3 text-[11px] text-slate-400">{siteName(user.siteCode ?? "")} · IT Service Desk</p>
      </aside>

      <div className="min-w-0 lg:ml-[260px]">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6 xl:px-8">
            <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900 lg:hidden">
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
                <button className="rounded-lg border border-border-strong px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
                  ออกจากระบบ
                </button>
              </form>
            </div>
          </div>
          <div className="relative h-11 overflow-hidden border-t border-border bg-card px-4 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-px after:h-[12px] after:bg-card after:content-[''] lg:hidden">
            <AppNav links={links} />
          </div>
        </header>
        <main className="w-full px-4 py-6 sm:px-6 xl:px-8">
          <ToastProvider>{children}</ToastProvider>
        </main>
        <RememberSite siteName={user.siteCode ? siteName(user.siteCode) : null} />
      </div>
    </div>
  );
}
