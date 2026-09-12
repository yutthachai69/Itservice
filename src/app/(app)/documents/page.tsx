import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { FORM_LIST } from "@/lib/form-defs";
import { listFormFiles, formPdfFile } from "@/lib/form-files";
import { docThumb } from "@/lib/doc-thumbs";
import { titleFor, DESC, SERVICE_ICON, REGENERATED, docUrls } from "@/lib/doc-meta";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { fmtDate, cn } from "@/lib/ui";
import {
  CircleCheck,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
} from "lucide-react";

// real names/descriptions not confirmed yet — flagged in the UI instead of
// left blank so it's clear the card is incomplete, not broken
const PLACEHOLDER_NAME = new Set(["F08", "F15", "F16"]);

// per the user's explicit direction this page keeps colored icon tiles for
// the "create online" cards — a deliberate exception to the app-wide
// monochrome-icon rule (docs/ui-foundation.md), scoped to this one section.
const CARD_TONES = [
  { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" },
  { bg: "bg-teal-50", text: "text-teal-600", ring: "ring-teal-100" },
  { bg: "bg-violet-50", text: "text-violet-600", ring: "ring-violet-100" },
  { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100" },
  { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
  { bg: "bg-rose-50", text: "text-rose-600", ring: "ring-rose-100" },
];

function humanSize(n: number) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

type SP = Record<string, string | undefined>;
type FilterKey = "all" | "forms" | "others" | "inprogress";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "forms", label: "สร้างคำร้องออนไลน์" },
  { key: "others", label: "เอกสาร PDF" },
  { key: "inprogress", label: "อยู่ระหว่างปรับปรุง" },
];

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filter: FilterKey = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as FilterKey) : "all";
  const files = listFormFiles();
  const appCodes = new Set(FORM_LIST.map((f) => f.type));
  const matchesQuery = (haystack: string) => !q || haystack.toLocaleLowerCase().includes(q.toLocaleLowerCase());

  // "create online" cards are driven by FORM_LIST (every service the app
  // offers), independent of whether IT has also uploaded a paper PDF for it —
  // the download table below is driven by files actually in public/forms/.
  const searchedForms = FORM_LIST.filter((f) => matchesQuery([f.type, f.shortTitle, DESC[f.type] ?? ""].join(" ")));
  const searchedOtherFiles = files.filter(
    (f) => !appCodes.has(f.code) && matchesQuery([f.code, titleFor(f.code), DESC[f.code] ?? ""].join(" ")),
  );

  const filterCounts: Record<FilterKey, number> = {
    all: searchedForms.length + searchedOtherFiles.length,
    forms: searchedForms.length,
    others: searchedOtherFiles.length,
    inprogress: searchedOtherFiles.filter((f) => PLACEHOLDER_NAME.has(f.code)).length,
  };

  const cardForms = filter === "all" || filter === "forms" ? searchedForms : [];
  const others =
    filter === "forms"
      ? []
      : filter === "inprogress"
        ? searchedOtherFiles.filter((f) => PLACEHOLDER_NAME.has(f.code))
        : searchedOtherFiles;
  const showTable = others.length > 0;

  const chipHref = (key: FilterKey) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (key !== "all") params.set("filter", key);
    const qs = params.toString();
    return qs ? `/documents?${qs}` : "/documents";
  };

  const nothingToShow = cardForms.length === 0 && others.length === 0;

  return (
    <div className="space-y-8">
      {/* ── hero ── */}
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="text-xl font-semibold leading-tight tracking-[-0.015em] text-slate-950 sm:text-[1.375rem]">
            แบบฟอร์มเอกสาร
          </h1>
          <p className="mt-1 text-sm text-muted">
            ดาวน์โหลดเอกสาร (PDF) หรือสร้างคำร้องผ่านระบบออนไลน์ — ทุกอย่างที่ต้องใช้สำหรับงานบริการ IT
          </p>
        </div>
        <div className="card flex flex-col gap-2 bg-brand-weak/40 p-4">
          <p className="text-sm font-semibold text-slate-900">เอกสารและแบบฟอร์มครบ จบในที่เดียว</p>
          <ul className="space-y-1 text-xs text-slate-600">
            <li className="flex items-center gap-1.5">
              <CircleCheck size={14} className="shrink-0 text-brand" aria-hidden="true" />
              สร้างคำร้องออนไลน์ได้ทันที
            </li>
            <li className="flex items-center gap-1.5">
              <CircleCheck size={14} className="shrink-0 text-brand" aria-hidden="true" />
              ดาวน์โหลดเอกสารที่เกี่ยวข้อง
            </li>
            <li className="flex items-center gap-1.5">
              <CircleCheck size={14} className="shrink-0 text-brand" aria-hidden="true" />
              อัปเดตข้อมูลใหม่เสมอ
            </li>
          </ul>
        </div>
      </section>

      {/* ── search + filters ── */}
      <form method="get" className="card flex flex-col gap-3 p-4 text-sm shadow-sm sm:flex-row sm:items-end">
        <label htmlFor="document-search" className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
          ค้นหาเอกสาร
          <input
            id="document-search"
            name="q"
            defaultValue={q}
            placeholder="ค้นหาจากรหัสหรือชื่อแบบฟอร์ม"
            className="control w-full px-3"
          />
        </label>
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <Button type="submit" className="w-full sm:w-auto">ค้นหา</Button>
        {(q || filter !== "all") && (
          <ButtonLink href="/documents" variant="secondary" size="md" className="w-full sm:w-auto">ล้างตัวกรอง</ButtonLink>
        )}
      </form>

      {(FORM_LIST.length > 0 || files.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Link
                key={f.key}
                href={chipHref(f.key)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1",
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-border-strong bg-card text-muted hover:border-brand/40 hover:text-brand",
                )}
              >
                {f.label} ({filterCounts[f.key]})
              </Link>
            );
          })}
        </div>
      )}

      {nothingToShow ? (
        <EmptyState
          icon={FileText}
          title={q ? "ไม่พบเอกสารที่ตรงกับคำค้น" : "ไม่พบเอกสารที่ตรงกับตัวกรอง"}
          hint="ลองเปลี่ยนตัวกรอง หรือค้นด้วยรหัส F02, F03 แล้วลองอีกครั้ง"
          cta={{ href: "/documents", label: "ล้างตัวกรอง" }}
        />
      ) : (
        <div className="space-y-9">
          {cardForms.length > 0 && (
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">แบบฟอร์มสร้างคำร้องออนไลน์</h2>
                  <p className="text-xs text-muted">เลือกบริการที่ต้องการ เพื่อสร้างคำร้องผ่านระบบ</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cardForms.map((form, i) => {
                  const Icon = SERVICE_ICON[form.type] ?? FileText;
                  const tone = CARD_TONES[i % CARD_TONES.length];
                  const pdf = formPdfFile(form.type);
                  const urls = pdf ? docUrls(form.type) : null;
                  return (
                    <div key={form.type} className="card relative flex flex-col gap-3 p-4">
                      {/* the paper-form PDF's own view/download — the card
                          itself (icon + title, below) is still the way to
                          reach /tickets/new/[code] */}
                      {urls && (
                        <div className="absolute top-3 right-3 z-10 flex gap-1">
                          <a
                            href={urls.view}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`ดูตัวอย่าง ${form.shortTitle} (เปิดแท็บใหม่)`}
                            title="ดูตัวอย่าง"
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-strong text-muted transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                          >
                            <Eye size={14} aria-hidden="true" />
                          </a>
                          <a
                            href={urls.download}
                            download
                            aria-label={`ดาวน์โหลด ${form.shortTitle}`}
                            title="ดาวน์โหลด"
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-strong text-muted transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                          >
                            <Download size={14} aria-hidden="true" />
                          </a>
                        </div>
                      )}
                      <Link href={`/tickets/new/${form.type}`} className="group/link flex min-w-0 flex-1 flex-col gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                        <span className={cn("flex h-11 w-11 items-center justify-center rounded-lg ring-1", tone.bg, tone.text, tone.ring)}>
                          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-slate-900 group-hover/link:text-brand">{form.shortTitle}</span>
                          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted">{DESC[form.type] ?? form.title}</span>
                          <span className="mt-2 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
                            {form.type}
                          </span>
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {showTable && (
            <section>
              <div className="mb-3">
                <h2 className="text-sm font-bold text-slate-900">เอกสารดาวน์โหลด</h2>
                <p className="text-xs text-muted">เอกสารแบบฟอร์ม (PDF) สำหรับกรอกด้วยมือหรือเอกสารอ้างอิงอื่นๆ</p>
              </div>
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11px] text-muted">
                      <th className="px-4 py-2.5 font-medium">ชื่อเอกสาร</th>
                      <th className="px-4 py-2.5 font-medium">รหัส</th>
                      <th className="px-4 py-2.5 font-medium">ขนาดไฟล์</th>
                      <th className="px-4 py-2.5 font-medium">สถานะ</th>
                      <th className="px-4 py-2.5 font-medium">อัปเดตล่าสุด</th>
                      <th className="px-4 py-2.5 font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {others.map((f) => {
                      const regenerated = REGENERATED.has(f.code);
                      const { view: viewUrl, download: downloadUrl } = docUrls(f.code);
                      const thumb = docThumb(f.code);
                      const inProgress = PLACEHOLDER_NAME.has(f.code);
                      return (
                        <tr key={f.file} className="hover:bg-surface-subtle/60">
                          <td className="px-4 py-3">
                            <a href={viewUrl} target="_blank" rel="noreferrer" className="group/link flex items-center gap-3">
                              {thumb ? (
                                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-slate-50 ring-1 ring-border">
                                  <Image src={thumb} alt="" width={36} height={36} className="h-full w-full object-cover" />
                                </span>
                              ) : (
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-muted">
                                  <FileText size={17} strokeWidth={1.8} aria-hidden="true" />
                                </span>
                              )}
                              <span className="min-w-0">
                                <span className="block font-semibold text-slate-900 group-hover/link:text-brand">{titleFor(f.code)}</span>
                                <span className="block text-xs text-muted">
                                  {inProgress
                                    ? "ชื่อและรายละเอียดจริงยังไม่ยืนยัน — รอ IT ปรับปรุง"
                                    : regenerated
                                      ? "ไฟล์ต้นฉบับตัวอักษรซ้อนกัน — ใช้แบบฟอร์มเปล่าที่สร้างใหม่แทน"
                                      : (DESC[f.code] ?? "")}
                                </span>
                              </span>
                            </a>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{f.code}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{regenerated ? "สร้างใหม่" : f.bytes > 0 ? humanSize(f.bytes) : "—"}</td>
                          <td className="px-4 py-3">
                            {inProgress ? <Pill tone="amber">อยู่ระหว่างปรับปรุง</Pill> : <Pill tone="green">พร้อมใช้งาน</Pill>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(f.updatedAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <a
                                href={viewUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`ดูตัวอย่าง ${titleFor(f.code)} (เปิดแท็บใหม่)`}
                                title="ดูตัวอย่าง"
                                className="flex h-8 items-center gap-1 rounded-md border border-border-strong px-2 text-muted transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                              >
                                <Eye size={14} aria-hidden="true" />
                              </a>
                              <a
                                href={downloadUrl}
                                download
                                aria-label={`ดาวน์โหลด ${titleFor(f.code)}`}
                                title="ดาวน์โหลด"
                                className="flex h-8 items-center gap-1 rounded-md border border-border-strong px-2 text-muted transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                              >
                                <Download size={14} aria-hidden="true" />
                              </a>
                              <span
                                aria-hidden="true"
                                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300"
                                title="เพิ่มเติม (เร็วๆ นี้)"
                              >
                                <MoreHorizontal size={16} />
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
