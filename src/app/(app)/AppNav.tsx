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
  const moreMenuRef = useRef<HTMLDetailsElement>(null);
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    if (moreMenuRef.current) moreMenuRef.current.open = false;
  }, [pathname]);

  if (variant === "sidebar") {
    return (
      <nav aria-label="เมนูหลัก" className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active(link.href) ? "page" : undefined}
            className={cn(
              "flex items-center rounded-md px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-inset",
              active(link.href)
                ? "bg-brand font-semibold text-white shadow-sm"
                : "text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    );
  }

  const primaryLinks = links.slice(0, 3);
  const moreLinks = links.slice(3);
  const moreActive = moreLinks.some((link) => active(link.href));

  return (
    <nav aria-label="เมนูระบบ" className="flex h-full min-w-0 items-center gap-1 whitespace-nowrap">
      {primaryLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={active(link.href) ? "page" : undefined}
          className={cn(
            "flex h-11 min-w-0 items-center border-b-2 px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-inset sm:px-3 sm:text-sm",
            active(link.href)
              ? "border-brand font-medium text-brand"
              : "border-transparent text-muted hover:border-slate-300 hover:text-slate-900",
          )}
        >
          {link.label}
        </Link>
      ))}
      {moreLinks.length > 0 && (
        <details ref={moreMenuRef} className="group relative ml-auto h-full">
          <summary
            className={cn(
              "flex h-11 cursor-pointer list-none items-center gap-1 border-b-2 px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-inset sm:px-3 sm:text-sm [&::-webkit-details-marker]:hidden",
              moreActive
                ? "border-brand font-medium text-brand"
                : "border-transparent text-muted hover:border-slate-300 hover:text-slate-900",
            )}
          >
            เพิ่มเติม
            <span aria-hidden="true" className="text-[10px] transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-56 overflow-hidden rounded-md border border-border bg-card p-1 shadow-lg">
            {moreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active(link.href) ? "page" : undefined}
                className={cn(
                  "block rounded px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
                  active(link.href)
                    ? "bg-brand-weak font-medium text-brand"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </details>
      )}
    </nav>
  );
}
