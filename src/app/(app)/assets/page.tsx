import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SITES, siteName, isIT } from "@/lib/constants";
import { Pill } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";

const PAGE_SIZE = 25;
type SP = Record<string, string | undefined>;

export default async function AssetsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isIT(user.role)) redirect("/");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const site = sp.site ?? "";
  const status = sp.status ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.AssetWhereInput = {};
  if (site) where.siteCode = site;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { assetNo: { contains: q } },
      { userName: { contains: q } },
      { serialNumber: { contains: q } },
      { ipAddress: { contains: q } },
      { model: { contains: q } },
      { userDomain: { contains: q } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.asset.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="ทะเบียนประวัติเครื่องคอมพิวเตอร์"
        chip="F01"
        count={total}
        actions={
          <Link
            href="/assets/new"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-strong"
          >
            + เพิ่มเครื่อง
          </Link>
        }
      />


      <form className="flex flex-wrap items-end gap-3 card p-4 text-sm shadow-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหา เลข Asset / ผู้ใช้ / Serial / IP / Model"
          className="h-10 min-w-[280px] flex-1 rounded-lg border border-border px-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <select name="site" defaultValue={site} className="h-10 rounded-lg border border-border px-2 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15">
          <option value="">ทุกบริษัท</option>
          {SITES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="h-10 rounded-lg border border-border px-2 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15">
          <option value="">ทุกสถานะ</option>
          {["ใช้งาน", "ไม่ได้ใช้งาน", "สำรองใช้งาน", "อื่นๆ"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-lg bg-brand px-4 text-white transition hover:bg-brand-strong">ค้นหา</button>
      </form>

      {/* mobile: stacked cards */}
      <ul className="divide-y divide-border overflow-hidden card lg:hidden">
        {rows.map((a) => (
          <li key={a.id} className="p-4 transition-colors hover:bg-brand-weak/30">
            <Link href={`/assets/${a.id}`} className="block">
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
                <span>· {[a.brand, a.model].filter(Boolean).join(" ") || "-"}</span>
                {a.ipAddress && <span>· {a.ipAddress}</span>}
                <span>· {siteName(a.siteCode)}</span>
              </div>
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-3 py-14 text-center text-sm text-slate-400">ยังไม่มีเครื่องในทะเบียน</li>
        )}
      </ul>

      {/* desktop: table */}
      <div className="hidden overflow-x-auto card lg:block">
        <table className="min-w-[900px] w-full text-sm">
          <caption className="sr-only">ทะเบียนประวัติเครื่องคอมพิวเตอร์</caption>
          <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500">
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
              <tr key={a.id} className="transition-colors hover:bg-brand-weak/30">
                <td className="px-4 py-3">
                  <Link href={`/assets/${a.id}`} className="font-mono text-brand hover:underline">
                    {a.assetNo}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{a.assetType ?? "-"}</td>
                <td className="px-4 py-3 text-slate-700">
                  {a.userName ?? "-"}
                  {a.department ? <span className="text-xs text-slate-400"> · {a.department}</span> : null}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {[a.brand, a.model].filter(Boolean).join(" ") || "-"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.ipAddress ?? "-"}</td>
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
                  ยังไม่มีเครื่องในทะเบียน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2 text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => {
            const u = new URLSearchParams({ q, site, status, page: String(p) });
            return (
              <Link
                key={p}
                href={`/assets?${u.toString()}`}
                className={
                  p === page
                    ? "rounded bg-brand px-3 py-1 text-white"
                    : "rounded border border-border px-3 py-1 text-slate-600 hover:bg-slate-50"
                }
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
