import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SITES, siteName, isIT } from "@/lib/constants";
import { ASSET_SECTIONS } from "@/lib/asset-def";
import { assetToValues } from "@/lib/assets";
import { fmtDateTime } from "@/lib/ui";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assetId = Number(id);
  if (!Number.isInteger(assetId)) notFound();

  const user = await getCurrentUser();
  if (!user) return null;
  if (!isIT(user.role)) redirect("/");

  const a = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { createdBy: { select: { displayName: true } } },
  });
  if (!a) notFound();

  const values = assetToValues(a);
  const optLabel = (key: string, v: string) => {
    if (key === "siteCode") return siteName(v);
    const f = ASSET_SECTIONS.flatMap((s) => s.fields).find((x) => x.key === key);
    return f?.options?.find((o) => o.value === v)?.label ?? v;
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-5">
        <h1 className="font-mono text-lg text-slate-900">{a.assetNo}</h1>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{a.assetType ?? "-"}</span>
        <span className="text-sm text-slate-500">{siteName(a.siteCode)}</span>
        <Link
          href={`/assets/${a.id}/edit`}
          className="ml-auto rounded-lg border border-border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          แก้ไข
        </Link>
      </div>

      <div className="card overflow-hidden">
      {ASSET_SECTIONS.map((section) => (
        <div key={section.title} className="border-b border-border p-5 last:border-b-0 sm:p-6">
          <h2 className="font-semibold text-slate-900">{section.title}</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {section.fields.map((f) => {
              const raw = values[f.key] ?? "";
              return (
                <div key={f.key} className="flex flex-wrap gap-x-2 gap-y-0.5">
                  <dt className="min-w-[140px] shrink-0 text-slate-400">{f.label}</dt>
                  <dd className="text-slate-700 whitespace-pre-wrap">
                    {raw ? optLabel(f.key, raw) : "-"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
      </div>

      <p className="text-xs text-slate-400">
        เพิ่มโดย {a.createdBy?.displayName ?? "-"} · อัปเดตล่าสุด {fmtDateTime(a.updatedAt)}
      </p>
    </div>
  );
}

void SITES;
