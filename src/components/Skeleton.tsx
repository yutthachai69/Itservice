import { cn } from "@/lib/ui";

/** Shimmering placeholder block for route-level loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("sk rounded-md bg-slate-200/70", className)} aria-hidden="true" />;
}

/** A card outline with a few skeleton lines. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("card space-y-2.5 p-5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === 0 ? "w-1/3" : i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}
