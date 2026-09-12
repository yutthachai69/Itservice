import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ButtonLink } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { ASSET_SECTIONS } from "@/lib/asset-def";
import { assetToValues } from "@/lib/assets";
import { isIT, siteName } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { fmtDate, fmtDateTime } from "@/lib/ui";

const FEATURED_FIELDS = new Set(["assetType", "siteCode", "userName", "status"]);

const SECTION_TITLES: Record<string, string> = {
  "ผู้เพิ่ม / ผู้ใช้งาน": "ข้อมูลผู้ใช้งาน",
  System: "ระบบและสเปกเครื่อง",
  Network: "เครือข่าย",
  "Monitor / UPS / Keyboard / Mouse": "อุปกรณ์ต่อพ่วง",
  "Machine Age / Warranty": "อายุเครื่องและการรับประกัน",
  Permission: "สิทธิ์การใช้งาน",
  "อื่นๆ": "ข้อมูลอื่น",
};

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

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { createdBy: { select: { displayName: true } } },
  });
  if (!asset) notFound();

  const values = assetToValues(asset);
  const allFields = ASSET_SECTIONS.flatMap((section) => section.fields);
  const optionLabel = (key: string, value: string) => {
    if (key === "siteCode") return siteName(value);
    const field = allFields.find((item) => item.key === key);
    if (field?.type === "date") return fmtDate(value);
    if (field?.type === "datetime") return fmtDateTime(value);
    return field?.options?.find((option) => option.value === value)?.label ?? value;
  };

  const populatedSections = ASSET_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.filter((field) => {
      const value = values[field.key]?.trim();
      return Boolean(value) && !FEATURED_FIELDS.has(field.key);
    }),
  })).filter((section) => section.fields.length > 0);

  const populatedCount = allFields.filter((field) => values[field.key]?.trim()).length;
  const summary = [
    { label: "ประเภท", value: asset.assetType || "ยังไม่ระบุ" },
    { label: "บริษัท", value: siteName(asset.siteCode) },
    { label: "ผู้ใช้งาน", value: asset.userName || "ยังไม่ระบุผู้ใช้งาน" },
    { label: "สถานะ", value: values.status ? optionLabel("status", values.status) : "ยังไม่ระบุ", statusKey: values.status },
  ];

  return (
    <div className="w-full space-y-5">
      <nav aria-label="เส้นทางหน้าทะเบียนเครื่อง" className="text-xs text-muted">
        <Link
          href="/assets"
          className="inline-flex items-center gap-1 rounded-sm px-1 py-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          กลับทะเบียนเครื่อง
        </Link>
      </nav>
      <PageHeader
        chip="ทะเบียนเครื่อง"
        title={<span className="font-mono text-[1.35rem] tracking-tight">{asset.assetNo}</span>}
        subtitle="ข้อมูลประจำเครื่อง ผู้ใช้งาน และรายละเอียดทางเทคนิค"
        actions={
          <ButtonLink href={`/assets/${asset.id}/edit`} variant="secondary" size="sm">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            แก้ไขข้อมูล
          </ButtonLink>
        }
      />

      {populatedSections.length > 1 && (
        <nav aria-label="ข้ามไปยังหมวดข้อมูลเครื่อง" className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-md border border-border bg-white px-2 py-1.5 text-xs shadow-sm">
          <span className="shrink-0 px-2 font-medium text-muted">หมวดข้อมูล</span>
          {populatedSections.map((section, index) => (
            <a
              key={section.title}
              href={`#asset-section-${index + 1}`}
              className="shrink-0 rounded-sm px-2.5 py-1.5 text-slate-600 transition-colors hover:bg-brand-weak/35 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
            >
              {SECTION_TITLES[section.title] ?? section.title}
            </a>
          ))}
        </nav>
      )}

      <article className="overflow-hidden rounded-md border border-border bg-white shadow-sm">
        <dl aria-label="สรุปข้อมูลเครื่อง" className="grid bg-sidebar sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item, index) => (
            <div
              key={item.label}
              className={`px-5 py-4 ${index > 0 ? "border-t border-white/10 sm:border-t-0 sm:border-l" : ""}`}
            >
              <dt className="text-xs font-medium text-white/70">{item.label}</dt>
              <dd className="mt-1 min-h-10 break-words text-sm font-semibold leading-5 text-white" title={item.value}>
                {item.statusKey ? <span className={assetStatusClass(item.statusKey)}>{item.value}</span> : item.value}
              </dd>
            </div>
          ))}
        </dl>

        {populatedSections.length === 0 && (
          <div className="flex flex-col items-start gap-3 border-t border-border bg-surface-subtle px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-sm font-medium text-slate-800">ยังไม่มีรายละเอียดทางเทคนิคเพิ่มเติม</p>
              <p className="mt-1 text-xs text-muted">เพิ่มสเปก อุปกรณ์ต่อพ่วง และข้อมูลเครือข่ายเพื่อให้ทะเบียนเครื่องสมบูรณ์ขึ้น</p>
            </div>
            <ButtonLink href={`/assets/${asset.id}/edit`} variant="secondary" size="sm" className="shrink-0">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              เพิ่มรายละเอียด
            </ButtonLink>
          </div>
        )}

        {populatedSections.map((section, sectionIndex) => (
          <section
            key={section.title}
            id={`asset-section-${sectionIndex + 1}`}
            aria-labelledby={`asset-section-heading-${sectionIndex + 1}`}
            className="grid scroll-mt-24 border-t border-border first:border-t-0 lg:grid-cols-[14rem_minmax(0,1fr)]"
          >
            <header className="bg-slate-50/80 px-5 py-4 lg:border-r lg:border-border lg:px-6 lg:py-5">
              <h2 id={`asset-section-heading-${sectionIndex + 1}`} className="border-l-2 border-brand pl-3 text-sm font-semibold text-slate-900">
                {SECTION_TITLES[section.title] ?? section.title}
              </h2>
              <p className="mt-1 pl-[0.875rem] text-xs text-muted">
                {section.fields.length} รายการ
              </p>
            </header>

            <dl className="grid gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 xl:px-7">
              {section.fields.map((field) => {
                const value = values[field.key];
                return (
                  <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : undefined}>
                    <dt className="text-xs font-medium text-muted">{field.label}</dt>
                    <dd className="mt-1 break-words whitespace-pre-wrap text-sm font-medium text-slate-800">
                      {optionLabel(field.key, value)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-slate-50/60 px-5 py-3 text-xs text-muted sm:px-6">
          <span>
            แสดงข้อมูลที่บันทึกแล้ว {populatedCount} จาก {allFields.length} ช่อง
          </span>
          <span>
            เพิ่มโดย {asset.createdBy?.displayName ?? "ไม่ระบุ"} · อัปเดตล่าสุด {fmtDateTime(asset.updatedAt)}
          </span>
        </footer>
      </article>
    </div>
  );
}

function assetStatusClass(status: string) {
  if (status === "ใช้งาน") return "inline-flex rounded-md bg-emerald-400/20 px-2 py-1 text-sm text-emerald-100 ring-1 ring-inset ring-emerald-200/30";
  if (status === "ไม่ได้ใช้งาน") return "inline-flex rounded-md bg-slate-300/20 px-2 py-1 text-sm text-slate-100 ring-1 ring-inset ring-white/20";
  return "inline-flex rounded-md bg-amber-300/20 px-2 py-1 text-sm text-amber-100 ring-1 ring-inset ring-amber-200/30";
}
