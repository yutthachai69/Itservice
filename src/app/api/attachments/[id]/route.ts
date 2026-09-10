import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isIT } from "@/lib/constants";
import { readAttachment, deleteAttachment } from "@/lib/uploads";

async function load(id: string) {
  const attId = Number(id);
  if (!Number.isInteger(attId)) return null;
  return prisma.ticketAttachment.findUnique({
    where: { id: attId },
    include: { ticket: { select: { id: true, requesterId: true, status: true } } },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const att = await load(id);
  if (!att) return new Response("not found", { status: 404 });
  if (!isIT(user.role) && att.ticket.requesterId !== user.id) {
    return new Response("forbidden", { status: 403 });
  }

  let buf: Buffer;
  try {
    buf = await readAttachment(att.storedName);
  } catch {
    return new Response("file missing", { status: 410 });
  }

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": att.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(att.filename)}`,
      "Content-Length": String(buf.length),
    },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await ctx.params;
  const att = await load(id);
  if (!att) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const canDelete =
    att.ticket.status !== "CLOSED" &&
    att.ticket.status !== "CANCELLED" &&
    (isIT(user.role) || att.ticket.requesterId === user.id);
  if (!canDelete) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.$transaction(async (tx) => {
    await tx.ticketAttachment.delete({ where: { id: att.id } });
    await tx.ticketEvent.create({
      data: {
        ticketId: att.ticket.id,
        actorId: user.id,
        action: "COMMENT",
        comment: `ลบไฟล์แนบ: ${att.filename}`,
      },
    });
  });
  await deleteAttachment(att.storedName);

  return NextResponse.json({ ok: true });
}
