import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div role="status" className="space-y-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">กำลังโหลดการจัดการสิทธิ์</p>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4 sm:items-end">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="flex gap-1"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-32" /></div>
      </div>
      <Skeleton className="h-16 w-full rounded-md" />
      <div className="card overflow-hidden">
        <div className="border-b border-border bg-surface-subtle p-3"><Skeleton className="h-3 w-52" /></div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-border p-4 last:border-b-0">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
