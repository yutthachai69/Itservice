import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { ROLES } from "@/lib/roles";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return NextResponse.json({ error: "BAD_ID" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const data: { role?: string; roleLocked?: boolean; active?: boolean } = {};

  if (typeof body.role === "string") {
    if (!ROLES.includes(body.role)) return NextResponse.json({ error: "BAD_ROLE" }, { status: 422 });
    data.role = body.role;
    // a manual role change is pinned unless the caller says otherwise
    data.roleLocked = typeof body.roleLocked === "boolean" ? body.roleLocked : true;
  } else if (typeof body.roleLocked === "boolean") {
    data.roleLocked = body.roleLocked;
  }
  if (typeof body.active === "boolean") data.active = body.active;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "NOTHING_TO_UPDATE" }, { status: 400 });
  }

  // don't let an admin lock themselves out
  if (userId === admin.id && (data.role && data.role !== "ADMIN")) {
    return NextResponse.json({ error: "ห้ามลดสิทธิ์ ADMIN ของตัวเอง" }, { status: 422 });
  }
  if (userId === admin.id && data.active === false) {
    return NextResponse.json({ error: "ห้ามปิดใช้งานบัญชีตัวเอง" }, { status: 422 });
  }

  const u = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, role: true, roleLocked: true, active: true },
  });
  return NextResponse.json(u);
}
