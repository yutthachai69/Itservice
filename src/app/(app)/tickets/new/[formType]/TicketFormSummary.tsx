import type { FieldDef, FormDef } from "@/lib/form-defs";
import { cn, fmtDate, fmtDateTime } from "@/lib/ui";

type Values = Record<string, string | string[]>;

export function TicketFormSummary({
  def,
  values,
  note,
  files,
  errors,
  fileError,
  sites,
  departments,
  approvers,
  showApprovals,
  showFiles,
  actions,
  compact = false,
}: {
  def: FormDef;
  values: Values;
  note: string;
  files: File[];
  errors: Record<string, string>;
  fileError: string | null;
  sites: { code: string; name: string }[];
  departments: { id: number; name: string }[];
  approvers: { id: number; name: string; type: string }[];
  showApprovals: boolean;
  showFiles: boolean;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  const requiredFields = def.sections.flatMap((section) => section.fields.filter((field) => field.required));
  const requiredApprovals = showApprovals ? (def.approvals ?? []) : [];
  const conditionalRequiredKeys = getConditionalRequiredKeys(def, values);
  const conditionalComplete = [...conditionalRequiredKeys].filter((key) => hasValue(values[key]) && !errors[key]).length;
  const requiredTotal = requiredFields.length + requiredApprovals.length + conditionalRequiredKeys.size;
  const requiredComplete =
    requiredFields.filter((field) => hasValue(values[field.key]) && !errors[field.key]).length +
    requiredApprovals.filter((step) => hasValue(values[step.fieldKey]) && !errors[step.fieldKey]).length +
    conditionalComplete;
  const issueCount = Object.keys(errors).length + (fileError ? 1 : 0);

  const content = (
    <>
      {def.sections.map((section, sectionIndex) => {
        const completed = section.fields.filter((field) => hasValue(values[field.key]));
        const required = section.fields.filter((field) => field.required || conditionalRequiredKeys.has(field.key));
        const requiredComplete = required.filter((field) => hasValue(values[field.key]) && !errors[field.key]).length;
        return (
          <section key={section.title} className="border-t border-border px-4 py-4 first:border-t-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="min-w-0 break-words text-sm font-semibold text-slate-900">
                {summaryTitle(section.title)}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {required.length > 0 && (
                  <span
                    title="จำนวนช่องจำเป็นที่กรอกแล้ว"
                    aria-label={`กรอกช่องจำเป็นแล้ว ${requiredComplete} จาก ${required.length} ช่อง`}
                    className={cn("text-xs font-medium tabular-nums", requiredComplete === required.length ? "text-emerald-700" : "text-slate-500")}
                  >
                    {requiredComplete}/{required.length}
                  </span>
                )}
                <a
                  href={`#ticket-section-${sectionIndex + 1}`}
                  onClick={() => focusHashTarget(`ticket-section-${sectionIndex + 1}`)}
                  aria-label={`แก้ไข ${summaryTitle(section.title)}`}
                  className="rounded-sm text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                >
                แก้ไข
                </a>
              </div>
            </div>
            {completed.length > 0 ? (
              <dl className="mt-2.5 space-y-2">
                {completed.slice(0, 5).map((field) => (
                  <div key={field.key} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 text-xs leading-5">
                    <dt className="break-words text-slate-500">{field.label}</dt>
                    <dd className="min-w-0 break-words font-medium text-slate-700">
                      {displayValue(field, values[field.key], sites, departments)}
                    </dd>
                  </div>
                ))}
                {completed.length > 5 && (
                  <p className="text-xs text-slate-500">และอีก {completed.length - 5} รายการ</p>
                )}
              </dl>
            ) : (
              <p className="mt-2 text-xs text-slate-500">ยังไม่มีข้อมูลในส่วนนี้</p>
            )}
          </section>
        );
      })}

      {showApprovals && def.approvals && (
        <section className="border-t border-border px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-slate-900">ผู้ตรวจสอบ / อนุมัติ</h3>
            <a
              href={`#ticket-section-${def.sections.length + 1}`}
              onClick={() => focusHashTarget(`ticket-section-${def.sections.length + 1}`)}
              aria-label="แก้ไขผู้ตรวจสอบ / อนุมัติ"
              className="rounded-sm text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
            >
              แก้ไข
            </a>
          </div>
          <dl className="mt-2.5 space-y-2">
            {def.approvals.map((step) => (
              <div key={step.fieldKey} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 text-xs leading-5">
                <dt className="break-words text-slate-500">{step.label}</dt>
                <dd className={cn("min-w-0 break-words font-medium", hasValue(values[step.fieldKey]) ? "text-slate-700" : "text-slate-500")}>
                  {approverName(values[step.fieldKey], approvers)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="border-t border-border px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold text-slate-900">ข้อมูลเพิ่มเติม</h3>
          <a
            href={`#ticket-section-${def.sections.length + (showApprovals ? 2 : 1)}`}
            onClick={() => focusHashTarget(`ticket-section-${def.sections.length + (showApprovals ? 2 : 1)}`)}
            aria-label="แก้ไขข้อมูลเพิ่มเติม"
            className="rounded-sm text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
          >
            แก้ไข
          </a>
        </div>
        <p className={cn("mt-2 line-clamp-3 whitespace-pre-wrap break-words text-xs leading-5", note.trim() ? "text-slate-600" : "text-slate-500")}>
          {note.trim() || "ยังไม่มีรายละเอียดเพิ่มเติม"}
        </p>
      </section>

      {showFiles && (
        <section className="border-t border-border px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-slate-900">ไฟล์แนบ</h3>
            <a
              href={`#ticket-section-${def.sections.length + (showApprovals ? 2 : 1)}`}
              onClick={() => focusHashTarget(`ticket-section-${def.sections.length + (showApprovals ? 2 : 1)}`)}
              aria-label="แก้ไขไฟล์แนบ"
              className="rounded-sm text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
            >
              แก้ไข
            </a>
          </div>
          {files.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">
              {files.slice(0, 3).map((file, index) => (
                <li key={`${file.name}-${index}`} className="break-all">{file.name}</li>
              ))}
              {files.length > 3 && <li className="text-slate-500">และอีก {files.length - 3} ไฟล์</li>}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">ยังไม่ได้แนบไฟล์</p>
          )}
        </section>
      )}
    </>
  );

  if (compact) {
    return (
      <details className="overflow-hidden rounded-md border border-border bg-card">
        <summary aria-controls="ticket-summary-details-compact" className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-slate-900 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35">
          <span>ตรวจสอบสรุปคำร้อง</span>
          <span aria-live="polite" className={cn("text-xs font-medium", issueCount > 0 ? "text-red-700" : "text-brand")}>
            {issueCount > 0 ? `${issueCount} จุดต้องแก้` : `${requiredComplete}/${requiredTotal} ช่องจำเป็น`}
          </span>
        </summary>
        <div id="ticket-summary-details-compact" className="border-t border-border">{content}</div>
      </details>
    );
  }

  return (
    <section aria-labelledby={compact ? "ticket-summary-heading-compact" : "ticket-summary-heading"} className="overflow-hidden rounded-md border border-border bg-card">
      <header className="border-b border-border bg-surface-subtle/70 px-4 py-3.5">
        <h2 id={compact ? "ticket-summary-heading-compact" : "ticket-summary-heading"} className="text-sm font-semibold text-slate-950">สรุปข้อมูลคำร้อง</h2>
        <div className="mt-1 flex items-center justify-between gap-3 text-xs">
          <span className="text-muted">ข้อมูลจำเป็น</span>
          <span aria-live="polite" className={cn("font-semibold tabular-nums", requiredComplete === requiredTotal ? "text-emerald-700" : "text-brand")}>
            {requiredComplete}/{requiredTotal} ช่อง
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="ความครบถ้วนของข้อมูลจำเป็น"
          aria-valuemin={0}
          aria-valuemax={requiredTotal}
          aria-valuenow={requiredComplete}
          aria-valuetext={`${requiredComplete} จาก ${requiredTotal} ช่องที่กรอกแล้ว`}
          className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200"
        >
          <span
            className="block h-full bg-brand transition-[width] duration-200"
            style={{ width: `${requiredTotal === 0 ? 100 : Math.round((requiredComplete / requiredTotal) * 100)}%` }}
          />
        </div>
        {issueCount > 0 && (
          <p className="mt-2 text-xs font-medium text-red-700">มีข้อมูลที่ต้องแก้ไข {issueCount} รายการ</p>
        )}
      </header>
      {content}
      {actions && (
        <footer className="border-t border-border bg-surface-subtle/50 px-4 py-4">
          {actions}
        </footer>
      )}
    </section>
  );
}

function hasValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
}

function getConditionalRequiredKeys(def: FormDef, values: Values) {
  const keys = new Set<string>();
  if (def.type === "F07" && values.system === "other") keys.add("systemOther");
  if (def.type === "F10") {
    const selectedItems = Array.isArray(values.items) ? values.items : [];
    if (selectedItems.some((item) => item === "rdp" || item === "web_online" || item === "other")) {
      keys.add("itemsDetail");
    }
  }
  return keys;
}

function focusHashTarget(id: string) {
  requestAnimationFrame(() => {
    const target = document.getElementById(id);
    if (!target) return;
    target.focus({ preventScroll: true });
  });
}

function summaryTitle(title: string) {
  if (title.includes("ผู้ขอ")) return "ข้อมูลผู้ขอ";
  if (title.includes("ใช้งาน/ยกเลิก")) return "รายละเอียดคำร้อง";
  if (title.includes("แก้ไขข้อมูลระบบ")) return "รายละเอียดการแก้ไข";
  return title;
}

function displayValue(
  field: FieldDef,
  value: string | string[] | undefined,
  sites: { code: string; name: string }[],
  departments: { id: number; name: string }[],
) {
  const options = field.key === "serviceSiteCode"
    ? sites.map((site) => ({ value: site.code, label: site.name }))
    : field.key === "reqDept"
      ? departments.map((department) => ({ value: department.name, label: department.name }))
      : (field.options ?? []);
  const label = (item: string) => options.find((option) => option.value === item)?.label ?? item;
  if (Array.isArray(value)) return value.map(label).join(", ");
  if (!value) return "ยังไม่ระบุ";
  if (field.type === "date") return fmtDate(value);
  if (field.type === "datetime") return fmtDateTime(value);
  return label(value);
}

function approverName(value: string | string[] | undefined, approvers: { id: number; name: string }[]) {
  if (typeof value !== "string" || !value) return "ยังไม่ระบุ";
  return approvers.find((approver) => String(approver.id) === value)?.name ?? "ยังไม่ระบุ";
}
