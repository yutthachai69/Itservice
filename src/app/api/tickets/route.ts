import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createTicket } from "@/lib/tickets";
import { getFormDef } from "@/lib/form-defs";
import { isIT } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  let body: { formType?: string; data?: Record<string, unknown>; notifyEmail?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  if (!body.formType || typeof body.data !== "object" || body.data == null) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const def = getFormDef(body.formType);
  if (def?.initiatedByIT && !isIT(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const result = await createTicket({
    user,
    formType: body.formType,
    raw: { ...body.data, notifyEmail: body.notifyEmail },
  });

  if (!result.ok) {
    return NextResponse.json({ error: "VALIDATION", fields: result.errors }, { status: 422 });
  }
  return NextResponse.json({ id: result.ticket.id, docNo: result.ticket.docNo });
}
