import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isIT } from "@/lib/constants";
import { saveAttachment, validateUpload } from "@/lib/uploads";

// GET: list attachments for a ticket
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await ctx.params;
  const ticketId = Number(id);

  const t = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!t) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!isIT(user.role) && t.requesterId !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const items = await prisma.ticketAttachment.findMany({
    where: { ticketId },
    orderBy: { uploadedAt: "asc" },
    select: { id: true, filename: true, size: true, mimeType: true, uploadedAt: true },
  });
  return NextResponse.json({ items });
}

// POST: upload one file (multipart/form-data, field "file")
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await ctx.params;
  const ticketId = Number(id);

  const t = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!t) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const canAttach =
    t.status !== "CANCELLED" &&
    t.status !== "CLOSED" &&
    (isIT(user.role) || t.requesterId === user.id);
  if (!canAttach) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }

  const err = validateUpload(file.name, file.size);
  if (err) return NextResponse.json({ error: err }, { status: 422 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const storedName = await saveAttachment(ticketId, file.name, bytes);

  const rec = await prisma.$transaction(async (tx) => {
    const a = await tx.ticketAttachment.create({
      data: {
        ticketId,
        filename: file.name,
        storedName,
        size: file.size,
        mimeType: file.type || null,
      },
      select: { id: true, filename: true, size: true, uploadedAt: true },
    });
    await tx.ticketEvent.create({
      data: {
        ticketId,
        actorId: user.id,
        action: "COMMENT",
        comment: `แนบไฟล์: ${file.name}`,
      },
    });
    return a;
  });

  return NextResponse.json(rec);
}
