import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { invalidateHolidayCache } from "@/lib/holidays";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ dateKey: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { dateKey } = await ctx.params;
  await prisma.holiday.delete({ where: { dateKey } }).catch(() => {});
  invalidateHolidayCache();
  return NextResponse.json({ ok: true });
}
