import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div role="status" className="space-y-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">กำลังโหลดคลังอุปกรณ์</p>
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4 sm:items-end">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <Skeleton className="hidden h-8 w-44 sm:block" />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-2 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-md" />
      <div className="card overflow-hidden">
        <div className="border-b border-border bg-surface-subtle p-3"><Skeleton className="h-3 w-48" /></div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-border p-4 last:border-b-0">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
