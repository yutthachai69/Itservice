import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div role="status" className="space-y-5" aria-busy="true" aria-live="polite">
      <p className="sr-only">กำลังโหลดรายละเอียดทะเบียนเครื่อง</p>
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4 sm:items-end">
        <div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-7 w-44" /><Skeleton className="h-3.5 w-64" /></div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="grid bg-sidebar sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="space-y-2 p-5"><Skeleton className="h-3 w-20 bg-white/15" /><Skeleton className="h-4 w-28 bg-white/20" /></div>)}
        </div>
        {Array.from({ length: 4 }).map((_, section) => (
          <div key={section} className="grid border-t border-border lg:grid-cols-[14rem_minmax(0,1fr)]">
            <div className="space-y-2 bg-surface-subtle px-5 py-5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((__, i) => <div key={i} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-full" /></div>)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
