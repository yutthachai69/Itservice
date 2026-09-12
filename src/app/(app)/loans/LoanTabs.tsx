"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

const TABS = [
  { href: "/loans", label: "รายการยืม-คืน" },
  { href: "/loan-items", label: "คลังอุปกรณ์" },
];

export function LoanTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="ส่วนยืมคืนอุปกรณ์" className="flex max-w-full flex-wrap gap-1">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={pathname === t.href ? "page" : undefined}
          className={cn(
            "whitespace-nowrap rounded-md px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1",
            pathname === t.href
              ? "border-b-2 border-brand bg-brand/10 font-medium text-brand"
              : "border-b-2 border-transparent text-slate-600 hover:bg-slate-100",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
