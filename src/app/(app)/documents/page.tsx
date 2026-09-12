import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { FORM_DEFS } from "@/lib/form-defs";
import { listFormFiles } from "@/lib/form-files";
import { docThumb } from "@/lib/doc-thumbs";
import { titleFor, DESC, SERVICE_ICON, REGENERATED, docUrls } from "@/lib/doc-meta";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Download, Eye, FileText } from "lucide-react";
import { cn } from "@/lib/ui";

// real names/descriptions not confirmed yet — flagged in the UI instead of
// left blank so it's clear the card is incomplete, not broken
const PLACEHOLDER_NAME = new Set(["F08", "F15", "F16"]);

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
  const appCodes = new Set(Object.keys(FORM_DEFS));
  const searchedFiles = q
    ? files.filter((file) => {
        const haystack = [file.code, titleFor(file.code), DESC[file.code] ?? ""].join(" ").toLocaleLowerCase();
        return haystack.includes(q.toLocaleLowerCase());
      })
    : files;

  const filterCounts: Record<FilterKey, number> = {
    all: searchedFiles.length,
    forms: searchedFiles.filter((f) => appCodes.has(f.code)).length,
    others: searchedFiles.filter((f) => !appCodes.has(f.code)).length,
    inprogress: searchedFiles.filter((f) => PLACEHOLDER_NAME.has(f.code)).length,
  };
  const filteredFiles = searchedFiles.filter((f) => {
    if (filter === "forms") return appCodes.has(f.code);
    if (filter === "others") return !appCodes.has(f.code);
    if (filter === "inprogress") return PLACEHOLDER_NAME.has(f.code);
    return true;
  });
  const forms = filteredFiles.filter((f) => appCodes.has(f.code));
  const others = filteredFiles.filter((f) => !appCodes.has(f.code));

  const chipHref = (key: FilterKey) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (key !== "all") params.set("filter", key);
    const qs = params.toString();
    return qs ? `/documents?${qs}` : "/documents";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="แบบฟอร์มเอกสาร"
        subtitle="ดาวน์โหลดแบบฟอร์มกระดาษ (PDF) สำหรับกรอกด้วยมือหรือขอลายเซ็น"
      />

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

      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = filterCounts[f.key];
            return (
              <Link
                key={f.key}
                href={chipHref(f.key)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1",
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-border-strong bg-card text-muted hover:border-brand/40 hover:text-brand",
                )}
              >
                {f.label}
                <span className={cn("tabular-nums", active ? "text-white/75" : "text-slate-400")}>{count}</span>
              </Link>
            );
          })}
        </div>
      )}

      {files.length > 0 && (
        <p role="status" aria-live="polite" className="text-xs text-muted">
          แสดง <span className="font-semibold tabular-nums text-slate-700">{filteredFiles.length}</span> จาก {files.length} เอกสาร{q ? ` · ค้นหา “${q}”` : ""}
        </p>
      )}

      {files.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="ยังไม่มีเอกสารให้ดาวน์โหลด"
          hint="ให้ IT วางไฟล์ PDF ไว้ที่ public/forms/"
        />
      ) : filteredFiles.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="ไม่พบเอกสารที่ตรงกับตัวกรอง"
          hint="ลองเปลี่ยนตัวกรอง หรือค้นด้วยรหัส F02, F03 แล้วลองอีกครั้ง"
          cta={{ href: "/documents", label: "ล้างตัวกรอง" }}
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
        <span className="text-[11px] text-muted">· {items.length} รายการ</span>
      </div>
      {/* one bordered work surface for the whole group — docs/ui-foundation.md
          "use a single bordered work surface for related content instead of
          a card for every subsection". Classic grid-divider trick: the grid
          itself is border-colored with a 1px gap, each cell paints over it
          with the card background — draws hairline dividers between every
          row and column with no fragile nth-child selectors. */}
      <div className="card overflow-hidden">
        <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
        {items.map((f) => {
          const regenerated = REGENERATED.has(f.code);
          // served through an API route (not the raw /forms/<thai filename>.pdf
          // path) so the browser gets a proper RFC 5987 filename header instead
          // of guessing one from a percent-encoded Thai URL — that guess is what
          // was showing up as a garbled tab title. Forms with a broken source
          // PDF go to a regenerated blank copy instead (see doc-meta.ts).
          const { view: viewUrl, download: downloadUrl } = docUrls(f.code);
          const Icon = SERVICE_ICON[f.code] ?? FileText;
          const thumb = docThumb(f.code);
          return (
            <div
              key={f.file}
              className="group relative flex items-start gap-3 bg-card p-4 transition hover:bg-brand-weak/20"
            >
              {/* compact, equal-weight action cluster — avoids one loud button next to an empty-looking one */}
              <div className="absolute top-3 right-3 z-10 flex gap-1">
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`ดูตัวอย่าง ${titleFor(f.code)} (เปิดแท็บใหม่)`}
                  title="ดูตัวอย่าง"
                  className="flex h-8 items-center justify-center gap-1 rounded-md border border-border-strong px-2 text-muted transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                >
                  <Eye size={15} aria-hidden="true" />
                  <span className="hidden text-xs xl:inline">ดู</span>
                </a>
                <a
                  href={downloadUrl}
                  download
                  aria-label={`ดาวน์โหลด ${titleFor(f.code)}`}
                  title="ดาวน์โหลด"
                  className="flex h-8 items-center justify-center gap-1 rounded-md border border-border-strong px-2 text-muted transition hover:border-brand/40 hover:bg-brand-weak hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
                >
                  <Download size={15} aria-hidden="true" />
                  <span className="hidden text-xs xl:inline">ดาวน์โหลด</span>
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

              <a href={viewUrl} target="_blank" rel="noreferrer" aria-label={`เปิดเอกสาร ${titleFor(f.code)} (เปิดแท็บใหม่)`} className="group/link min-w-0 flex-1 rounded-sm pr-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1 xl:pr-28">
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
                    <span className="rounded bg-brand-weak px-1.5 py-0.5 text-[11px] font-medium text-brand">
                      สร้างใหม่จากระบบ
                    </span>
                  ) : (
                    f.bytes > 0 && (
                      <span className="text-[11px] text-slate-400">PDF · {humanSize(f.bytes)}</span>
                    )
                  )}
                  {PLACEHOLDER_NAME.has(f.code) ? (
                    <Pill tone="amber">อยู่ระหว่างปรับปรุง</Pill>
                  ) : (
                    <Pill tone="green">พร้อมใช้งาน</Pill>
                  )}
                </span>
              </a>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}
