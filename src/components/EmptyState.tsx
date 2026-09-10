import Link from "next/link";
import { Inbox, type LucideIcon } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-card px-6 py-12 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-weak text-brand">
        <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <p className="mt-3 font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p>}
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
