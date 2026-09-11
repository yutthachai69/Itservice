import Link from "next/link";
import { cn } from "@/lib/ui";

export function Card({
  as: As = "section",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <As className={cn("card overflow-hidden", className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: { href: string; label: string } | React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-border bg-surface-subtle/70 px-5 py-3.5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {action &&
        (isLinkAction(action) ? (
          <Link href={action.href} className="shrink-0 text-sm font-medium text-brand hover:underline">
            {action.label}
          </Link>
        ) : (
          <div className="shrink-0">{action}</div>
        ))}
    </div>
  );
}

function isLinkAction(a: unknown): a is { href: string; label: string } {
  return typeof a === "object" && a !== null && "href" in a && "label" in a;
}
