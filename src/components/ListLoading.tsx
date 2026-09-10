import { Skeleton } from "@/components/Skeleton";

/** Generic list-page loading state: title + filter bar + row list. */
export function ListLoading({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="card divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-3 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={c === 0 ? "h-4 w-24" : c === cols - 1 ? "h-4 w-20" : "h-4 flex-1"}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
