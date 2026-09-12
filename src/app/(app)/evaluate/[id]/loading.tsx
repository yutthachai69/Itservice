import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div role="status" className="mx-auto max-w-2xl space-y-5" aria-busy="true" aria-live="polite">
      <p className="sr-only">กำลังโหลดแบบประเมิน</p>
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-3.5 w-80" />
      </div>
      <div className="card space-y-6 p-5 sm:p-6">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-10 w-10 rounded-full" /></div>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
