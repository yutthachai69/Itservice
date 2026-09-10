"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef, FormDef } from "@/lib/form-defs";
import { cn } from "@/lib/ui";
import { Spinner } from "@/components/Spinner";
import { LoanAvailabilityHint } from "./LoanAvailabilityHint";

type Approver = { id: number; name: string; type: string };
type Values = Record<string, string | string[]>;

export function TicketForm({
  def,
  sites,
  approvers,
  departments = [],
  prefill,
  signName,
  mode = "create",
  ticketId,
  initialValues,
  initialNote,
  showLoanCheck = false,
  autoSiteName = null,
}: {
  def: FormDef;
  sites: { code: string; name: string }[];
  approvers: Approver[];
  departments?: { id: number; name: string }[];
  prefill: Record<string, string>;
  signName: string;
  mode?: "create" | "edit";
  ticketId?: number;
  initialValues?: Values;
  initialNote?: string;
  showLoanCheck?: boolean;
  autoSiteName?: string | null;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const initial = useMemo<Values>(() => {
    const v: Values = {};
    for (const s of def.sections)
      for (const f of s.fields) {
        const seed = initialValues?.[f.key];
        if (seed !== undefined) v[f.key] = seed;
        else v[f.key] = f.type === "checkboxes" ? [] : (prefill[f.key] ?? "");
      }
    for (const step of def.approvals ?? []) v[step.fieldKey] = initialValues?.[step.fieldKey] ?? "";
    return v;
  }, [def, prefill, initialValues]);

  const [values, setValues] = useState<Values>(initial);
  const [deptOptions, setDeptOptions] = useState(departments);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [note, setNote] = useState(initialNote ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!firstInvalid) return;
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalid.focus({ preventScroll: true });
  }, [errors]);

  // Cascade: reload the ฝ่าย/แผนก list whenever the service site changes.
  // State is seeded with the server-rendered list, so there is no empty flash
  // before this first fetch resolves.
  const serviceSite = typeof values.serviceSiteCode === "string" ? values.serviceSiteCode : "";
  useEffect(() => {
    if (!serviceSite) return;
    let cancelled = false;
    fetch(`/api/departments?site=${encodeURIComponent(serviceSite)}`)
      .then((r) => (r.ok ? r.json() : { departments: [] }))
      .then((d: { departments?: { id: number; name: string }[] }) => {
        if (!cancelled) setDeptOptions(d.departments ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [serviceSite]);

  const set = (k: string, val: string | string[]) =>
    setValues((prev) => ({ ...prev, [k]: val }));

  const toggle = (k: string, opt: string) =>
    setValues((prev) => {
      const cur = Array.isArray(prev[k]) ? (prev[k] as string[]) : [];
      return {
        ...prev,
        [k]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt],
      };
    });

  function validateClient() {
    const next: Record<string, string> = {};

    for (const section of def.sections) {
      for (const field of section.fields) {
        if (field.required && field.type === "checkboxes") {
          const selected = values[field.key];
          if (!Array.isArray(selected) || selected.length === 0) {
            next[field.key] = "กรุณาเลือกอย่างน้อย 1 รายการ";
          }
        }
      }
    }

    const borrowDate = String(values.borrowDate ?? "");
    const returnDate = String(values.returnDate ?? "");
    if (def.type === "F03" && borrowDate && returnDate && returnDate < borrowDate) {
      next.returnDate = "วันที่คืนต้องไม่ก่อนวันที่ยืม";
    }

    const startAt = String(values.startAt ?? "");
    const endAt = String(values.endAt ?? "");
    if (def.type === "F12" && startAt && endAt && endAt <= startAt) {
      next.endAt = "เวลาสิ้นสุดต้องหลังเวลาเริ่มใช้";
    }

    for (const key of ["participantCount", "wifiCount"]) {
      const value = String(values[key] ?? "");
      if (value && (!/^\d+$/.test(value) || Number(value) < 0)) {
        next[key] = "กรุณาระบุเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป";
      }
    }

    return next;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setSubmitting(false);
      setErrors(clientErrors);
      setFormError("กรุณาตรวจสอบข้อมูลที่มีเครื่องหมายเตือนก่อนส่งคำร้อง");
      return;
    }
    if (fileError) {
      setSubmitting(false);
      setFormError(fileError);
      return;
    }

    const data: Record<string, unknown> = { ...values, note };
    let res: Response;
    try {
      res = isEdit
        ? await fetch(`/api/tickets/${ticketId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data }),
          })
        : await fetch("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ formType: def.type, data, notifyEmail }),
          });
    } catch {
      setSubmitting(false);
      setFormError("เชื่อมต่อระบบไม่สำเร็จ กรุณาตรวจสอบเครือข่ายแล้วลองใหม่อีกครั้ง");
      return;
    }

    if (res.ok) {
      if (isEdit) {
        router.push(`/tickets/${ticketId}`);
        router.refresh();
      } else {
        const { id } = await res.json();
        let attachmentFailed = false;
        for (const file of files) {
          const body = new FormData();
          body.append("file", file);
          try {
            const upload = await fetch(`/api/tickets/${id}/attachments`, {
              method: "POST",
              body,
            });
            if (!upload.ok) attachmentFailed = true;
          } catch {
            attachmentFailed = true;
          }
        }
        router.push(`/tickets/${id}?created=1${attachmentFailed ? "&attachment=failed" : ""}`);
      }
      return;
    }
    setSubmitting(false);
    if (res.status === 422) {
      const body = await res.json();
      setErrors(body.fields ?? {});
      setFormError("กรอกข้อมูลไม่ครบ กรุณาตรวจสอบช่องที่มีข้อความแจ้งเตือน");
    } else {
      setFormError("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 card overflow-hidden">
      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:px-7"
        >
          <p className="font-medium">พบข้อมูลที่ต้องแก้ไข {Object.keys(errors).length} รายการ</p>
          <ul className="mt-1 list-inside list-disc">
            {Object.entries(errors).map(([key, message]) => (
              <li key={key}>
                <a className="underline" href={`#${key}`}>
                  {fieldLabel(def, key)}: {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isEdit && (
        <p className="border-b border-border bg-slate-50/60 px-5 py-3 text-xs text-muted sm:px-7">
          ช่องที่มีเครื่องหมาย <span className="text-red-500">*</span> จำเป็นต้องกรอก
        </p>
      )}

      {def.sections.map((section) => (
        <fieldset key={section.title} className="border-b border-border px-5 py-6 sm:px-7">
          <legend className="px-0 text-base font-semibold text-slate-900">{section.title}</legend>
          {section.title.includes("ผู้ขอ") && (
            <p className="mb-3 text-xs text-muted">ดึงจากโปรไฟล์ของคุณให้อัตโนมัติ — แก้ไขได้หากไม่ถูกต้อง</p>
          )}
          {autoSiteName && section.fields.some((f) => f.key === "serviceSiteCode") && (
            <p className="mb-3 text-xs text-muted">
              ตั้ง “บริษัทที่ขอรับบริการ” เป็น <span className="font-medium text-slate-700">{autoSiteName}</span> อัตโนมัติจากเครือข่ายที่คุณเชื่อมต่อ — เปลี่ยนได้
            </p>
          )}
          <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {section.fields.map((f) => (
              <Field
                key={f.key}
                f={f}
                sites={sites}
                depts={deptOptions}
                value={values[f.key]}
                error={errors[f.key]}
                onChange={(val) => set(f.key, val)}
                onToggle={(opt) => toggle(f.key, opt)}
              />
            ))}
          </div>
        </fieldset>
      ))}

      {showLoanCheck && (
        <LoanAvailabilityHint
          category={(values.deviceType as string) ?? ""}
          from={(values.borrowDate as string) ?? ""}
          to={(values.returnDate as string) ?? ""}
        />
      )}

      {!isEdit && def.approvals && def.approvals.length > 0 && (
        <fieldset className="border-b border-border px-5 py-6 sm:px-7">
          <legend className="px-0 text-base font-semibold text-slate-900">ผู้ตรวจสอบ / อนุมัติ</legend>
          <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {def.approvals.map((step) => {
              const opts = approvers.filter((a) => a.type === step.approverType);
              return (
                <label key={step.fieldKey} className="block">
                  <span className="text-sm text-slate-600">
                    {step.label} <span className="text-red-500">*</span>
                  </span>
                  <select
                    value={(values[step.fieldKey] as string) ?? ""}
                    onChange={(e) => set(step.fieldKey, e.target.value)}
                    className={inputCls(errors[step.fieldKey])}
                    required
                    aria-invalid={errors[step.fieldKey] ? "true" : "false"}
                    id={step.fieldKey}
                  >
                    <option value="">-- เลือก --</option>
                    {opts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {errors[step.fieldKey] && <ErrText>{errors[step.fieldKey]}</ErrText>}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="space-y-4 border-b border-border px-5 py-6 sm:px-7">
        <h2 className="text-base font-semibold text-slate-900">ข้อมูลเพิ่มเติม</h2>
        <label className="block">
          <span className="text-sm text-slate-600">ข้อมูลเพิ่มเติม</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="ระบุข้อมูลเพิ่มเติมที่ช่วยให้ IT ดำเนินการได้เร็วขึ้น (ถ้ามี)"
            className={inputCls()}
          />
          <span className="mt-1 block text-xs text-slate-400">เช่น ช่วงเวลาที่สะดวกให้ติดต่อ หรือบริบทของงาน</span>
        </label>
        {!isEdit && (
          <label className="block">
            <span className="text-sm text-slate-600">ไฟล์แนบ</span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.log"
              onChange={(e) => {
                const selected = Array.from(e.target.files ?? []);
                const allowed = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".zip", ".rar", ".7z", ".log"]);
                if (files.length + selected.length > 5) {
                  setFileError("แนบไฟล์ได้ไม่เกิน 5 ไฟล์");
                  e.currentTarget.value = "";
                  return;
                }
                const invalid = selected.find((file) => {
                  const dot = file.name.lastIndexOf(".");
                  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
                  return file.size <= 0 || file.size > 10 * 1024 * 1024 || !allowed.has(ext);
                });
                if (invalid) {
                  setFileError(`ไฟล์ ${invalid.name} ไม่รองรับหรือมีขนาดเกิน 10 MB`);
                } else {
                  setFileError(null);
                  setFiles((current) => [...current, ...selected].slice(0, 5));
                }
                e.currentTarget.value = "";
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded file:border-0 file:bg-brand-weak file:px-2 file:py-1 file:text-xs file:font-medium file:text-brand focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            <span className="mt-1 block text-xs text-slate-400">แนบได้ไม่เกิน 5 ไฟล์ ไฟล์ละไม่เกิน 10 MB</span>
            {fileError && <ErrText>{fileError}</ErrText>}
            {files.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                      className="shrink-0 text-red-600 hover:underline"
                    >
                      ลบ
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>
        )}
        {!isEdit && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
            />
            รับสถานะแจ้งเตือนทางอีเมล
          </label>
        )}
        <p className="text-sm text-slate-500">
          ลงนามผู้ขอ: <span className="font-medium text-slate-700">{signName}</span>
        </p>
      </div>

      {formError && (
        <p role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 sm:px-7">
          {formError}
        </p>
      )}

      <div className="sticky bottom-0 z-10 flex flex-wrap gap-3 border-t border-border bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {submitting && <Spinner />}
          {submitting ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "ส่งคำร้อง"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border-strong px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:ring-offset-2"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function inputCls(error?: string) {
  return cn(
    "mt-1 min-h-10 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15",
    error ? "border-red-400" : "border-border",
  );
}

function ErrText({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-xs text-red-600">{children}</span>;
}

/** Options for a <select> field — sites and ฝ่าย/แผนก are injected at render time. */
function selectOptions(
  f: FieldDef,
  sites: { code: string; name: string }[],
  depts: { id: number; name: string }[],
  current: string,
) {
  if (f.key === "serviceSiteCode") return sites.map((s) => ({ value: s.code, label: s.name }));
  if (f.key === "reqDept") {
    const opts = depts.map((d) => ({ value: d.name, label: d.name }));
    // keep the value carried over from the profile / another site selectable
    if (current && !opts.some((o) => o.value === current)) {
      opts.unshift({ value: current, label: `${current} (จากโปรไฟล์)` });
    }
    return opts;
  }
  return f.options ?? [];
}

function fieldLabel(def: FormDef, key: string) {
  for (const section of def.sections) {
    const field = section.fields.find((item) => item.key === key);
    if (field) return field.label;
  }
  const approval = def.approvals?.find((step) => step.fieldKey === key);
  return approval?.label ?? key;
}

function Field({
  f,
  sites,
  depts,
  value,
  error,
  onChange,
  onToggle,
}: {
  f: FieldDef;
  sites: { code: string; name: string }[];
  depts: { id: number; name: string }[];
  value: string | string[] | undefined;
  error?: string;
  onChange: (v: string) => void;
  onToggle: (opt: string) => void;
}) {
  const span = f.colSpan === 2 ? "sm:col-span-2" : "";

  if (f.type === "checkboxes") {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className={span}>
        <span className="text-sm font-medium text-slate-700">
          {f.label} {f.required && <span className="text-red-500">*</span>}
        </span>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
          {(f.options ?? []).map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                id={o === f.options?.[0] ? f.key : `${f.key}-${o.value}`}
                type="checkbox"
                checked={arr.includes(o.value)}
                onChange={() => onToggle(o.value)}
                aria-invalid={error ? ("true" as const) : ("false" as const)}
              />
              {o.label}
            </label>
          ))}
        </div>
        {error && <ErrText>{error}</ErrText>}
      </div>
    );
  }

  const v = typeof value === "string" ? value : "";
  const common = {
    id: f.key,
    className: inputCls(error),
    value: v,
    required: f.required,
    "aria-invalid": error ? ("true" as const) : ("false" as const),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(e.target.value),
  };

  return (
    <label className={cn("block", span)}>
      <span className="text-sm font-medium text-slate-700">
        {f.label} {f.required && <span className="text-red-500">*</span>}
      </span>

      {f.type === "textarea" ? (
        <textarea rows={3} {...common} />
      ) : f.type === "select" ? (
        <select {...common}>
          <option value="">-- เลือก --</option>
          {selectOptions(f, sites, depts, v).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={
            f.type === "datetime"
              ? "datetime-local"
              : f.type === "date"
                ? "date"
                : f.type === "number"
                  ? "number"
                  : f.type === "email"
                    ? "email"
                    : f.type === "tel"
                      ? "tel"
                      : "text"
          }
          maxLength={f.maxLength}
          placeholder={f.placeholder}
          min={f.type === "number" ? 0 : undefined}
          step={f.type === "number" ? 1 : undefined}
          {...common}
        />
      )}
      {f.help && <span className="mt-1 block text-xs text-slate-400">{f.help}</span>}
      {error && <ErrText>{error}</ErrText>}
    </label>
  );
}
