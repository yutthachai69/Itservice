import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isIT } from "@/lib/constants";

const STATUSES = ["AVAILABLE", "MAINTENANCE", "RETIRED"];

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isIT(user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) return NextResponse.json({ error: "BAD_ID" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if ("serial" in body) data.serial = String(body.serial ?? "").trim() || null;
  if ("assetNo" in body) data.assetNo = String(body.assetNo ?? "").trim() || null;
  if ("note" in body) data.note = String(body.note ?? "").trim() || null;
  if (typeof body.siteCode === "string") data.siteCode = body.siteCode;
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "BAD_STATUS" }, { status: 422 });
    data.status = body.status;
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "NOTHING" }, { status: 400 });

  const item = await prisma.loanItem.update({ where: { id: itemId }, data });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isIT(user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await ctx.params;
  const itemId = Number(id);

  const active = await prisma.loan.count({
    where: { itemId, status: { in: ["BOOKED", "ONLOAN"] } },
  });
  if (active > 0) {
    return NextResponse.json(
      { error: "อุปกรณ์กำลังถูกยืม/จองอยู่ — ตั้งเป็นปลดระวางแทน" },
      { status: 409 },
    );
  }
  await prisma.loanItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
