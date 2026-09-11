import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui";

/** Standard heading for operational pages. Display fonts stay on marketing surfaces. */
export function PageHeader({
  title,
  subtitle,
  chip,
  count,
  icon: Icon,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  chip?: React.ReactNode;
  count?: number;
  /** optional — anchors the header to a specific service/category, same
   *  monochrome brand tile used in the sidebar, home, and documents cards */
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-weak text-brand">
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          {chip && (
            <span className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-brand">
              <span className="h-px w-4 bg-brand" aria-hidden="true" />
              {chip}
            </span>
          )}
          <h1 className="text-xl font-semibold leading-tight tracking-[-0.015em] text-slate-950 sm:text-[1.375rem]">
            {title}
            {count != null && (
              <span className="ml-2 align-middle text-sm font-normal tracking-normal text-slate-400">
                {count.toLocaleString("th-TH")} รายการ
              </span>
            )}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
