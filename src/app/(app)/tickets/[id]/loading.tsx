import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div role="status" className="space-y-5" aria-busy="true" aria-live="polite" aria-label="กำลังโหลดรายละเอียดคำร้อง">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5 sm:items-end">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="grid overflow-hidden rounded-md bg-sidebar sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 border-white/10 px-5 py-4 sm:border-l first:border-l-0">
            <Skeleton className="h-3 w-20 bg-white/15" />
            <Skeleton className="h-4 w-28 bg-white/20" />
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-md border border-border bg-card">
            {Array.from({ length: 3 }).map((_, section) => (
              <div key={section} className="grid border-t border-border first:border-t-0 lg:grid-cols-[14rem_minmax(0,1fr)]">
                <div className="space-y-2 bg-surface-subtle px-5 py-5 lg:border-r lg:border-border">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6">
                  {Array.from({ length: 4 }).map((_, row) => (
                    <div key={row} className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-md border border-border bg-card p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
        <div className="order-first overflow-hidden rounded-md border border-border bg-card xl:order-last">
          <div className="space-y-2 bg-sidebar px-5 py-4">
            <Skeleton className="h-3 w-24 bg-white/15" />
            <Skeleton className="h-5 w-36 bg-white/20" />
          </div>
          <div className="space-y-4 p-5">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
