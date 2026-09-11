"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DatabaseZap,
  KeyRound,
  Laptop,
  MonitorCog,
  ShieldCheck,
  Video,
} from "lucide-react";
import { cn } from "@/lib/ui";

const SERVICES = [
  { href: "/tickets/new/F06", label: "แจ้งปัญหา IT", icon: MonitorCog },
  { href: "/tickets/new/F11", label: "แก้ไขรหัสผ่าน", icon: KeyRound },
  { href: "/tickets/new/F10", label: "ขอสิทธิ์ใช้งานระบบ", icon: ShieldCheck },
  { href: "/tickets/new/F03", label: "ขอยืมอุปกรณ์", icon: Laptop },
  { href: "/tickets/new/F12", label: "ขอจัดประชุมออนไลน์", icon: Video },
  { href: "/tickets/new/F07", label: "ขอแก้ไขข้อมูลระบบ", icon: DatabaseZap },
];

export function ServiceNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="บริการ IT" className="space-y-0.5">
      {SERVICES.map((service) => {
        const Icon = service.icon;
        const active = pathname === service.href;

        return (
          <Link
            key={service.href}
            href={service.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-brand bg-brand-weak font-medium text-brand"
                : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            <Icon
              size={16}
              strokeWidth={1.8}
              aria-hidden="true"
              className={cn("shrink-0", active ? "text-brand" : "text-slate-400 group-hover:text-brand")}
            />
            <span>{service.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
