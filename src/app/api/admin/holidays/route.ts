import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { invalidateHolidayCache } from "@/lib/holidays";

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const items = await prisma.holiday.findMany({ orderBy: { dateKey: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const dateKey = String(body.dateKey ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!KEY_RE.test(dateKey)) return NextResponse.json({ error: "รูปแบบวันที่ต้องเป็น YYYY-MM-DD" }, { status: 422 });
  if (!name) return NextResponse.json({ error: "ต้องระบุชื่อวันหยุด" }, { status: 422 });

  const h = await prisma.holiday.upsert({
    where: { dateKey },
    create: { dateKey, name },
    update: { name },
  });
  invalidateHolidayCache();
  return NextResponse.json(h);
}
