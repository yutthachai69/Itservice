import { getCurrentUser } from "@/lib/auth";
import { FORM_DEFS } from "@/lib/form-defs";
import { listFormFiles } from "@/lib/form-files";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Download, Eye, FileText } from "lucide-react";

const EXTRA_TITLES: Record<string, string> = {
  F01: "ทะเบียนประวัติเครื่องคอมพิวเตอร์",
  F08: "แบบฟอร์ม F08",
  F15: "แบบฟอร์ม F15",
  F16: "แบบฟอร์ม F16",
  ITR: "IT Request (ITR)",
};

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

const titleFor = (code: string) => FORM_DEFS[code]?.title ?? EXTRA_TITLES[code] ?? code;

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
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{heading}</h2>
      <div className="card overflow-hidden">
        {items.map((f) => {
          const url = `/forms/${encodeURIComponent(f.file)}`;
          return (
            <div
              key={f.file}
              className="group flex items-start gap-3.5 border-b border-border p-4 transition last:border-b-0 hover:bg-brand-weak/30"
            >
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 flex-1 items-start gap-3.5"
              >
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-weak text-brand transition group-hover:bg-brand group-hover:text-white">
                  <FileText size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand">
                      {f.code}
                    </span>
                    {f.bytes > 0 && (
                      <span className="text-[11px] text-slate-400">PDF · {humanSize(f.bytes)}</span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-slate-900">{titleFor(f.code)}</span>
                  {DESC[f.code] && (
                    <span className="mt-0.5 block text-xs leading-snug text-muted">{DESC[f.code]}</span>
                  )}
                </span>
              </a>

              <div className="flex shrink-0 flex-col gap-1.5">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand"
                >
                  <Eye size={14} aria-hidden="true" />
                  ดู
                </a>
                <a
                  href={url}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand"
                >
                  <Download size={14} aria-hidden="true" />
                  โหลด
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
