import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyTransition, type TransitionAction } from "@/lib/tickets";

const ACTIONS = new Set<TransitionAction>([
  "RECEIVE",
  "ASSIGN",
  "PROGRESS",
  "RESOLVE",
  "CONFIRM_CLOSE",
  "REJECT_RESOLVE",
  "CLOSE",
  "CANCEL",
  "REOPEN",
  "COMMENT",
]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id } = await ctx.params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) return NextResponse.json({ error: "BAD_ID" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as TransitionAction;
  if (!ACTIONS.has(action)) return NextResponse.json({ error: "BAD_ACTION" }, { status: 400 });

  const result = await applyTransition({
    ticketId,
    actor: user,
    action,
    comment: typeof body.comment === "string" ? body.comment : undefined,
    assignedToId: body.assignedToId != null ? Number(body.assignedToId) : undefined,
  });

  if (!result.ok) {
    const status = result.error === "FORBIDDEN" ? 403 : result.error === "NOT_FOUND" ? 404 : 422;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
