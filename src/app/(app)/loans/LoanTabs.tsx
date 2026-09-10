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
    <div className="flex gap-1">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm",
            pathname === t.href
              ? "bg-brand/10 font-medium text-brand"
              : "text-slate-600 hover:bg-slate-100",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
