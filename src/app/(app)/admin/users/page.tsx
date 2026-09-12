import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { siteName } from "@/lib/constants";
import { UsersTable } from "./UsersTable";
import { Button, ButtonLink } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";

const PAGE_SIZE = 50;
type SP = { q?: string; role?: string; active?: string; page?: string };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const admin = await getAdmin();
  if (!admin) return null;
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const role = ["USER", "IT_STAFF", "IT_LEAD", "ADMIN"].includes(sp.role ?? "") ? sp.role! : "";
  const active = ["active", "inactive"].includes(sp.active ?? "") ? sp.active! : "";
  const rawPage = Number.parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const hasFilters = Boolean(q || role || active);

  const where = {
    ...(role ? { role } : {}),
    ...(active ? { active: active === "active" } : {}),
    ...(q
      ? { OR: [{ username: { contains: q } }, { displayName: { contains: q } }, { email: { contains: q } }] }
      : {}),
  };
  const [users, total] = await Promise.all([prisma.user.findMany({
    where,
    include: { department: true },
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  }), prisma.user.count({ where })]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pages) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (active) params.set("active", active);
    if (pages > 1) params.set("page", String(pages));
    redirect(`/admin/users?${params.toString()}`);
  }
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (active) params.set("active", active);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/admin/users?${query}` : "/admin/users";
  };

  return (
    <div className="space-y-4">
      <PageHeader
        chip="การจัดการระบบ"
        title="ผู้ใช้งานและสิทธิ์"
        count={total}
        subtitle="ตรวจสอบบัญชี เปลี่ยนบทบาท และกำหนดว่าบัญชีใดใช้งานได้"
      />
      <form method="get" className="flex flex-col gap-3 card p-4 text-sm shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label htmlFor="admin-user-search" className="sr-only">ค้นหาผู้ใช้</label>
        <input
          id="admin-user-search"
          name="q"
          defaultValue={q}
          placeholder="ค้นหา ชื่อ / username / อีเมล"
          className="control w-full px-3 sm:min-w-[280px] sm:flex-1"
        />
        <select name="role" defaultValue={role} aria-label="กรองตามบทบาท" className="control-select w-full sm:w-auto">
          <option value="">ทุกบทบาท</option>
          <option value="USER">ผู้ใช้ทั่วไป</option>
          <option value="IT_STAFF">เจ้าหน้าที่ IT</option>
          <option value="IT_LEAD">หัวหน้า IT</option>
          <option value="ADMIN">ผู้ดูแลระบบ</option>
        </select>
        <select name="active" defaultValue={active} aria-label="กรองตามสถานะบัญชี" className="control-select w-full sm:w-auto">
          <option value="">ทุกสถานะบัญชี</option>
          <option value="active">ใช้งานอยู่</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
        <Button type="submit" className="w-full sm:w-auto">ค้นหา</Button>
        {(q || role || active) && (
          <ButtonLink href="/admin/users" variant="secondary" size="md" className="w-full sm:w-auto">
            ล้างตัวกรอง
          </ButtonLink>
        )}
      </form>

      <p className="text-xs text-muted" aria-live="polite">
        แสดงผู้ใช้ {rangeStart.toLocaleString("th-TH")}–{rangeEnd.toLocaleString("th-TH")} จาก {total.toLocaleString("th-TH")} บัญชี{hasFilters ? " ตามตัวกรองปัจจุบัน" : ""}
      </p>

      <p className="text-xs text-muted">
        บทบาทปกติ sync จากแผนกใน Entra ทุกครั้งที่ล็อกอิน — ถ้า <b>ล็อก</b> ไว้ ระบบจะไม่แก้บทบาทให้อีก
        (ใช้กับหัวหน้า/แอดมิน หรือคนนอกแผนก IT ที่ให้ช่วยรับงาน)
      </p>

      <UsersTable
        currentAdminId={admin.id}
        emptyMessage={hasFilters ? "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข" : "ยังไม่มีผู้ใช้ในระบบ"}
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

      {pages > 1 && (
        <nav aria-label="เปลี่ยนหน้ารายการผู้ใช้" className="flex flex-wrap items-center justify-center gap-1.5 text-sm">
          <PageLink href={pageHref(page - 1)} disabled={page === 1} label="ก่อนหน้า" />
          {windowed(page, pages).map((item, index) => item === "…" ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-slate-400">…</span>
          ) : (
            <Link
              key={item}
              href={pageHref(item)}
              aria-label={`หน้าที่ ${item}`}
              aria-current={item === page ? "page" : undefined}
              className={item === page ? "rounded-md bg-brand px-3 py-1 font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1" : "rounded-md border border-border px-3 py-1 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"}
            >
              {item}
            </Link>
          ))}
          <PageLink href={pageHref(page + 1)} disabled={page === pages} label="ถัดไป" />
        </nav>
      )}
    </div>
  );
}

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) return <span aria-disabled="true" className="rounded-md border border-border px-3 py-1 text-slate-300">{label}</span>;
  return <Link href={href} className="rounded-md border border-border px-3 py-1 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1">{label}</Link>;
}

function windowed(current: number, last: number): (number | "…")[] {
  const out = new Set<number>([1, last, current, current - 1, current + 1]);
  const sorted = [...out].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    if (index > 0 && sorted[index] - sorted[index - 1] > 1) result.push("…");
    result.push(sorted[index]);
  }
  return result;
}
