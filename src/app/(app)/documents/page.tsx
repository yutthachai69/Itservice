import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { FORM_LIST } from "@/lib/form-defs";
import { isIT } from "@/lib/constants";
import { listFormFiles, formPdfFile } from "@/lib/form-files";
import { docThumb } from "@/lib/doc-thumbs";
import { titleFor, DESC, SERVICE_ICON, REGENERATED, docUrls } from "@/lib/doc-meta";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { fmtDate, cn } from "@/lib/ui";
import {
  Download,
  Eye,
  FileText,
  Search,
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
  const availableForms = FORM_LIST.filter((form) => !form.initiatedByIT || isIT(user.role));
  const matchesQuery = (haystack: string) => !q || haystack.toLocaleLowerCase().includes(q.toLocaleLowerCase());

  // "create online" cards are driven by FORM_LIST (every service the app
  // offers), independent of whether IT has also uploaded a paper PDF for it —
  // the download table below is driven by files actually in public/forms/.
  const searchedForms = availableForms.filter((f) => matchesQuery([f.type, f.shortTitle, DESC[f.type] ?? ""].join(" ")));
  const searchedOtherFiles = files.filter(
    (f) => matchesQuery([f.code, titleFor(f.code), DESC[f.code] ?? ""].join(" ")),
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
      {/* page heading */}
      <section className="flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium text-brand">บริการ IT</p>
          <h1 className="text-xl font-semibold leading-tight tracking-[-0.015em] text-slate-950 sm:text-[1.375rem]">
            แบบฟอร์มเอกสาร
          </h1>
          <p className="mt-1 text-sm text-muted">
            ดาวน์โหลดเอกสาร PDF หรือสร้างคำร้องผ่านระบบออนไลน์
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-5 text-xs text-muted sm:pb-1">
          <span><strong className="mr-1 text-base font-semibold text-slate-950">{availableForms.length}</strong> แบบฟอร์มออนไลน์</span>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <span><strong className="mr-1 text-base font-semibold text-slate-950">{files.length}</strong> เอกสาร PDF</span>
        </div>
      </section>

      {/* ── search + filters ── */}
      <form method="get" role="search" className="card flex flex-col gap-3 p-4 text-sm shadow-sm sm:flex-row sm:items-end">
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
        <Button type="submit" className="w-full gap-2 sm:w-auto"><Search size={15} aria-hidden="true" />ค้นหา</Button>
        {(q || filter !== "all") && (
          <ButtonLink href="/documents" variant="secondary" size="md" className="w-full sm:w-auto">ล้างตัวกรอง</ButtonLink>
        )}
      </form>

      {(availableForms.length > 0 || files.length > 0) && (
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
                <span className="shrink-0 text-xs text-muted">{cardForms.length} รายการ</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cardForms.map((form) => {
                  const Icon = SERVICE_ICON[form.type] ?? FileText;
                  const tone = CARD_TONES[FORM_LIST.findIndex((item) => item.type === form.type) % CARD_TONES.length];
                  const pdf = formPdfFile(form.type);
                  const urls = pdf ? docUrls(form.type) : null;
                  return (
                    <div key={form.type} className="card group flex min-h-[156px] flex-col gap-3 p-4 transition-colors hover:border-brand/40 hover:bg-brand-weak/20">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1", tone.bg, tone.text, tone.ring)}>
                        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <Link href={`/tickets/new/${form.type}`} className="min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                        <span className="block break-words text-sm font-semibold text-slate-900 group-hover:text-brand">{form.shortTitle}</span>
                        <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted">{DESC[form.type] ?? form.title}</span>
                        <span className="mt-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">{form.type}</span>
                      </Link>
                      <div className="flex items-center justify-between gap-2">
                        <ButtonLink href={`/tickets/new/${form.type}`} variant="secondary" size="sm" className="text-brand" aria-label={`สร้างคำร้อง ${form.shortTitle}`}>
                          สร้างคำร้อง
                        </ButtonLink>
                        {urls && (
                          <div className="flex shrink-0 items-center gap-1">
                            <a href={urls.view} target="_blank" rel="noreferrer" aria-label={`ดูตัวอย่าง ${form.shortTitle} (เปิดแท็บใหม่)`} title="ดูตัวอย่าง" className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong text-muted transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                              <Eye size={15} aria-hidden="true" />
                            </a>
                            <a href={urls.download} download aria-label={`ดาวน์โหลด ${form.shortTitle}`} title="ดาวน์โหลด" className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong text-muted transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                              <Download size={15} aria-hidden="true" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {showTable && (
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">เอกสารดาวน์โหลด</h2>
                  <p className="text-xs text-muted">เอกสารแบบฟอร์ม (PDF) สำหรับกรอกด้วยมือหรือเอกสารอ้างอิงอื่นๆ</p>
                </div>
                <span className="shrink-0 text-xs text-muted">{others.length} รายการ</span>
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
