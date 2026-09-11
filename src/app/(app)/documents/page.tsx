import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { FORM_DEFS } from "@/lib/form-defs";
import { listFormFiles } from "@/lib/form-files";
import { docThumb } from "@/lib/doc-thumbs";
import { titleFor, REGENERATED, docUrls } from "@/lib/doc-meta";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import {
  DatabaseZap,
  Download,
  Eye,
  FileText,
  KeyRound,
  Laptop,
  MonitorCog,
  PackageCheck,
  ShieldCheck,
  Video,
} from "lucide-react";

// real names/descriptions not confirmed yet — flagged in the UI instead of
// left blank so it's clear the card is incomplete, not broken
const PLACEHOLDER_NAME = new Set(["F08", "F15", "F16"]);

// one-line "ใช้สำหรับ…" per form
const DESC: Record<string, string> = {
  F02: "บันทึกการส่งมอบเครื่องคอมพิวเตอร์ให้ผู้รับ",
  F03: "ยืมโน้ตบุ๊ก โปรเจกเตอร์ จอ หรืออุปกรณ์เสริมชั่วคราว",
  F06: "แจ้งปัญหาคอมพิวเตอร์ โปรแกรม เครือข่าย หรือขอรับบริการ IT",
  F07: "ขอแก้ไข/เปลี่ยนแปลงข้อมูลในระบบงาน (ERP Softpro ฯลฯ)",
  F10: "ขอเปิด/ยกเลิกสิทธิ์เข้าใช้งานระบบ IT (User, ไดรฟ์แชร์, เครื่องปริ้น…)",
  F11: "ขอเปลี่ยน/รีเซ็ตรหัสผ่านคอมพิวเตอร์ อีเมล หรือระบบงาน",
  F12: "ขอเตรียมระบบประชุม/อบรมออนไลน์ (Teams / Zoom / Google Meet)",
};

// docs/ui-foundation.md: category icons stay monochrome — same icon set as
// the sidebar/home cards, but one brand tint instead of a color per form.
const ICON: Record<string, LucideIcon> = {
  F06: MonitorCog,
  F11: KeyRound,
  F10: ShieldCheck,
  F03: Laptop,
  F12: Video,
  F07: DatabaseZap,
  F02: PackageCheck,
};

function humanSize(n: number) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const files = listFormFiles();
  const appCodes = new Set(Object.keys(FORM_DEFS));
  const forms = files.filter((f) => appCodes.has(f.code));
  const others = files.filter((f) => !appCodes.has(f.code));

  return (
    <div className="space-y-8">
      <PageHeader
        title="แบบฟอร์มเอกสาร"
        subtitle="ดาวน์โหลดแบบฟอร์มกระดาษ (PDF) สำหรับกรอกด้วยมือหรือขอลายเซ็น"
      />

      {files.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="ยังไม่มีเอกสารให้ดาวน์โหลด"
          hint="ให้ IT วางไฟล์ PDF ไว้ที่ public/forms/"
        />
      ) : (
        <div className="space-y-9">
          {forms.length > 0 && <DocGroup heading="แบบฟอร์มขอรับบริการ IT" items={forms} />}
          {others.length > 0 && <DocGroup heading="เอกสารอื่น" items={others} />}
        </div>
      )}
    </div>
  );
}

function DocGroup({
  heading,
  items,
}: {
  heading: string;
  items: { code: string; file: string; bytes: number }[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">{heading}</h2>
        <span className="text-[11px] text-slate-300">· {items.length} รายการ</span>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((f) => {
          const regenerated = REGENERATED.has(f.code);
          // served through an API route (not the raw /forms/<thai filename>.pdf
          // path) so the browser gets a proper RFC 5987 filename header instead
          // of guessing one from a percent-encoded Thai URL — that guess is what
          // was showing up as a garbled tab title. Forms with a broken source
          // PDF go to a regenerated blank copy instead (see doc-meta.ts).
          const { view: viewUrl, download: downloadUrl } = docUrls(f.code);
          const Icon = ICON[f.code] ?? FileText;
          const thumb = docThumb(f.code);
          return (
            <div key={f.file} className="card group relative flex items-start gap-3 p-4 transition hover:shadow-md">
              {/* compact, equal-weight action cluster — avoids one loud button next to an empty-looking one */}
              <div className="absolute top-3 right-3 flex gap-1">
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`ดูตัวอย่าง ${titleFor(f.code)}`}
                  title="ดูตัวอย่าง"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border-strong text-slate-500 transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand"
                >
                  <Eye size={15} aria-hidden="true" />
                </a>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`ดาวน์โหลด ${titleFor(f.code)}`}
                  title="ดาวน์โหลด"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border-strong text-slate-500 transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand"
                >
                  <Download size={15} aria-hidden="true" />
                </a>
              </div>

              {thumb ? (
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-slate-50 ring-1 ring-border">
                  <Image src={thumb} alt="" width={44} height={44} className="h-full w-full object-cover" />
                </span>
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-weak text-brand">
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
              )}

              <a href={viewUrl} target="_blank" rel="noreferrer" className="group/link min-w-0 flex-1 pr-16">
                <span className="block text-[0.95rem] leading-snug font-bold text-slate-900 group-hover/link:text-brand">
                  {titleFor(f.code)}
                </span>
                {DESC[f.code] ? (
                  <span className="mt-1 block text-xs leading-relaxed text-muted">{DESC[f.code]}</span>
                ) : PLACEHOLDER_NAME.has(f.code) ? (
                  <span className="mt-1 block text-xs leading-relaxed text-amber-600">
                    ชื่อและรายละเอียดจริงยังไม่ยืนยัน — รอ IT ปรับปรุง
                  </span>
                ) : null}
                {regenerated && (
                  <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                    ไฟล์ต้นฉบับตัวอักษรซ้อนกัน — ใช้แบบฟอร์มเปล่าที่สร้างใหม่แทน
                  </span>
                )}
                <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand">
                    {f.code}
                  </span>
                  {regenerated ? (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                      สร้างใหม่จากระบบ
                    </span>
                  ) : (
                    f.bytes > 0 && (
                      <span className="text-[11px] text-slate-400">PDF · {humanSize(f.bytes)}</span>
                    )
                  )}
                  {PLACEHOLDER_NAME.has(f.code) && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                      ชื่อชั่วคราว
                    </span>
                  )}
                </span>
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
