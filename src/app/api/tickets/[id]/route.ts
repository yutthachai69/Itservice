import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateTicket } from "@/lib/tickets";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id } = await ctx.params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) return NextResponse.json({ error: "BAD_ID" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.data !== "object" || body.data == null) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const result = await updateTicket({ ticketId, user, raw: body.data });
  if (!result.ok) {
    if (result.error === "VALIDATION") {
      return NextResponse.json({ error: "VALIDATION", fields: result.fields }, { status: 422 });
    }
    const status =
      result.error === "FORBIDDEN" ? 403 : result.error === "NOT_FOUND" ? 404 : 422;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
