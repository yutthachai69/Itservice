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
              "group flex min-w-0 items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-inset",
              active
                ? "border-brand bg-white/10 font-medium text-white"
                : "border-transparent text-white/75 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon
              size={16}
              strokeWidth={1.8}
              aria-hidden="true"
              className={cn("shrink-0", active ? "text-brand-weak" : "text-white/55 group-hover:text-brand-weak")}
            />
            <span className="min-w-0 break-words">{service.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
