"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/ui";

const RANGES = [
  { value: "7d", label: "7 วัน" },
  { value: "30d", label: "30 วัน" },
  { value: "month", label: "เดือนนี้" },
  { value: "all", label: "ทั้งหมด" },
];

const DEFAULT_RANGE = "30d";

export function DashboardFilters({
  sites,
  range,
  site,
}: {
  sites: { code: string; name: string }[];
  range: string;
  site: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const navigate = (next: URLSearchParams) => {
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || (key === "range" && value === DEFAULT_RANGE)) next.delete(key);
    else next.set(key, value);
    navigate(next);
  };

  const dirty = range !== DEFAULT_RANGE || !!site;

  return (
    <div
      aria-busy={pending || undefined}
      className={cn("flex flex-wrap items-center gap-2.5 transition-opacity", pending && "opacity-65")}
    >
      <span
        role="status"
        aria-live="polite"
        className={cn("text-xs text-muted", !pending && "sr-only")}
      >
        {pending ? "กำลังอัปเดตตัวกรอง" : ""}
      </span>
      <div role="group" aria-label="ช่วงข้อมูลแดชบอร์ด" className="grid w-full grid-cols-4 rounded-md border border-border bg-card p-0.5 sm:inline-flex sm:w-auto">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            disabled={pending}
            onClick={() => update("range", r.value)}
            aria-pressed={range === r.value}
            className={cn(
              "rounded px-2 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-1 disabled:cursor-wait sm:px-3",
              range === r.value
                ? "bg-brand text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <select
        value={site}
        disabled={pending}
        onChange={(e) => update("site", e.target.value)}
        aria-label="กรองตามบริษัท"
        className="control-select-compact w-full px-3 text-xs text-slate-700 disabled:cursor-wait sm:w-auto"
      >
        <option value="">ทุกบริษัท</option>
        {sites.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>

      {dirty && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => navigate(new URLSearchParams())}
          className="w-full text-xs text-muted hover:text-brand disabled:cursor-wait sm:w-auto"
        >
          <RotateCcw size={12} aria-hidden="true" />
          ล้างตัวกรอง
        </Button>
      )}
    </div>
  );
}
