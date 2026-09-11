"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
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
      aria-busy={pending}
      className={cn("flex flex-wrap items-center gap-2.5 transition-opacity", pending && "opacity-65")}
    >
      <div className="inline-flex rounded-md border border-border bg-card p-0.5">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            disabled={pending}
            onClick={() => update("range", r.value)}
            aria-pressed={range === r.value}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-medium transition disabled:cursor-wait",
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
        className="rounded-md border border-border bg-card px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-wait"
      >
        <option value="">ทุกบริษัท</option>
        {sites.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>

      {dirty && (
        <button
          type="button"
          disabled={pending}
          onClick={() => navigate(new URLSearchParams())}
          className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-brand disabled:cursor-wait"
        >
          <RotateCcw size={12} aria-hidden="true" />
          ล้างตัวกรอง
        </button>
      )}
    </div>
  );
}
