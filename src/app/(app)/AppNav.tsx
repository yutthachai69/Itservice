"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

export function AppNav({
  links,
  variant = "top",
}: {
  links: { href: string; label: string }[];
  variant?: "top" | "sidebar";
}) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className={variant === "sidebar" ? "space-y-1" : "no-scrollbar flex h-[calc(100%+16px)] min-w-0 items-start gap-5 overflow-x-auto whitespace-nowrap pb-4 text-sm"}>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active(l.href) ? "page" : undefined}
          className={cn(
            variant === "sidebar"
              ? "flex items-center rounded-md border-l-2 py-2.5 pr-3 pl-2.5 text-sm transition-colors"
              : "flex h-11 shrink-0 items-center border-b-2 px-0.5 transition-colors",
            variant === "sidebar"
              ? active(l.href)
                ? "border-brand bg-brand-weak font-semibold text-brand"
                : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              : active(l.href)
                ? "border-brand font-medium text-brand"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
