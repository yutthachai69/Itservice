import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SITES, isIT } from "@/lib/constants";
import { AssetForm } from "../AssetForm";
import { PageHeader } from "@/components/PageHeader";

export default async function NewAssetPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isIT(user.role)) redirect("/");

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-3xl">
      <PageHeader title="เพิ่มเครื่องเข้าทะเบียน" chip="F01" />
      <AssetForm
        mode="create"
        sites={SITES}
        initial={{
          addedDate: today,
          receivedDate: today,
          siteCode: user.siteCode ?? "02",
          status: "ใช้งาน",
        }}
      />
    </div>
  );
}
