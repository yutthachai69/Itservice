import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SITES, isIT } from "@/lib/constants";
import { assetToValues } from "@/lib/assets";
import { AssetForm } from "../../AssetForm";
import { PageHeader } from "@/components/PageHeader";

export default async function EditAssetPage({
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

  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) notFound();

  return (
    <div className="w-full">
      <nav aria-label="เส้นทางแก้ไขทะเบียนเครื่อง" className="mb-1 text-xs text-muted">
        <Link
          href={`/assets/${asset.id}`}
          className="inline-flex items-center gap-1 rounded-sm px-1 py-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          กลับรายละเอียดเครื่อง
        </Link>
      </nav>
      <PageHeader
        title={<>แก้ไขเครื่อง <span className="font-mono text-[1.15rem]">{asset.assetNo}</span></>}
        subtitle="ปรับปรุงข้อมูลทะเบียนและรายละเอียดทางเทคนิคของเครื่อง"
        chip="ทะเบียนเครื่อง"
      />
      <AssetForm mode="edit" assetId={assetId} sites={SITES} initial={assetToValues(asset)} />
    </div>
  );
}
