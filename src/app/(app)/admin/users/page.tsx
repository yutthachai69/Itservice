import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { siteName } from "@/lib/constants";
import { UsersTable } from "./UsersTable";

type SP = { q?: string; role?: string };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const admin = await getAdmin();
  if (!admin) return null;
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const users = await prisma.user.findMany({
    where: {
      ...(sp.role ? { role: sp.role } : {}),
      ...(q
        ? { OR: [{ username: { contains: q } }, { displayName: { contains: q } }, { email: { contains: q } }] }
        : {}),
    },
    include: { department: true },
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
    take: 200,
  });

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3 card p-4 text-sm shadow-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหา ชื่อ / username / อีเมล"
          className="h-10 rounded-lg border border-border px-3 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <select name="role" defaultValue={sp.role ?? ""} className="h-10 rounded-lg border border-border px-2 py-1.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15">
          <option value="">ทุกบทบาท</option>
          <option value="USER">ผู้ใช้ทั่วไป</option>
          <option value="IT_STAFF">เจ้าหน้าที่ IT</option>
          <option value="IT_LEAD">หัวหน้า IT</option>
          <option value="ADMIN">ผู้ดูแลระบบ</option>
        </select>
        <button className="h-10 rounded-lg bg-brand px-4 text-white transition hover:bg-brand-strong">ค้นหา</button>
      </form>

      <p className="text-xs text-slate-500">
        บทบาทปกติ sync จากแผนกใน Entra ทุกครั้งที่ล็อกอิน — ถ้า <b>ล็อก</b> ไว้ ระบบจะไม่แก้บทบาทให้อีก
        (ใช้กับหัวหน้า/แอดมิน หรือคนนอกแผนก IT ที่ให้ช่วยรับงาน)
      </p>

      <UsersTable
        currentAdminId={admin.id}
        rows={users.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          email: u.email,
          site: siteName(u.siteCode ?? ""),
          department: u.department?.name ?? "-",
          role: u.role,
          roleLocked: u.roleLocked,
          active: u.active,
        }))}
      />
    </div>
  );
}
