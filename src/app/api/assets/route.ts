import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isIT } from "@/lib/constants";
import { createAsset } from "@/lib/assets";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (!isIT(user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.data !== "object") {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const result = await createAsset(user, body.data);
  if (!result.ok) {
    return NextResponse.json({ error: "VALIDATION", fields: result.errors }, { status: 422 });
  }
  return NextResponse.json({ id: result.asset.id, assetNo: result.asset.assetNo });
}
