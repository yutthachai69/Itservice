"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldDef } from "@/lib/form-defs";
import { ASSET_SECTIONS } from "@/lib/asset-def";
import { cn } from "@/lib/ui";

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

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setErrors({});
    const url = mode === "edit" ? `/api/assets/${assetId}` : "/api/assets";
    const res = await fetch(url, {
      method: mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: values }),
    });
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
    <form onSubmit={submit} className="mt-5 card overflow-hidden">
      {ASSET_SECTIONS.map((section) => (
        <fieldset key={section.title} className="border-b border-border px-5 py-6 sm:px-7">
          <legend className="px-0 text-base font-semibold text-slate-900">{section.title}</legend>
          <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
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
        </fieldset>
      ))}

      {formError && (
        <p className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 sm:px-7">{formError}</p>
      )}

      <div className="sticky bottom-0 z-10 flex flex-wrap gap-3 border-t border-border bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
        <button
          disabled={busy}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong disabled:opacity-60"
        >
          {busy ? "กำลังบันทึก..." : mode === "edit" ? "บันทึกการแก้ไข" : "เพิ่มเครื่อง"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function cls(err?: string) {
  return cn(
    "mt-1 min-h-10 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15",
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
  const span = f.colSpan === 2 ? "sm:col-span-2" : "";
  const common = {
    className: cls(error),
    value,
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
          {...common}
        />
      )}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
