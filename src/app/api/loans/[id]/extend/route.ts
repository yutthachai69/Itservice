import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isIT } from "@/lib/constants";
import { extendLoan } from "@/lib/loans";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isIT(user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const loanId = Number(id);
  const body = await req.json().catch(() => ({}));
  if (!Number.isInteger(loanId) || typeof body.dueDate !== "string") {
    return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
  }

  const result = await extendLoan({ loanId, actor: user, dueDate: body.dueDate });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "NOT_FOUND" ? 404 : 422 });
  }
  return NextResponse.json({ ok: true });
}
