import Link from "next/link";
import { Inbox, type LucideIcon } from "lucide-react";
import { buttonClass } from "@/lib/button-class";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  cta,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-strong bg-card px-6 py-12 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-weak text-brand">
        <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <p className="mt-3 font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p>}
      {cta && (
        <Link
          href={cta.href}
          className={buttonClass({ className: "mt-4" })}
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
