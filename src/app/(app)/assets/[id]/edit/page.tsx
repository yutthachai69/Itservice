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

  const a = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!a) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader title={`แก้ไขเครื่อง ${a.assetNo}`} />
      <AssetForm mode="edit" assetId={assetId} sites={SITES} initial={assetToValues(a)} />
    </div>
  );
}
