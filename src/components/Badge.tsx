import { cn } from "@/lib/ui";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700 ring-slate-200",
      )}
    >
      {STATUS_LABEL[status] ?? status}
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
    red: "bg-red-100 text-red-700 ring-red-200",
    amber: "bg-amber-100 text-amber-800 ring-amber-200",
    green: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    blue: "bg-brand-weak text-brand ring-brand/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
