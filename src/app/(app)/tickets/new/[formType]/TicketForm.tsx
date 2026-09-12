"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef, FormDef, SectionDef } from "@/lib/form-defs";
import { SOFTPRO_GUIDELINE } from "@/lib/softpro-guideline";
import { Check, MapPin, Paperclip, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/ui";
import { LoanAvailabilityHint } from "./LoanAvailabilityHint";
import { TicketFormSummary } from "./TicketFormSummary";

type Approver = { id: number; name: string; type: string };
type Values = Record<string, string | string[]>;

const ACCEPTED_FILE_TYPES = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.log";
const ACCEPTED_FILE_EXTENSIONS = new Set(ACCEPTED_FILE_TYPES.split(","));

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
  const serviceSite = typeof values.serviceSiteCode === "string" ? values.serviceSiteCode : "";
  const [deptOptions, setDeptOptions] = useState(departments);
  const [departmentsLoadedFor, setDepartmentsLoadedFor] = useState(serviceSite);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [note, setNote] = useState(initialNote ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileDragActive, setFileDragActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!firstInvalid) return;
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalid.focus({ preventScroll: true });
  }, [errors]);

  // Cascade: reload the ฝ่าย/แผนก list whenever the service site changes.
  // State is seeded with the server-rendered list, so there is no empty flash
  // before this first fetch resolves.
  const previousServiceSite = useRef(serviceSite);
  useEffect(() => {
    const siteChanged = previousServiceSite.current !== serviceSite;
    previousServiceSite.current = serviceSite;

    if (siteChanged) {
      setDeptOptions([]);
      setValues((prev) => (prev.reqDept ? { ...prev, reqDept: "" } : prev));
    }

    if (!serviceSite) {
      return;
    }

    // Do not keep options from the previous site while the new list is loading.
    let cancelled = false;
    fetch(`/api/departments?site=${encodeURIComponent(serviceSite)}`)
      .then((r) => (r.ok ? r.json() : { departments: [] }))
      .then((d: { departments?: { id: number; name: string }[] }) => {
        if (!cancelled) {
          setDeptOptions(d.departments ?? []);
          setDepartmentsLoadedFor(serviceSite);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeptOptions([]);
          setDepartmentsLoadedFor(serviceSite);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [serviceSite]);

  const showApprovals = !isEdit && !!def.approvals && def.approvals.length > 0;
  const approvalsStep = def.sections.length + 1;
  const extraStep = def.sections.length + (showApprovals ? 2 : 1);
  const formSections = [
    ...def.sections.map((section, index) => ({
      id: `ticket-section-${index + 1}`,
      number: index + 1,
      label: compactSectionTitle(section.title),
      hasError: section.fields.some((field) => Boolean(errors[field.key])),
    })),
    ...(showApprovals
      ? [{
          id: `ticket-section-${approvalsStep}`,
          number: approvalsStep,
          label: "ผู้ตรวจสอบ / อนุมัติ",
          hasError: (def.approvals ?? []).some((step) => Boolean(errors[step.fieldKey])),
        }]
      : []),
    { id: `ticket-section-${extraStep}`, number: extraStep, label: "ข้อมูลเพิ่มเติม", hasError: Boolean(fileError) },
  ];
  const [activeSectionId, setActiveSectionId] = useState(formSections[0]?.id ?? "");

  useEffect(() => {
    const targets = formSections
      .map((section) => document.getElementById(section.id))
      .filter((target): target is HTMLElement => Boolean(target));
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSectionId(visible.target.id);
      },
      { rootMargin: "-112px 0px -62% 0px", threshold: 0.1 },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
    // Section ids are stable for a given form; errors and field values should not restart the observer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.sections.length, extraStep, showApprovals]);

  const clearFieldError = (k: string) => {
    setErrors((prev) => {
      if (!(k in prev)) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const set = (k: string, val: string | string[]) => {
    setValues((prev) => ({ ...prev, [k]: val }));
    clearFieldError(k);
  };

  const isDirty =
    JSON.stringify(values) !== JSON.stringify(initial) ||
    note !== (initialNote ?? "") ||
    files.length > 0 ||
    (!isEdit && !notifyEmail);

  useEffect(() => {
    if (!isDirty || submitting) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty, submitting]);

  const requestCancel = () => {
    if (submitting) return;
    if (isDirty) setCancelOpen(true);
    else router.back();
  };

  const toggle = (k: string, opt: string) => {
    setValues((prev) => {
      const cur = Array.isArray(prev[k]) ? (prev[k] as string[]) : [];
      return {
        ...prev,
        [k]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt],
      };
    });
    clearFieldError(k);
  };

  function addFiles(selected: File[]) {
    if (selected.length === 0) return;
    if (files.length + selected.length > 5) {
      setFileError("แนบไฟล์ได้ไม่เกิน 5 ไฟล์");
      return;
    }

    const invalid = selected.find((file) => {
      const dot = file.name.lastIndexOf(".");
      const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
      return file.size <= 0 || file.size > 10 * 1024 * 1024 || !ACCEPTED_FILE_EXTENSIONS.has(extension);
    });
    if (invalid) {
      setFileError(`ไฟล์ ${invalid.name} ไม่รองรับหรือมีขนาดเกิน 10 MB`);
      return;
    }

    setFileError(null);
    setFiles((current) => [...current, ...selected]);
  }

  function validateClient() {
    const next: Record<string, string> = {};

    for (const section of def.sections) {
      for (const field of section.fields) {
        const current = values[field.key];
        if (field.required) {
          if (field.type === "checkboxes") {
            if (!Array.isArray(current) || current.length === 0) {
              next[field.key] = "กรุณาเลือกอย่างน้อย 1 รายการ";
            }
          } else if (typeof current !== "string" || !current.trim()) {
            next[field.key] = "กรุณากรอกข้อมูล";
          }
        }

        const text = typeof current === "string" ? current.trim() : "";
        if (text && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
          next[field.key] = "รูปแบบอีเมลไม่ถูกต้อง";
        }
        if (text && field.type === "number" && (!/^\d+$/.test(text) || Number(text) < 0)) {
          next[field.key] = "กรุณาระบุเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป";
        }
      }
    }

    if (showApprovals) {
      for (const step of def.approvals ?? []) {
        const current = values[step.fieldKey];
        if (typeof current !== "string" || !current.trim()) {
          next[step.fieldKey] = "กรุณาเลือกผู้ดำเนินการ";
        }
      }
    }

    if (def.type === "F07" && values.system === "other" && !String(values.systemOther ?? "").trim()) {
      next.systemOther = "กรุณาระบุชื่อระบบที่ต้องการแก้ไข";
    }
    if (def.type === "F10") {
      const selectedItems = Array.isArray(values.items) ? values.items : [];
      const needsItemDetail = selectedItems.some((item) => item === "rdp" || item === "web_online" || item === "other");
      if (needsItemDetail && !String(values.itemsDetail ?? "").trim()) {
        next.itemsDetail = "กรุณาระบุชื่อระบบหรือรายละเอียดของรายการที่เลือก";
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

    return next;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    setErrors({});

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setSubmitting(false);
      setErrors(clientErrors);
      focusFirstError(clientErrors);
      setFormError("กรุณาตรวจสอบข้อมูลที่มีเครื่องหมายเตือนก่อนส่งคำร้อง");
      return;
    }
    if (fileError) {
      setSubmitting(false);
      setFormError(fileError);
      requestAnimationFrame(() => {
        const target = document.getElementById("ticket-files");
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target?.focus({ preventScroll: true });
      });
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
      const fieldErrors = body.fields ?? {};
      setErrors(fieldErrors);
      focusFirstError(fieldErrors);
      setFormError("กรอกข้อมูลไม่ครบ กรุณาตรวจสอบช่องที่มีข้อความแจ้งเตือน");
    } else {
      setFormError("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  return (
    <>
      <form onSubmit={submit} noValidate aria-busy={submitting || undefined} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      {submitting && <span role="status" className="sr-only">กำลังส่งคำร้อง กรุณารอสักครู่</span>}
      <div className="card min-w-0 overflow-hidden">
      {formError && Object.keys(errors).length === 0 && (
        <p
          role="alert"
          className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 sm:px-6"
        >
          {formError}
        </p>
      )}

      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:px-6"
        >
          <p className="font-medium">พบข้อมูลที่ต้องแก้ไข {Object.keys(errors).length} รายการ</p>
          <ul className="mt-1 list-inside list-disc">
            {Object.entries(errors).map(([key, message]) => (
              <li key={key}>
                <a
                  className="rounded-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                  href={`#${key}`}
                  onClick={() => focusHashTarget(key)}
                >
                  {fieldLabel(def, key)}: {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isEdit && (
        <p className="border-b border-border bg-surface-subtle/70 px-5 py-3 text-xs text-muted sm:px-6">
          ช่องที่มีเครื่องหมาย <span className="text-red-500">*</span> จำเป็นต้องกรอก
        </p>
      )}

      <nav aria-label="หัวข้อในแบบฟอร์ม" className="border-b border-border bg-card px-5 py-3 sm:px-6">
        <ol className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto">
          {formSections.map((section) => (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                className={cn(
                  "group flex h-9 items-center gap-2 rounded-md border px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1",
                  section.hasError
                    ? "border-red-200 bg-red-50/60 text-red-700 hover:border-red-300 hover:bg-red-50"
                    : activeSectionId === section.id
                      ? "border-brand/30 bg-brand-weak/60 font-medium text-brand hover:border-brand/50"
                    : "border-transparent text-muted hover:border-border hover:bg-surface-subtle hover:text-slate-900 focus-visible:border-brand",
                )}
                onClick={() => focusHashTarget(section.id)}
                aria-current={activeSectionId === section.id ? "location" : undefined}
              >
                <span className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                  section.hasError ? "bg-red-100 text-red-700" : "bg-brand-weak text-brand",
                )}>
                  {section.number}
                </span>
                <span className="max-w-48 truncate" title={section.label}>{section.label}</span>
                {section.hasError && <span className="sr-only">มีช่องที่ต้องแก้ไข</span>}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {def.sections.map((section, i) => {
        const isRequester = section.title.includes("ผู้ขอ");
        const hasServiceSite = section.fields.some((f) => f.key === "serviceSiteCode");
        const hasLoanFields = section.fields.some((f) => f.key === "deviceType");
        const workFunctionPairs = def.type === "F13" ? section.fields.some((f) => f.key === "workFunction1") : false;
        return (
          <Section
            key={section.title}
            id={`ticket-section-${i + 1}`}
            n={i + 1}
            title={section.title}
            description={isRequester ? "ข้อมูลตั้งต้นจากโปรไฟล์ สามารถแก้ไขให้ถูกต้องได้" : undefined}
          >
            {autoSiteName && hasServiceSite && (
              <p className="mb-4 flex items-start gap-2 border-l-2 border-brand pl-3 text-xs text-slate-600">
                <MapPin size={13} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  ระบบเลือกบริษัท <span className="font-medium text-slate-800">{autoSiteName}</span> จากเครือข่ายปัจจุบัน คุณสามารถเปลี่ยนได้
                </span>
              </p>
            )}
            {workFunctionPairs ? (
              <WorkFunctionPairs
                section={section}
                values={values}
                errors={errors}
                disabled={submitting}
                onChange={(key, val) => set(key, val)}
              />
            ) : (
              <div className="grid gap-y-5">
                {section.fields.map((f) => (
                  <Field
                    key={f.key}
                    f={f}
                    sites={sites}
                    depts={deptOptions}
                    departmentsLoading={Boolean(serviceSite) && departmentsLoadedFor !== serviceSite}
                    value={values[f.key]}
                    error={errors[f.key]}
                    disabled={submitting}
                    onChange={(val) => set(f.key, val)}
                    onToggle={(opt) => toggle(f.key, opt)}
                  />
                ))}
              </div>
            )}
            {showLoanCheck && hasLoanFields && (
              <LoanAvailabilityHint
                category={(values.deviceType as string) ?? ""}
                from={(values.borrowDate as string) ?? ""}
                to={(values.returnDate as string) ?? ""}
              />
            )}
          </Section>
        );
      })}

      {showApprovals && def.approvals && (
        <Section
          id={`ticket-section-${approvalsStep}`}
          n={approvalsStep}
          title="ผู้ตรวจสอบ / อนุมัติ"
          description="เลือกรายชื่อตามลำดับการดำเนินงานของคำร้อง"
        >
          <div className="grid gap-y-5">
            {def.approvals.map((step) => {
              const opts = approvers.filter((a) => a.type === step.approverType);
              return (
                <label key={step.fieldKey} className="block max-w-md">
                  <span className="text-sm font-medium text-slate-700">
                    {step.label} <span className="text-red-500">*</span>
                  </span>
                  <select
                    value={(values[step.fieldKey] as string) ?? ""}
                    onChange={(e) => set(step.fieldKey, e.target.value)}
                    disabled={submitting}
                    className={inputCls(errors[step.fieldKey])}
                    required
                    aria-invalid={errors[step.fieldKey] ? "true" : "false"}
                    aria-describedby={errors[step.fieldKey] ? `${step.fieldKey}-error` : undefined}
                    id={step.fieldKey}
                  >
                    <option value="">-- เลือก --</option>
                    {opts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {errors[step.fieldKey] && (
                    <ErrText id={`${step.fieldKey}-error`}>{errors[step.fieldKey]}</ErrText>
                  )}
                </label>
              );
            })}
          </div>
        </Section>
      )}

      <Section
        id={`ticket-section-${extraStep}`}
        n={extraStep}
        title="ข้อมูลเพิ่มเติม"
        subtitle="ไม่บังคับ"
        description="เพิ่มบริบทหรือเอกสารที่ช่วยให้ IT ตรวจสอบได้เร็วขึ้น"
      >
        <div className="grid gap-x-6 gap-y-5 lg:grid-cols-2">
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-slate-700">รายละเอียดเพิ่มเติม</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
              rows={2}
              aria-describedby="ticket-note-hint"
              placeholder="เช่น ช่วงเวลาที่สะดวกให้ติดต่อ หรือบริบทของงาน"
              className={inputCls()}
            />
            <span id="ticket-note-hint" className="mt-1 block text-right text-[11px] text-slate-400" aria-live="polite">
              {note.length.toLocaleString("th-TH")} ตัวอักษร
            </span>
          </label>

          {!isEdit && (
            <div>
              <span className="text-sm font-medium text-slate-700">ไฟล์แนบ</span>
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setFileDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  setFileDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  const nextTarget = event.relatedTarget;
                  if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                    setFileDragActive(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setFileDragActive(false);
                  addFiles(Array.from(event.dataTransfer.files));
                }}
                className={cn(
                  "relative mt-1 rounded-md border border-dashed px-4 py-5 text-center transition-colors",
                  fileError
                    ? "border-red-400 bg-red-50/40"
                    : fileDragActive
                      ? "border-brand bg-brand-weak"
                      : "border-border-strong bg-surface-subtle/50 hover:border-brand/50 hover:bg-brand-weak/30",
                )}
              >
                <input
                  id="ticket-files"
                  type="file"
                  multiple
                  accept={ACCEPTED_FILE_TYPES}
                  disabled={submitting}
                  aria-invalid={fileError ? "true" : "false"}
                  aria-describedby={fileError ? "ticket-files-help ticket-files-error" : "ticket-files-help"}
                  onChange={(event) => {
                    addFiles(Array.from(event.target.files ?? []));
                    event.currentTarget.value = "";
                  }}
                  className="peer sr-only"
                />
                <label
                  htmlFor="ticket-files"
                  className={cn(
                    "mx-auto flex max-w-sm flex-col items-center rounded px-2 py-1 outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand/35 peer-focus-visible:ring-offset-2",
                    submitting ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  )}
                >
                  <UploadCloud size={24} strokeWidth={1.6} className="text-brand" aria-hidden="true" />
                  <span className="mt-2 text-sm font-medium text-slate-800">
                    {fileDragActive ? "วางไฟล์เพื่อแนบ" : "ลากไฟล์มาวาง หรือเลือกไฟล์"}
                  </span>
                  <span className="mt-0.5 text-xs text-slate-400">แนบได้อีก {Math.max(0, 5 - files.length)} ไฟล์</span>
                </label>
              </div>
              <span id="ticket-files-help" className="mt-1 block text-xs text-slate-400">
                สูงสุด 5 ไฟล์ · PDF, รูปภาพ, Office, ข้อความ หรือไฟล์บีบอัด
              </span>
              {fileError && <ErrText id="ticket-files-error">{fileError}</ErrText>}
              {files.length > 0 && (
                <ul aria-live="polite" className="mt-2 divide-y divide-border border-y border-border text-xs text-slate-600">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center gap-2 py-2">
                      <Paperclip size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
                      <span className="shrink-0 text-slate-400">{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFiles((current) => current.filter((_, i) => i !== index));
                          setFileError(null);
                        }}
                        aria-label={`ลบไฟล์ ${file.name}`}
                        disabled={submitting}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="space-y-3">
            {!isEdit && (
              <>
                <label htmlFor="ticket-notify-email" className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  id="ticket-notify-email"
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  disabled={submitting}
                  aria-describedby="ticket-notify-email-help"
                  className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                />
                รับสถานะแจ้งเตือนทางอีเมล
                </label>
                <p id="ticket-notify-email-help" className="pl-6 text-xs leading-relaxed text-slate-400">
                  ระบบจะแจ้งเมื่อรับคำร้อง แจ้งดำเนินการเสร็จ หรือปิดงาน ไปยังอีเมลของผู้ขอ
                </p>
              </>
            )}
            <p className="border-t border-border pt-3 text-sm text-muted">
              ผู้ส่งคำร้อง <span className="font-medium text-slate-800">{signName}</span>
            </p>
          </div>
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-white/95 px-5 py-3.5 backdrop-blur sm:px-6 xl:hidden">
        <p className="text-xs text-muted">
          {isEdit ? "การแก้ไขจะถูกบันทึกไว้ในประวัติคำร้อง" : "ตรวจสอบข้อมูลให้ถูกต้องก่อนส่งคำร้อง"}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" disabled={submitting} onClick={requestCancel}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? "บันทึกการแก้ไข" : "ส่งคำร้อง"}
          </Button>
        </div>
      </div>
      </div>

      <div className="xl:hidden">
        <TicketFormSummary
          def={def}
          values={values}
          note={note}
          files={files}
          errors={errors}
          fileError={fileError}
          sites={sites}
          departments={deptOptions}
          approvers={approvers}
          showApprovals={showApprovals}
          showFiles={!isEdit}
          compact
        />
      </div>

      <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] min-w-0 self-start overflow-y-auto xl:block">
        <TicketFormSummary
          def={def}
          values={values}
          note={note}
          files={files}
          errors={errors}
          fileError={fileError}
          sites={sites}
          departments={deptOptions}
          approvers={approvers}
          showApprovals={showApprovals}
          showFiles={!isEdit}
          actions={
            <div className="space-y-2">
              <p className="pb-1 text-[11px] leading-4 text-muted">
                {isEdit ? "การแก้ไขจะถูกบันทึกไว้ในประวัติคำร้อง" : "ตรวจสอบข้อมูลให้ถูกต้องก่อนส่งคำร้อง"}
              </p>
              <Button type="submit" className="w-full" loading={submitting}>
                {isEdit ? "บันทึกการแก้ไข" : "ส่งคำร้อง"}
              </Button>
              <Button type="button" variant="secondary" className="w-full" disabled={submitting} onClick={requestCancel}>
                ยกเลิก
              </Button>
            </div>
          }
        />
      </aside>
      </form>
      <ConfirmDialog
        open={cancelOpen}
        title="ยกเลิกการกรอกคำร้อง?"
        description="ข้อมูลที่กรอกไว้จะไม่ถูกบันทึก หากออกจากหน้านี้"
        confirmLabel="ออกจากฟอร์ม"
        cancelLabel="อยู่ต่อ"
        tone="danger"
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => router.back()}
      />
    </>
  );
}

function inputCls(error?: string) {
  // bg-surface-subtle (not bg-card/white) so a field reads as a distinct
  // tappable box against the white section card instead of blending into
  // it — plain white-on-white with only a hairline border was hard to scan
  // on forms this dense. Focus lifts it to white (bg-card) to draw the eye.
  return cn(
    "mt-1 min-h-10 w-full rounded-md border bg-surface-subtle px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:bg-card focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted",
    error ? "border-red-400" : "border-border-strong",
  );
}

function ErrText({ children, id }: { children: React.ReactNode; id?: string }) {
  return <span id={id} className="mt-1 block text-xs text-red-600">{children}</span>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** A numbered step in the form. */
function Section({
  id,
  n,
  title,
  subtitle,
  description,
  children,
}: {
  id: string;
  n: number;
  title: string;
  subtitle?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      id={id}
      tabIndex={-1}
      className="scroll-mt-32 border-b border-border outline-none focus:ring-2 focus:ring-inset focus:ring-brand/20"
    >
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3 border-b border-border bg-surface-subtle/70 px-5 py-3.5 sm:px-6">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-weak text-xs font-semibold tabular-nums text-brand">
          {String(n).padStart(2, "0")}
        </span>
        <div className="min-w-0 pt-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
            {subtitle && <span className="text-[11px] text-slate-400">{subtitle}</span>}
          </div>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
        </div>
      </div>
      <div className="min-w-0 px-5 py-5 sm:px-6 lg:py-6">{children}</div>
    </fieldset>
  );
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

function focusHashTarget(id: string) {
  requestAnimationFrame(() => {
    const target = document.getElementById(id);
    if (!target) return;
    target.focus({ preventScroll: true });
  });
}

function focusFirstError(fields: Record<string, string>) {
  const firstKey = Object.keys(fields)[0];
  if (!firstKey) return;
  requestAnimationFrame(() => {
    document.getElementById(firstKey)?.focus();
  });
}

function compactSectionTitle(title: string) {
  if (title.includes("ผู้ขอ")) return "ข้อมูลผู้ขอ";
  if (title.includes("ใช้งาน/ยกเลิก")) return "รายละเอียดการใช้งาน";
  if (title.includes("แก้ไขข้อมูลระบบ")) return "รายละเอียดการแก้ไข";
  if (title.includes("รายการ")) return "รายละเอียดรายการ";
  return title;
}

/**
 * F13-only: ฟังก์ชั่นงานที่ N + its User Level select rendered as one boxed
 * row instead of two independent fields in the shared 2/3-column grid — that
 * grid's column count changes by breakpoint, which drifted the "which level
 * goes with which function" pairing out of alignment (reported by the user
 * as confusing). Only slot 1 is required, so slots 2-5 stay hidden behind
 * "+ เพิ่มฟังก์ชั่นงาน" until needed (or already filled, in edit mode).
 */
function WorkFunctionPairs({
  section,
  values,
  errors,
  disabled,
  onChange,
}: {
  section: SectionDef;
  values: Values;
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (key: string, val: string) => void;
}) {
  const fieldByKey = (key: string) => section.fields.find((f) => f.key === key)!;
  const reqNameEn = fieldByKey("reqNameEn");
  const slots = [1, 2, 3, 4, 5] as const;

  const [visibleCount, setVisibleCount] = useState(() =>
    Math.max(
      1,
      slots.reduce((n, i) => (String(values[`workFunction${i}`] ?? "").trim() ? i : n), 1),
    ),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-y-5">
        <Field
          f={reqNameEn}
          sites={[]}
          depts={[]}
          value={values[reqNameEn.key]}
          error={errors[reqNameEn.key]}
          disabled={disabled}
          onChange={(v) => onChange(reqNameEn.key, v)}
          onToggle={() => {}}
        />
      </div>

      <div className="space-y-3">
        {slots.slice(0, visibleCount).map((n) => {
          const wf = fieldByKey(`workFunction${n}`);
          const ul = fieldByKey(`userLevel${n}`);
          return (
            <div key={n} className="rounded-md border border-border-strong bg-surface-subtle/40 p-4">
              <p className="mb-3 text-xs font-semibold text-slate-600">
                ฟังก์ชั่นงานที่ {n} {n === 1 && <span className="text-red-500">*</span>}
              </p>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field
                  f={{ ...wf, label: "เลือกฟังก์ชั่นงาน", help: undefined }}
                  sites={[]}
                  depts={[]}
                  value={values[wf.key]}
                  error={errors[wf.key]}
                  disabled={disabled}
                  onChange={(v) => onChange(wf.key, v)}
                  onToggle={() => {}}
                />
                <Field
                  f={{ ...ul, label: "User Level", help: undefined }}
                  sites={[]}
                  depts={[]}
                  value={values[ul.key]}
                  error={errors[ul.key]}
                  disabled={disabled}
                  onChange={(v) => onChange(ul.key, v)}
                  onToggle={() => {}}
                />
              </div>
              {typeof values[wf.key] === "string" && values[wf.key] && (
                <SoftproGuidelineHint workFunction={values[wf.key] as string} />
              )}
              {n === 1 && wf.help && <p className="mt-3 text-xs leading-relaxed text-slate-400">{wf.help}</p>}
            </div>
          );
        })}
      </div>

      {visibleCount < slots.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => Math.min(slots.length, c + 1))}
          disabled={disabled}
          className="text-sm font-medium text-brand hover:underline disabled:pointer-events-none disabled:opacity-55"
        >
          + เพิ่มฟังก์ชั่นงานอีกรายการ ({visibleCount}/{slots.length})
        </button>
      )}
    </div>
  );
}

/**
 * F13-only: shows which Softpro screens a selected ฟังก์ชั่นงาน grants, from
 * the static SOFTPRO_GUIDELINE lookup (built from IT's own workbook). That
 * source only cleanly tags ~180 of its ~680 screens to a specific work
 * function — the rest sit in generic "รายงาน"/"งานพิเศษ" buckets — so this is
 * a helpful starting point, not the full picture; said so explicitly rather
 * than implying completeness, and always points back at the full download.
 */
function SoftproGuidelineHint({ workFunction }: { workFunction: string }) {
  const raw = SOFTPRO_GUIDELINE[workFunction];
  // multiple screen codes can share the same displayed name+module (e.g. the
  // same "สถานะระบบ" screen re-used across PR/IC/WG) — collapse those since
  // the code column (the only thing that distinguished them) is now hidden.
  const screens = raw
    ? Array.from(new Map(raw.map((s) => [`${s.name}|${s.module}`, s])).values())
    : raw;
  return (
    <div className="mt-3 rounded-md border border-border bg-card p-3">
      <p className="text-xs font-semibold text-slate-600">
        หน้าจอ Softpro ที่เกี่ยวข้อง{screens?.length ? ` (${screens.length} รายการ)` : ""}
      </p>
      {screens && screens.length > 0 ? (
        <div className="mt-2 max-h-48 overflow-y-auto rounded border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-subtle text-[11px] text-muted">
              <tr>
                <th className="px-2 py-1.5 font-medium">ชื่อหน้าจอ</th>
                <th className="px-2 py-1.5 font-medium">โมดูล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {screens.map((s, i) => (
                <tr key={`${s.name}-${s.module}-${i}`}>
                  <td className="px-2 py-1 text-slate-700">{s.name || "—"}</td>
                  <td className="px-2 py-1 text-slate-500">{s.module || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          ยังไม่มีรายชื่อหน้าจออ้างอิงสำหรับฟังก์ชั่นงานนี้ในไฟล์ที่ IT ให้มา — ดูไฟล์เต็มจากปุ่ม “รายชื่อโค้ดหน้าจอ Softpro” ด้านบน หรือระบุในหมายเหตุให้ IT ช่วยตรวจสอบ
        </p>
      )}
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
        รายการนี้เป็นข้อมูลเบื้องต้นจากไฟล์ของ IT อาจไม่ครบทุกหน้าจอ — IT จะตรวจสอบและยืนยันรายการจริงให้ตอนพิจารณาคำร้อง
      </p>
    </div>
  );
}

function Field({
  f,
  sites,
  depts,
  departmentsLoading = false,
  value,
  error,
  disabled,
  onChange,
  onToggle,
}: {
  f: FieldDef;
  sites: { code: string; name: string }[];
  depts: { id: number; name: string }[];
  departmentsLoading?: boolean;
  value: string | string[] | undefined;
  error?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  onToggle: (opt: string) => void;
}) {
  // single-column form (docs/ui-foundation.md: side-by-side fields made the
  // eye jump around a dense form) — colSpan 1 now just caps a short field's
  // width instead of sharing a row with another field, so a phone number or
  // a select doesn't stretch edge-to-edge on a wide screen.
  const span = f.colSpan === 2 ? "" : "max-w-md";
  const helpId = f.help ? `${f.key}-help` : undefined;
  const errorId = error ? `${f.key}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const loadingDepartments = f.key === "reqDept" && departmentsLoading;

  if (f.type === "checkboxes") {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div
        className={cn("w-full", span)}
        role="group"
        aria-labelledby={`${f.key}-label`}
        aria-describedby={describedBy}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span id={`${f.key}-label`} className="text-sm font-medium text-slate-700">
            {f.label} {f.required && <span className="text-red-500">*</span>}
          </span>
          <span className="text-xs text-slate-400">เลือกได้มากกว่า 1 รายการ</span>
          {arr.length > 0 && (
            <span aria-live="polite" className="text-xs font-medium text-brand">
              เลือกแล้ว {arr.length} รายการ
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(f.options ?? []).map((o, idx) => {
            const on = arr.includes(o.value);
            return (
              <label
                key={o.value}
                className={cn(
                  cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors select-none focus-within:ring-2 focus-within:ring-brand/30 focus-within:ring-offset-1",
                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  ),
                  on
                    ? "border-brand bg-brand-weak font-medium text-brand"
                    : "border-border-strong bg-surface-subtle text-slate-600 hover:border-brand/40 hover:bg-brand-weak/40",
                )}
              >
                <input
                  id={idx === 0 ? f.key : `${f.key}-${o.value}`}
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  disabled={disabled}
                  onChange={() => onToggle(o.value)}
                  aria-invalid={error ? ("true" as const) : ("false" as const)}
                />
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    on ? "border-brand bg-brand text-white" : "border-slate-300 bg-white",
                  )}
                >
                  {on && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                </span>
                {o.label}
              </label>
            );
          })}
        </div>
        {f.help && <span id={helpId} className="mt-1 block text-xs text-slate-400">{f.help}</span>}
        {error && <ErrText id={errorId}>{error}</ErrText>}
      </div>
    );
  }

  const v = typeof value === "string" ? value : "";
  const autoComplete =
    f.key === "reqName"
      ? "name"
      : f.key === "reqPhone"
        ? "tel"
        : f.key === "reqEmail"
          ? "email"
          : f.key === "reqPosition"
            ? "organization-title"
            : undefined;
  const inputMode = f.type === "tel" ? "tel" : f.type === "number" ? "numeric" : f.type === "email" ? "email" : undefined;
  const common = {
    id: f.key,
    className: inputCls(error),
    value: v,
    required: f.required,
    disabled,
    "aria-invalid": error ? ("true" as const) : ("false" as const),
    "aria-describedby": describedBy,
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
        <select {...common} disabled={disabled || loadingDepartments} aria-busy={loadingDepartments || undefined}>
          <option value="">{loadingDepartments ? "กำลังโหลดฝ่าย/แผนก..." : "-- เลือก --"}</option>
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
          autoComplete={autoComplete}
          inputMode={inputMode}
          min={f.type === "number" ? 0 : undefined}
          step={f.type === "number" ? 1 : undefined}
          {...common}
        />
      )}
      {loadingDepartments && <span role="status" className="mt-1 block text-xs text-muted">กำลังโหลดฝ่าย/แผนกตามบริษัทที่เลือก</span>}
      {f.help && <span id={helpId} className="mt-1 block text-xs text-slate-400">{f.help}</span>}
      {error && <ErrText id={errorId}>{error}</ErrText>}
    </label>
  );
}
