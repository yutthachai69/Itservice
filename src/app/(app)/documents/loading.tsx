import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div role="status" className="space-y-8" aria-busy="true" aria-live="polite">
      <p className="sr-only">กำลังโหลดเอกสาร</p>
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <div className="card flex flex-col gap-3 p-4 sm:flex-row">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-20 shrink-0" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-28 rounded-full" />)}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card flex flex-col gap-3 p-4">
              <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
              <div className="w-full flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="card space-y-4 p-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    </div>
  );
}
