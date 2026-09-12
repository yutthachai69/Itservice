"use client";

import Link from "next/link";
import { cn } from "@/lib/ui";
import { Spinner } from "@/components/Spinner";
import { buttonClass, type Variant, type Size } from "@/lib/button-class";

// Note: buttonClass is NOT re-exported here — anything exported from a
// "use client" module (this file) becomes a client-only reference, so a
// Server Component calling it via `@/components/Button` would hit the same
// "buttonClass is on the client" error this split was meant to fix. Import
// it from "@/lib/button-class" directly instead.

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
  type,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      type={type ?? "button"}
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
  onClick,
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
      {...rest}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      tabIndex={loading ? -1 : rest.tabIndex}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
