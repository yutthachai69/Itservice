import Link from "next/link";
import { cn } from "@/lib/ui";
import { Spinner } from "@/components/Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-sm hover:bg-brand-strong",
  secondary: "border border-border-strong bg-card text-slate-700 hover:border-slate-400 hover:bg-surface-subtle hover:text-slate-950",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "border border-red-300 bg-card text-red-700 hover:bg-red-50",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

/** Shared class string — use when a plain <button>/<a>/<Link> is easier than the component. */
export function buttonClass(opts: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(BASE, VARIANT[opts.variant ?? "primary"], SIZE[opts.size ?? "md"], opts.className);
}

type CommonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  loading,
  className,
  children,
  href,
  ...rest
}: CommonProps & { href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link
      href={href}
      className={buttonClass({
        variant,
        size,
        className: cn(loading && "pointer-events-none opacity-55", className),
      })}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </Link>
  );
}
