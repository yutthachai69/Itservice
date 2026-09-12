import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div role="status" className="space-y-8" aria-busy="true" aria-live="polite">
      <p className="sr-only">กำลังโหลดเอกสาร</p>
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-80" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card flex items-start gap-3.5 p-4">
              <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
