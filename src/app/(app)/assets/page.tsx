import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SITES, siteName, isIT } from "@/lib/constants";
import { ASSET_SECTIONS } from "@/lib/asset-def";
import { Pill } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { Button, ButtonLink } from "@/components/Button";
import { cn } from "@/lib/ui";

const PAGE_SIZE = 25;
type SP = Record<string, string | undefined>;
const ASSET_STATUS_OPTIONS = ASSET_SECTIONS.find((section) => section.fields.some((field) => field.key === "status"))?.fields.find((field) => field.key === "status")?.options?.map((option) => option.value) ?? [];
const OTHER_STATUS = "__other";

export default async function AssetsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isIT(user.role)) redirect("/");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const site = SITES.some((item) => item.code === sp.site) ? sp.site! : "";
  const status = [...ASSET_STATUS_OPTIONS, OTHER_STATUS].includes(sp.status ?? "") ? sp.status! : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const hasFilters = Boolean(q || site || status);
  const emptyMessage = hasFilters ? "ไม่พบเครื่องที่ตรงกับเงื่อนไข" : "ยังไม่มีเครื่องในทะเบียน";

  const summaryWhere: Prisma.AssetWhereInput = {};
  if (site) summaryWhere.siteCode = site;
  if (q) {
    summaryWhere.OR = [
      { assetNo: { contains: q } },
      { userName: { contains: q } },
      { serialNumber: { contains: q } },
      { ipAddress: { contains: q } },
      { model: { contains: q } },
      { userDomain: { contains: q } },
    ];
  }
  const where: Prisma.AssetWhereInput = status
    ? status === OTHER_STATUS
      ? { ...summaryWhere, status: { notIn: ["ใช้งาน", "ไม่ได้ใช้งาน"] } }
      : { ...summaryWhere, status }
    : summaryWhere;

  const [rows, total, statusRows] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.asset.count({ where }),
    prisma.asset.groupBy({ by: ["status"], where: summaryWhere, _count: { _all: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pages) redirect(assetPageHref(pages, q, site, status));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const statusCount = Object.fromEntries(statusRows.map((row) => [row.status, row._count._all]));
  const inUseCount = statusCount["ใช้งาน"] ?? 0;
  const inactiveCount = statusCount["ไม่ได้ใช้งาน"] ?? 0;
  const otherCount = Math.max(0, Object.values(statusCount).reduce((sum, count) => sum + count, 0) - inUseCount - inactiveCount);
  const metricHref = (nextStatus = "") => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (site) params.set("site", site);
    if (nextStatus) params.set("status", nextStatus);
    const query = params.toString();
    return query ? `/assets?${query}` : "/assets";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="ทะเบียนประวัติเครื่องคอมพิวเตอร์"
        chip="F01"
        count={total}
        actions={
          <ButtonLink
            href="/assets/new"
            size="md"
          >
            + เพิ่มเครื่อง
          </ButtonLink>
        }
      />

      <section aria-label="สรุปสถานะทะเบียนเครื่อง" className="grid overflow-hidden rounded-md border border-border bg-card sm:grid-cols-4">
        <AssetMetric href={metricHref()} label="เครื่องทั้งหมด" count={Object.values(statusCount).reduce((sum, count) => sum + count, 0)} active={!status} />
        <AssetMetric href={metricHref("ใช้งาน")} label="กำลังใช้งาน" count={inUseCount} active={status === "ใช้งาน"} tone="brand" />
        <AssetMetric href={metricHref("ไม่ได้ใช้งาน")} label="ไม่ได้ใช้งาน" count={inactiveCount} active={status === "ไม่ได้ใช้งาน"} tone="slate" />
        <AssetMetric href={metricHref(OTHER_STATUS)} label="สำรอง / อื่น ๆ" count={otherCount} active={status === OTHER_STATUS} tone="slate" />
      </section>


      <form method="get" className="flex flex-col gap-3 card p-4 text-sm shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label htmlFor="asset-search" className="sr-only">ค้นหาทะเบียนเครื่อง</label>
        <input
          id="asset-search"
          name="q"
          defaultValue={q}
          placeholder="ค้นหา เลข Asset / ผู้ใช้ / Serial / IP / Model"
          className="control w-full px-3 sm:min-w-[280px] sm:flex-1"
        />
        <select name="site" defaultValue={site} aria-label="กรองตามบริษัท" className="control-select w-full sm:w-auto">
          <option value="">ทุกบริษัท</option>
          {SITES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} aria-label="กรองตามสถานะ" className="control-select w-full sm:w-auto">
          <option value="">ทุกสถานะ</option>
          {ASSET_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={OTHER_STATUS}>สำรอง / อื่น ๆ</option>
        </select>
        <Button type="submit" className="w-full sm:w-auto">ค้นหา</Button>
        {(q || site || status) && (
          <ButtonLink href="/assets" variant="secondary" size="md" className="w-full sm:w-auto">
            ล้างตัวกรอง
          </ButtonLink>
        )}
      </form>

      {total > 0 && (
        <p aria-live="polite" className="text-xs text-muted">
          แสดงรายการ <span className="font-semibold tabular-nums text-slate-700">{rangeStart}–{rangeEnd}</span> จาก {total.toLocaleString("th-TH")} รายการ
        </p>
      )}

      {/* mobile: stacked cards */}
      <ul className="divide-y divide-border overflow-hidden card lg:hidden" aria-label="รายการทะเบียนเครื่อง">
        {rows.map((a) => (
          <li key={a.id} className="p-4 transition-colors hover:bg-brand-weak/30">
            <Link href={`/assets/${a.id}`} aria-label={`เปิดทะเบียนเครื่อง ${a.assetNo}`} className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-brand">{a.assetNo}</span>
                <span className="ml-auto">
                  <Pill tone={a.status === "ใช้งาน" ? "green" : a.status === "ไม่ได้ใช้งาน" ? "red" : "slate"}>
                    {a.status}
                  </Pill>
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-700">
                {a.userName ?? "-"}
                {a.department ? <span className="text-xs text-slate-400"> · {a.department}</span> : null}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span>{a.assetType ?? "-"}</span>
                {a.serialNumber && <span className="font-mono">S/N {a.serialNumber}</span>}
                <span>· {[a.brand, a.model].filter(Boolean).join(" ") || "-"}</span>
                {a.ipAddress && <span>· {a.ipAddress}</span>}
                <span>· {siteName(a.siteCode)}</span>
              </div>
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-3 py-14 text-center text-sm text-slate-400">
            <p>{emptyMessage}</p>
            {hasFilters && (
              <Link href="/assets" className="mt-2 inline-block rounded-sm text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                ล้างตัวกรอง
              </Link>
            )}
          </li>
        )}
      </ul>

      {/* desktop: table */}
      <div role="region" aria-label="ตารางทะเบียนเครื่อง" tabIndex={0} className="hidden overflow-x-auto card focus-visible:ring-2 focus-visible:ring-brand/30 lg:block">
        <table className="min-w-[900px] w-full text-sm">
          <caption className="sr-only">ทะเบียนประวัติเครื่องคอมพิวเตอร์</caption>
          <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">เลข Asset</th>
              <th className="px-3 py-2 text-left font-medium">ประเภท</th>
              <th className="px-3 py-2 text-left font-medium">ผู้ใช้งาน</th>
              <th className="px-3 py-2 text-left font-medium">เครื่อง</th>
              <th className="px-3 py-2 text-left font-medium">IP</th>
              <th className="px-3 py-2 text-left font-medium">บริษัท</th>
              <th className="px-3 py-2 text-left font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a) => (
              <tr key={a.id} className="group relative cursor-pointer transition-colors hover:bg-brand-weak/30">
                <td className="px-4 py-3">
                    <Link href={`/assets/${a.id}`} aria-label={`เปิดทะเบียนเครื่อง ${a.assetNo}`} className="font-mono text-brand after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40">
                    {a.assetNo}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{a.assetType ?? "-"}</td>
                <td className="px-4 py-3 text-slate-700">
                  {a.userName ?? "-"}
                  {a.department ? <span className="text-xs text-slate-400"> · {a.department}</span> : null}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span className="block">{[a.brand, a.model].filter(Boolean).join(" ") || "-"}</span>
                  {a.serialNumber && <span className="mt-0.5 block font-mono text-xs text-slate-400">S/N {a.serialNumber}</span>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{a.ipAddress ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{siteName(a.siteCode)}</td>
                <td className="px-4 py-3">
                  <Pill tone={a.status === "ใช้งาน" ? "green" : a.status === "ไม่ได้ใช้งาน" ? "red" : "slate"}>
                    {a.status}
                  </Pill>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                  <p>{emptyMessage}</p>
                  {hasFilters && (
                    <Link href="/assets" className="mt-2 inline-block rounded-sm text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">
                      ล้างตัวกรอง
                    </Link>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="เปลี่ยนหน้าทะเบียนเครื่อง" className="flex flex-wrap items-center justify-center gap-1.5 text-sm">
          <AssetPageLink href={assetPageHref(1, q, site, status)} disabled={page === 1} label="หน้าแรก" />
          <AssetPageLink href={assetPageHref(page - 1, q, site, status)} disabled={page === 1} label="ก่อนหน้า" />
          {windowed(page, pages).map((p, index) =>
            p === "…" ? (
              <span key={`gap-${index}`} className="px-1 text-slate-400">…</span>
            ) : (
              <Link
                key={p}
                href={assetPageHref(p, q, site, status)}
                aria-label={`หน้าที่ ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={p === page ? "rounded-md bg-brand px-3 py-1 font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1" : "rounded-md border border-border px-3 py-1 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"}
              >
                {p}
              </Link>
            ),
          )}
          <AssetPageLink href={assetPageHref(page + 1, q, site, status)} disabled={page === pages} label="ถัดไป" />
          <AssetPageLink href={assetPageHref(pages, q, site, status)} disabled={page === pages} label="หน้าสุดท้าย" />
        </nav>
      )}
    </div>
  );
}

function assetPageHref(page: number, q: string, site: string, status: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (site) params.set("site", site);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return `/assets?${params.toString()}`;
}

function AssetPageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) return <span aria-disabled="true" className="rounded-md border border-border px-3 py-1 text-slate-300">{label}</span>;
  return <Link href={href} className="rounded-md border border-border px-3 py-1 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">{label}</Link>;
}

function windowed(current: number, last: number): (number | "…")[] {
  const out = new Set<number>([1, last, current, current - 1, current + 1]);
  const sorted = [...out].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

function AssetMetric({
  href,
  label,
  count,
  active,
  tone = "default",
}: {
  href?: string;
  label: string;
  count: number;
  active: boolean;
  tone?: "default" | "brand" | "slate";
}) {
  const valueClass = tone === "brand" ? "text-brand" : "text-slate-950";
  const className = cn(
    "border-b border-border px-4 py-3 transition-colors last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0",
    active
      ? "border-b-2 border-brand bg-brand-weak/45 sm:border-b-0 sm:border-l-2 sm:border-l-brand"
      : href
        ? "hover:bg-surface-subtle"
        : "",
  );
  const content = (
    <>
      <span className="block text-xs text-muted">{label}</span>
      <span className={cn("mt-0.5 block text-xl font-semibold tabular-nums", valueClass)}>{count}</span>
    </>
  );
  return href ? <Link href={href} aria-current={active ? "page" : undefined} className={cn(className, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40")}>{content}</Link> : <div className={className}>{content}</div>;
}
