import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";

const TYPES = ["IT", "ACCOUNTING"];

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const items = await prisma.approver.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const type = String(body.type ?? "");
  const email = String(body.email ?? "").trim() || null;
  if (!name) return NextResponse.json({ error: "ต้องระบุชื่อ" }, { status: 422 });
  if (!TYPES.includes(type)) return NextResponse.json({ error: "ประเภทไม่ถูกต้อง" }, { status: 422 });

  const a = await prisma.approver.create({ data: { name, type, email } });
  return NextResponse.json(a);
}
