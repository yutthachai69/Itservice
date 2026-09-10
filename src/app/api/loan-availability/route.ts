import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { availableItems } from "@/lib/loans";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const category = sp.get("category") ?? "";
  const fromS = sp.get("from") ?? "";
  const toS = sp.get("to") ?? "";
  const site = sp.get("site") || undefined;

  const from = new Date(fromS);
  const to = new Date(toS);
  if (!category || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return NextResponse.json({ error: "BAD_PARAMS" }, { status: 400 });
  }

  const items = await availableItems({ category, from, to, siteCode: site });
  return NextResponse.json({
    count: items.length,
    items: items.map((i) => ({ id: i.id, name: i.name, serial: i.serial, siteCode: i.siteCode })),
  });
}
