import { cn } from "@/lib/ui";

/** Standard heading for operational pages. Display fonts stay on marketing surfaces. */
export function PageHeader({
  title,
  subtitle,
  chip,
  count,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  chip?: React.ReactNode;
  count?: number;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-border pb-4 sm:items-end",
        className,
      )}
    >
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
      {actions && <div className="flex w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">{actions}</div>}
    </header>
  );
}
