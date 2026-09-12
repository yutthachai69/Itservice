"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/ui";

export function AppNav({
  links,
  variant = "top",
}: {
  links: { href: string; label: string }[];
  variant?: "top" | "sidebar";
}) {
  const pathname = usePathname();
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    if (variant !== "top") return;
    activeLinkRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname, variant]);

  return (
    <nav
      aria-label={variant === "sidebar" ? "เมนูหลัก" : "เมนูระบบ"}
      className={variant === "sidebar" ? "space-y-1" : "no-scrollbar flex h-full min-w-0 items-start gap-5 overflow-x-auto overscroll-x-contain scroll-px-4 whitespace-nowrap text-sm"}
    >
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          ref={active(l.href) ? activeLinkRef : undefined}
          aria-current={active(l.href) ? "page" : undefined}
          className={cn(
            variant === "sidebar"
              ? "flex items-center rounded-md border-l-2 py-2.5 pr-3 pl-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-inset"
              : "flex h-11 shrink-0 items-center border-b-2 px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-inset",
            variant === "sidebar"
              ? active(l.href)
                ? "border-brand bg-brand-weak font-semibold text-brand"
                : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              : active(l.href)
                ? "border-brand font-medium text-brand"
                : "border-transparent text-muted hover:border-slate-300 hover:text-slate-900",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
