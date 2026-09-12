import { cn } from "@/lib/ui";

// Split out of components/Button.tsx: that file needs "use client" (Button/
// ButtonLink attach onClick handlers), but buttonClass is a plain string
// utility that Server Components call directly wherever a bare <button>/<a>
// is easier than the component. A function exported from a "use client"
// module becomes a client-only reference — calling it from a Server
// Component throws "Attempted to call buttonClass() from the server but
// buttonClass is on the client" — so it has to live in its own module with
// no directive at all.

export type Variant = "primary" | "secondary" | "ghost" | "danger";
export type Size = "sm" | "md" | "lg";

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
