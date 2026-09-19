import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id } = await ctx.params;
  const ticketId = Number(id);
  const body = await req.json().catch(() => ({}));
  const score = Number(body.score);
  const scoreQuality = Number(body.scoreQuality);
  const scoreSpeed = Number(body.scoreSpeed);
  const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= 5;
  if (!Number.isInteger(ticketId) || !inRange(score) || !inRange(scoreQuality) || !inRange(scoreSpeed)) {
    return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
  }

  const t = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { evaluation: true } });
  if (!t) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (t.requesterId !== user.id) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (t.evaluation) return NextResponse.json({ error: "ALREADY_RATED" }, { status: 409 });
  if (t.status !== "CLOSED") {
    return NextResponse.json({ error: "NOT_READY" }, { status: 422 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.evaluation.create({
      data: {
        ticketId,
        raterId: user.id,
        score,
        scoreQuality,
        scoreSpeed,
        comment: typeof body.comment === "string" ? body.comment.trim() || null : null,
      },
    });
    await tx.ticket.update({
      where: { id: ticketId },
      data: { userStatus: "ประเมินแล้ว" },
    });
    const avg = Math.round(((score + scoreQuality + scoreSpeed) / 3) * 10) / 10;
    await tx.ticketEvent.create({
      data: { ticketId, actorId: user.id, action: "COMMENT", comment: `ประเมินเฉลี่ย ${avg}/5 (พึงพอใจ ${score} · เรียบร้อย ${scoreQuality} · รวดเร็ว ${scoreSpeed})` },
    });
  });

  return NextResponse.json({ ok: true });
}
