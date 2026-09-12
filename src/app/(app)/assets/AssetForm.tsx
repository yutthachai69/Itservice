"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef } from "@/lib/form-defs";
import { ASSET_SECTIONS } from "@/lib/asset-def";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/ui";

const SECTION_TITLES: Record<string, string> = {
  "ผู้เพิ่ม / ผู้ใช้งาน": "ข้อมูลผู้ใช้งาน",
  System: "ระบบและสเปกเครื่อง",
  Network: "เครือข่าย",
  "Monitor / UPS / Keyboard / Mouse": "อุปกรณ์ต่อพ่วง",
  "Machine Age / Warranty": "อายุเครื่องและการรับประกัน",
  Permission: "สิทธิ์การใช้งาน",
  "อื่นๆ": "ข้อมูลอื่น",
};

export function AssetForm({
  mode,
  assetId,
  sites,
  initial,
}: {
  mode: "create" | "edit";
  assetId?: number;
  sites: { code: string; name: string }[];
  initial: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!firstInvalid) return;
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalid.focus({ preventScroll: true });
  }, [errors]);

  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((prev) => {
      if (!(k in prev)) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
    setFormError(null);
  };

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  const allFields = ASSET_SECTIONS.flatMap((section) => section.fields);
  const requiredFields = allFields.filter((field) => field.required);
  const requiredFilled = requiredFields.filter((field) => values[field.key]?.trim()).length;

  useEffect(() => {
    if (!isDirty || busy) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty, busy]);

  const requestCancel = () => {
    if (busy) return;
    if (isDirty) setCancelOpen(true);
    else router.back();
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError(null);
    setErrors({});
    const clientErrors: Record<string, string> = {};
    for (const field of allFields) {
      if (field.required && !values[field.key]?.trim()) {
        clientErrors[field.key] = "กรุณากรอกข้อมูล";
      }
    }
    if (Object.keys(clientErrors).length > 0) {
      setBusy(false);
      setErrors(clientErrors);
      setFormError("กรอกข้อมูลไม่ครบ กรุณาตรวจสอบช่องที่มีข้อความแจ้งเตือน");
      return;
    }
    const url = mode === "edit" ? `/api/assets/${assetId}` : "/api/assets";
    let res: Response;
    try {
      res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values }),
      });
    } catch {
      setBusy(false);
      setFormError("เชื่อมต่อระบบไม่สำเร็จ กรุณาตรวจสอบเครือข่ายแล้วลองใหม่อีกครั้ง");
      return;
    }
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      const id = mode === "edit" ? assetId : body.id;
      router.push(`/assets/${id}`);
      router.refresh();
      return;
    }
    setBusy(false);
    if (res.status === 422) {
      const b = await res.json();
      setErrors(b.fields ?? {});
      setFormError("กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง");
    } else if (res.status === 403) {
      setFormError("เฉพาะเจ้าหน้าที่ IT เท่านั้น");
    } else {
      setFormError("บันทึกไม่สำเร็จ");
    }
  }

  return (
    <>
      <nav aria-label="ไปยังหมวดข้อมูลทะเบียนเครื่อง" className="mb-3 card overflow-hidden p-3 sm:p-4">
        <p className="mb-2 text-xs font-semibold text-slate-700">หมวดข้อมูล</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {ASSET_SECTIONS.map((section, index) => (
            <a
              key={section.title}
              href={`#asset-section-${index + 1}`}
              className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-brand/40 hover:bg-brand-weak/30 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
            >
              {String(index + 1).padStart(2, "0")} · {SECTION_TITLES[section.title] ?? section.title}
            </a>
          ))}
        </div>
      </nav>
      <form onSubmit={submit} aria-busy={busy || undefined} className="card overflow-hidden">
      {busy && <span role="status" className="sr-only">กำลังบันทึกข้อมูลทะเบียนเครื่อง กรุณารอสักครู่</span>}
      {formError && (
        <p role="alert" aria-live="assertive" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 sm:px-7">{formError}</p>
      )}
      {ASSET_SECTIONS.map((section, index) => (
        <fieldset id={`asset-section-${index + 1}`} key={section.title} disabled={busy} className="scroll-mt-28 border-b border-border">
          <legend className="sr-only">{SECTION_TITLES[section.title] ?? section.title}</legend>
          <div className="grid lg:grid-cols-[14rem_minmax(0,1fr)]">
            <div className="bg-slate-50/80 px-5 py-4 lg:border-r lg:border-border lg:px-6 lg:py-6">
              <p className={cn(
                "text-[11px] font-semibold tracking-[0.14em]",
                section.fields.some((field) => Boolean(errors[field.key])) ? "text-red-700" : "text-brand",
              )}>
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-1 text-sm font-semibold text-slate-900">
                {SECTION_TITLES[section.title] ?? section.title}
                {section.fields.some((field) => Boolean(errors[field.key])) && (
                  <span className="sr-only">มีช่องที่ต้องแก้ไข</span>
                )}
              </h2>
              <p className="mt-1 text-xs text-slate-400">{section.fields.length} ช่องข้อมูล</p>
            </div>
            <div className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3 xl:px-7 xl:py-6">
              {section.fields.map((f) => (
                <AField
                  key={f.key}
                  f={f}
                  sites={sites}
                  value={values[f.key] ?? ""}
                  error={errors[f.key]}
                  onChange={(v) => set(f.key, v)}
                />
              ))}
            </div>
          </div>
        </fieldset>
      ))}

      <div className="sticky bottom-0 z-10 flex flex-wrap items-start justify-between gap-3 border-t border-border bg-white/95 px-5 py-4 backdrop-blur sm:items-center sm:px-7">
        <div className="space-y-0.5 text-xs text-muted">
          <p>ช่องที่มีเครื่องหมาย <span className="text-red-500">*</span> จำเป็นต้องกรอก</p>
          <p className={requiredFilled === requiredFields.length ? "font-medium text-emerald-700" : ""}>
            กรอกช่องบังคับแล้ว {requiredFilled.toLocaleString("th-TH")} / {requiredFields.length.toLocaleString("th-TH")}
          </p>
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <Button type="button" variant="ghost" disabled={busy} onClick={requestCancel}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={busy}>
            {mode === "edit" ? "บันทึกการแก้ไข" : "เพิ่มเครื่อง"}
          </Button>
        </div>
      </div>
      </form>
      <ConfirmDialog
        open={cancelOpen}
        title="ยกเลิกการแก้ไขทะเบียนเครื่อง?"
        description="ข้อมูลที่แก้ไว้จะไม่ถูกบันทึก หากออกจากหน้านี้"
        confirmLabel="ออกจากฟอร์ม"
        cancelLabel="อยู่ต่อ"
        tone="danger"
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => router.back()}
      />
    </>
  );
}

function cls(err?: string) {
  return cn(
    "mt-1 min-h-10 w-full rounded-md border bg-card px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted",
    err ? "border-red-400" : "border-border",
  );
}

function AField({
  f,
  sites,
  value,
  error,
  onChange,
}: {
  f: FieldDef;
  sites: { code: string; name: string }[];
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const span = f.colSpan === 2 ? "sm:col-span-2 xl:col-span-3" : "";
  const helpId = f.help ? `${f.key}-help` : undefined;
  const errorId = error ? `${f.key}-error` : undefined;
  const inputMode = f.key === "ipAddress" ? "decimal" : undefined;
  const spellCheck = ["assetNo", "serialNumber", "ipAddress", "lanMac", "wifiMac", "userDomain"].includes(f.key)
    ? false
    : undefined;
  const common = {
    id: f.key,
    className: cls(error),
    value,
    required: f.required,
    "aria-invalid": error ? "true" as const : "false" as const,
    "aria-describedby": [helpId, errorId].filter(Boolean).join(" ") || undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
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
          {(f.key === "siteCode"
            ? sites.map((s) => ({ value: s.code, label: s.name }))
            : (f.options ?? [])
          ).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={f.type === "date" ? "date" : "text"}
          maxLength={f.maxLength}
          inputMode={inputMode}
          spellCheck={spellCheck}
          {...common}
        />
      )}
      {f.help && <span id={helpId} className="mt-1 block text-xs text-slate-400">{f.help}</span>}
      {error && <span id={errorId} className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
