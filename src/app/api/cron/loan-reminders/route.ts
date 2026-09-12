import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { fmtDate } from "@/lib/ui";

const SECRET = process.env.CRON_SECRET || "";
const IT_RECIPIENTS = (process.env.IT_NOTIFY_EMAIL || "")
  .split(/[;,]/)
  .map((email) => email.trim())
  .filter(Boolean);
const BASE = process.env.APP_BASE_URL || "http://localhost:3000";
const DAY = 86400000;

async function authorized(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && !SECRET) return false;
  if (SECRET) {
    const t = req.nextUrl.searchParams.get("token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    return t === SECRET;
  }
  // no secret configured -> allow a signed-in ADMIN (manual/dev trigger)
  const u = await getCurrentUser();
  return u?.role === "ADMIN";
}

async function run() {
  const now = new Date();
  const soonEnd = new Date(now.getTime() + 2 * DAY);

  const active = await prisma.loan.findMany({
    where: { status: { in: ["BOOKED", "ONLOAN"] }, returnedAt: null },
    include: {
      item: true,
      ticket: { select: { id: true, docNo: true, reqEmail: true, notifyEmail: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const overdue = active.filter((l) => l.dueDate < now);
  const dueSoon = active.filter((l) => l.dueDate >= now && l.dueDate <= soonEnd);

  let sent = 0;
  const mailRow = (l: (typeof active)[number]) =>
    `${escapeHtml(l.item.name)}${l.item.serial ? ` (S/N ${escapeHtml(l.item.serial)})` : ""} — ผู้ยืม ${escapeHtml(l.borrowerName)} — กำหนดคืน ${fmtDate(l.dueDate)}${l.ticket ? ` — ${escapeHtml(l.ticket.docNo)}` : ""}`;

  // per-borrower reminder (only when we can reach them via a linked ticket)
  for (const l of [...overdue, ...dueSoon]) {
    const to = l.ticket?.notifyEmail ? l.ticket.reqEmail : null;
    if (!to) continue;
    const late = l.dueDate < now;
    await sendMail({
      to,
      subject: `[${l.ticket!.docNo}] ${late ? "อุปกรณ์เลยกำหนดคืนแล้ว" : "ใกล้ถึงกำหนดคืนอุปกรณ์"}`,
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.6">
        <p>${late ? "อุปกรณ์ที่ยืมไปเลยกำหนดคืนแล้ว" : "อุปกรณ์ที่ยืมไปใกล้ถึงกำหนดคืน"}</p>
        <p><b>${escapeHtml(l.item.name)}</b>${l.item.serial ? ` (S/N ${escapeHtml(l.item.serial)})` : ""}<br/>
        กำหนดคืน: ${fmtDate(l.dueDate)}</p>
        <p>กรุณานำอุปกรณ์มาคืนที่ฝ่าย IT หรือติดต่อเพื่อขอต่ออายุการยืม</p>
        <p><a href="${escapeHtml(`${BASE}/tickets/${l.ticket!.id}`)}">${escapeHtml(l.ticket!.docNo)}</a></p>
      </div>`,
    });
    sent++;
  }

  // digest to the IT queue
  if (IT_RECIPIENTS.length > 0 && (overdue.length || dueSoon.length)) {
    await sendMail({
      to: IT_RECIPIENTS,
      subject: `สรุปการยืมอุปกรณ์: เลยกำหนด ${overdue.length} · ใกล้ถึงกำหนด ${dueSoon.length}`,
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.6">
        ${overdue.length ? `<h3>เลยกำหนดคืน (${overdue.length})</h3><ul>${overdue.map((l) => `<li>${mailRow(l)}</li>`).join("")}</ul>` : ""}
        ${dueSoon.length ? `<h3>ใกล้ถึงกำหนดคืน 2 วัน (${dueSoon.length})</h3><ul>${dueSoon.map((l) => `<li>${mailRow(l)}</li>`).join("")}</ul>` : ""}
        <p><a href="${escapeHtml(`${BASE}/loans?view=overdue`)}">เปิดรายการยืม-คืน</a></p>
      </div>`,
    });
    sent++;
  }

  return { checkedAt: now.toISOString(), active: active.length, overdue: overdue.length, dueSoon: dueSoon.length, emailsSent: sent };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "METHOD_NOT_ALLOWED", message: "ใช้ POST เพื่อเรียกงานแจ้งเตือน" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  return NextResponse.json(await run());
}
