import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div role="status" className="space-y-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">กำลังโหลดข้อมูล</p>
      <div className="flex items-start justify-between gap-6 border-b border-border pb-4 sm:items-end">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3.5 w-80" />
        </div>
        <Skeleton className="hidden h-10 w-36 sm:block" />
      </div>

      <div className="grid overflow-hidden rounded-md border border-border bg-card sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 border-t border-border p-5 first:border-t-0 sm:border-t-0 sm:border-l sm:first:border-l-0">
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.75fr)]">
        {[6, 5].map((rows, panel) => (
          <div key={rows}>
            <div className="mb-3 space-y-1.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="overflow-hidden rounded-md border border-border bg-card">
              {Array.from({ length: rows }, (_, i) => (
                <div key={i} className={panel === 0 && i === 0 ? "bg-sidebar p-5" : "border-t border-border p-4 first:border-t-0"}>
                  <Skeleton className={panel === 0 && i === 0 ? "h-4 w-44 bg-white/20" : "h-3.5 w-40"} />
                  <Skeleton className={panel === 0 && i === 0 ? "mt-2 h-3 w-72 bg-white/15" : "mt-2 h-3 w-2/3"} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-52" />
        </div>
        <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-border">
          {[0, 1].map((column) => (
            <div key={column} className="space-y-3 p-5">
              <Skeleton className="h-4 w-40" />
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
