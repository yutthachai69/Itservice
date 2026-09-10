import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { actOnApproval } from "@/lib/tickets";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  await ctx.params; // ticket id in URL is contextual; approvalId comes in body
  const body = await req.json().catch(() => ({}));
  const approvalId = Number(body.approvalId);
  const decision = body.decision;
  if (!Number.isInteger(approvalId) || (decision !== "APPROVED" && decision !== "REJECTED")) {
    return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
  }

  const result = await actOnApproval({
    approvalId,
    actor: user,
    decision,
    comment: typeof body.comment === "string" ? body.comment : undefined,
  });

  if (!result.ok) {
    const status = result.error === "FORBIDDEN" ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
