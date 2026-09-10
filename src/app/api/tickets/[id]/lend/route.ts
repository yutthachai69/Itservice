import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isIT } from "@/lib/constants";
import { lendItem } from "@/lib/loans";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isIT(user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const ticketId = Number(id);
  const body = await req.json().catch(() => ({}));
  const itemId = Number(body.itemId);
  if (!Number.isInteger(ticketId) || !Number.isInteger(itemId)) {
    return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
  }

  const result = await lendItem({ ticketId, itemId, actor: user });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "NOT_FOUND" ? 404 : 422 });
  }
  return NextResponse.json({ ok: true });
}
