import { useId } from "react";
import { cn } from "@/lib/ui";

export function DetailSection({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn("grid border-t border-border lg:grid-cols-[14rem_minmax(0,1fr)]", className)}
    >
      <header className="bg-surface-subtle/80 px-5 py-4 lg:border-r lg:border-border lg:px-6 lg:py-5">
        <h2 id={titleId} className="border-l-2 border-brand pl-3 text-sm font-semibold text-slate-950">{title}</h2>
        {description && <p className="mt-1.5 pl-[0.875rem] text-xs leading-relaxed text-muted">{description}</p>}
        {action && <div className="mt-3 pl-[0.875rem]">{action}</div>}
      </header>
      <div className={cn("min-w-0 px-5 py-5 sm:px-6 xl:px-7", contentClassName)}>{children}</div>
    </section>
  );
}
