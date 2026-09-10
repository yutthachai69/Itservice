import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isIT } from "@/lib/constants";
import { returnLoan } from "@/lib/loans";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isIT(user.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const loanId = Number(id);
  if (!Number.isInteger(loanId)) return NextResponse.json({ error: "BAD_ID" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const result = await returnLoan({
    loanId,
    actor: user,
    note: typeof body.note === "string" ? body.note : undefined,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "NOT_FOUND" ? 404 : 422 });
  }
  return NextResponse.json({ ok: true });
}
