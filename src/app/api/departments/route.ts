import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const site = req.nextUrl.searchParams.get("site");
  if (!site) return NextResponse.json({ departments: [] });
  const departments = await prisma.department.findMany({
    where: { siteCode: site },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json({ departments });
}
