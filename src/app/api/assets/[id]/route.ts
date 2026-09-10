import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isIT } from "@/lib/constants";
import { updateAsset } from "@/lib/assets";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (!isIT(user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const assetId = Number(id);
  if (!Number.isInteger(assetId)) return NextResponse.json({ error: "BAD_ID" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.data !== "object") {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const result = await updateAsset(assetId, body.data);
  if (!result.ok) {
    if (result.error === "VALIDATION") {
      return NextResponse.json({ error: "VALIDATION", fields: result.errors }, { status: 422 });
    }
    return NextResponse.json({ error: result.error }, { status: result.error === "NOT_FOUND" ? 404 : 422 });
  }
  return NextResponse.json({ ok: true });
}
