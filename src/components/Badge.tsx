import { cn } from "@/lib/ui";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/constants";

const STATUS_DOT: Record<string, string> = {
  OPEN: "bg-amber-600",
  IN_PROGRESS: "bg-brand",
  RESOLVED: "bg-amber-600",
  CLOSED: "bg-slate-500",
  CANCELLED: "bg-slate-400",
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span
      aria-label={`สถานะ ${label}`}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700 ring-slate-200",
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[status] ?? "bg-slate-400")} aria-hidden="true" />
      {label}
    </span>
  );
}

export function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "red" | "amber" | "green" | "blue";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    blue: "bg-brand-weak text-brand ring-brand/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
