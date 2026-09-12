import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="w-full">
      <nav aria-label="เส้นทางเพิ่มทะเบียนเครื่อง" className="mb-1 text-xs text-muted">
        <Link
          href="/assets"
          className="inline-flex items-center gap-1 rounded-sm px-1 py-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          กลับทะเบียนเครื่อง
        </Link>
      </nav>
      <PageHeader
        title="เพิ่มเครื่องเข้าทะเบียน"
        subtitle="บันทึกข้อมูลผู้ใช้งาน สเปกเครื่อง และอุปกรณ์ที่เกี่ยวข้อง"
        chip="F01"
      />
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
