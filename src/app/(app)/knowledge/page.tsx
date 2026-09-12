import { BookOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

// Placeholder per the earlier home-page discussion: a "ความรู้" tab was
// agreed on, content to follow later — for now just reserve the route +
// nav entry so linking to it doesn't 404.
export default async function KnowledgePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="ความรู้ / คู่มือ" subtitle="วิธีใช้งานระบบและคำถามที่พบบ่อย" />
      <EmptyState
        icon={BookOpen}
        title="ยังไม่มีเนื้อหาในหน้านี้"
        hint="ทีม IT กำลังเตรียมคู่มือการใช้งานและคำถามที่พบบ่อยไว้ที่นี่ แวะมาดูใหม่อีกครั้ง"
      />
    </div>
  );
}
