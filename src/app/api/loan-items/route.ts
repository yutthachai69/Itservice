import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isIT } from "@/lib/constants";
import { LOAN_CATEGORIES } from "@/lib/loan-categories";

const CATS = new Set(LOAN_CATEGORIES.map((c) => c.value));

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isIT(user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const items = await prisma.loanItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isIT(user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const category = String(body.category ?? "");
  if (!name) return NextResponse.json({ error: "ต้องระบุชื่ออุปกรณ์" }, { status: 422 });
  if (!CATS.has(category)) return NextResponse.json({ error: "หมวดไม่ถูกต้อง" }, { status: 422 });

  const item = await prisma.loanItem.create({
    data: {
      name,
      category,
      serial: String(body.serial ?? "").trim() || null,
      assetNo: String(body.assetNo ?? "").trim() || null,
      siteCode: String(body.siteCode ?? user.siteCode ?? "02"),
      note: String(body.note ?? "").trim() || null,
    },
  });
  return NextResponse.json(item);
}
