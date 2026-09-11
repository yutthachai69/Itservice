"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SERVICE_ICON } from "@/lib/doc-meta";
import { cn } from "@/lib/ui";

const SERVICES = [
  { code: "F06", href: "/tickets/new/F06", label: "แจ้งปัญหา IT" },
  { code: "F11", href: "/tickets/new/F11", label: "แก้ไขรหัสผ่าน" },
  { code: "F10", href: "/tickets/new/F10", label: "ขอสิทธิ์ใช้งานระบบ" },
  { code: "F03", href: "/tickets/new/F03", label: "ขอยืมอุปกรณ์" },
  { code: "F12", href: "/tickets/new/F12", label: "ขอจัดประชุมออนไลน์" },
  { code: "F07", href: "/tickets/new/F07", label: "ขอแก้ไขข้อมูลระบบ" },
];

export function ServiceNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="บริการ IT" className="space-y-0.5">
      {SERVICES.map((service) => {
        const Icon = SERVICE_ICON[service.code];
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
