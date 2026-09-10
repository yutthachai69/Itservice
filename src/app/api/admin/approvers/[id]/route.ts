import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";

const TYPES = ["IT", "ACCOUNTING"];

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const approverId = Number(id);
  if (!Number.isInteger(approverId)) return NextResponse.json({ error: "BAD_ID" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const data: { name?: string; email?: string | null; type?: string; active?: boolean } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if ("email" in body) data.email = String(body.email ?? "").trim() || null;
  if (typeof body.type === "string") {
    if (!TYPES.includes(body.type)) return NextResponse.json({ error: "BAD_TYPE" }, { status: 422 });
    data.type = body.type;
  }
  if (typeof body.active === "boolean") data.active = body.active;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "NOTHING" }, { status: 400 });

  const a = await prisma.approver.update({ where: { id: approverId }, data });
  return NextResponse.json(a);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const approverId = Number(id);
  const used = await prisma.ticketApproval.count({ where: { approverId } });
  if (used > 0) {
    return NextResponse.json(
      { error: `มีคำร้อง ${used} รายการอ้างอิงอยู่ — ให้ปิดใช้งานแทนการลบ` },
      { status: 409 },
    );
  }
  await prisma.approver.delete({ where: { id: approverId } });
  return NextResponse.json({ ok: true });
}
