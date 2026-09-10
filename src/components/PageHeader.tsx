import { cn } from "@/lib/ui";

/**
 * Standard heading block for inner pages: playful display title, optional code
 * chip, count, subtitle, and a right-aligned actions slot.
 */
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
        "mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4",
        className,
      )}
    >
      <div className="min-w-0">
        {chip && (
          <span className="mb-1 inline-block rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
            {chip}
          </span>
        )}
        <h1 className="font-display text-xl text-slate-900 sm:text-2xl">
          {title}
          {count != null && <span className="ml-2 align-middle text-base font-sans text-slate-400">({count})</span>}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
