import { Skeleton } from "@/components/Skeleton";

export function AssetFormLoading() {
  return (
    <div role="status" className="card space-y-6 p-5 sm:p-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">กำลังโหลดฟอร์มทะเบียนเครื่อง</p>
      {Array.from({ length: 4 }).map((_, section) => (
        <section key={section} className="space-y-4 border-b border-border pb-6 last:border-b-0 last:pb-0">
          <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-64" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: section === 0 ? 4 : 6 }).map((__, field) => (
              <div key={field} className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-10 w-full" /></div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
