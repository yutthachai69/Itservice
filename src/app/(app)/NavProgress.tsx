"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin top progress bar that starts on an internal link click and finishes
 * when the route actually changes. No dependency — a tiny nprogress.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [value, setValue] = useState(0); // 0 = hidden
  const trickle = useRef<number | null>(null);
  const clear = useRef<number | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      const href = a?.getAttribute("href");
      if (!a || !href || a.target === "_blank" || a.hasAttribute("download")) return;
      if (!href.startsWith("/") || href.startsWith("//")) return;
      if (href.split("?")[0] === pathname) return;

      window.clearInterval(trickle.current ?? undefined);
      window.clearTimeout(clear.current ?? undefined);
      setValue(10);
      trickle.current = window.setInterval(() => {
        setValue((v) => (v >= 90 ? v : v + Math.max(0.4, (90 - v) / 14)));
      }, 220);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  // route committed → finish
  useEffect(() => {
    window.clearInterval(trickle.current ?? undefined);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue((v) => (v === 0 ? 0 : 100));
    clear.current = window.setTimeout(() => setValue(0), 220);
    return () => window.clearTimeout(clear.current ?? undefined);
  }, [pathname]);

  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">
        {value > 0 ? "กำลังโหลดหน้า" : ""}
      </span>
      <div className="no-print pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]" aria-hidden="true">
        <div
          className="nav-progress-bar h-full bg-brand shadow-[0_0_8px_var(--color-brand)] transition-[width,opacity] duration-200 ease-out"
          style={{ width: `${value}%`, opacity: value === 0 ? 0 : 1 }}
        />
      </div>
    </>
  );
}
