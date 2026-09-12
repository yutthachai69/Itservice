"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/ui";

const LINKS = [
  { href: "/admin/users", label: "ผู้ใช้ / บทบาท" },
  { href: "/admin/approvers", label: "รายชื่อผู้อนุมัติ" },
  { href: "/admin/holidays", label: "วันหยุด" },
];

export function AdminNav() {
  const pathname = usePathname();
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label="ส่วนจัดการระบบ" className="no-scrollbar flex max-w-full gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            ref={active ? activeLinkRef : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1",
              active
                ? "bg-brand-weak font-semibold text-brand"
                : "font-medium text-slate-600 hover:bg-brand-weak hover:text-brand",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
