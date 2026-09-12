import { prisma } from "./db";
import type { SessionUser } from "./auth";

/**
 * Items due back "today" (BOOKED/ONLOAN, dueDate = today) stop blocking new
 * bookings from this hour of the day onward — gives IT a return/check/re-issue
 * buffer instead of advertising the item as free the instant it's nominally due.
 * Doesn't affect overdue items (dueDate before today) — those stay blocked
 * until actually logged as returned.
 */
const SAME_DAY_READY_HOUR = 15; // 15:00 local time

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** items of `category` that are AVAILABLE and free of any BOOKED/ONLOAN overlapping [from,to] */
export async function availableItems(opts: {
  category: string;
  from: Date;
  to: Date;
  siteCode?: string;
  excludeLoanId?: number;
}) {
  const now = new Date();
  const busy = await prisma.loan.findMany({
    where: {
      status: { in: ["BOOKED", "ONLOAN"] },
      borrowDate: { lte: opts.to },
      dueDate: { gte: opts.from },
      ...(opts.excludeLoanId ? { id: { not: opts.excludeLoanId } } : {}),
    },
    select: { itemId: true, dueDate: true },
  });
  const busyIds = new Set(
    busy
      .filter((b) => {
        const dueToday = isSameCalendarDay(b.dueDate, now);
        const pastBuffer = dueToday && now.getHours() >= SAME_DAY_READY_HOUR;
        return !pastBuffer; // still counts as busy unless it's past today's return buffer
      })
      .map((b) => b.itemId),
  );

  const items = await prisma.loanItem.findMany({
    where: {
      category: opts.category,
      status: "AVAILABLE",
      ...(opts.siteCode ? { siteCode: opts.siteCode } : {}),
    },
    orderBy: { name: "asc" },
  });
  return items.filter((i) => !busyIds.has(i.id));
}

function parseWindow(borrow: unknown, due: unknown) {
  const from = new Date(String(borrow));
  const to = new Date(String(due));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  if (to < from) return null;
  return { from, to };
}

/** IT lends a specific item against an F03 ticket */
export async function lendItem(opts: { ticketId: number; itemId: number; actor: SessionUser }) {
  const t = await prisma.ticket.findUnique({ where: { id: opts.ticketId } });
  if (!t) return { ok: false as const, error: "NOT_FOUND" };
  if (t.formType !== "F03") return { ok: false as const, error: "ไม่ใช่คำร้องยืมอุปกรณ์" };
  if (t.status === "CLOSED" || t.status === "CANCELLED")
    return { ok: false as const, error: "คำร้องปิดแล้ว" };

  let fd: Record<string, unknown> = {};
  try {
    fd = JSON.parse(t.formData);
  } catch {
    /* ignore */
  }
  const win = parseWindow(fd.borrowDate, fd.returnDate);
  if (!win) return { ok: false as const, error: "วันยืม/คืนในคำร้องไม่ถูกต้อง" };

  const item = await prisma.loanItem.findUnique({ where: { id: opts.itemId } });
  if (!item || item.status !== "AVAILABLE")
    return { ok: false as const, error: "อุปกรณ์ไม่พร้อมให้ยืม" };

  const free = await availableItems({ category: item.category, from: win.from, to: win.to });
  if (!free.some((i) => i.id === item.id))
    return { ok: false as const, error: "อุปกรณ์ชิ้นนี้ถูกจองในช่วงเวลาดังกล่าวแล้ว" };

  const today = new Date();
  const status = win.from > today ? "BOOKED" : "ONLOAN";

  await prisma.$transaction(async (tx) => {
    await tx.loan.create({
      data: {
        itemId: item.id,
        ticketId: t.id,
        borrowerName: t.reqName,
        borrowDate: win.from,
        dueDate: win.to,
        status,
        createdById: opts.actor.id,
      },
    });
    await tx.ticket.update({
      where: { id: t.id },
      data: {
        status: "RESOLVED",
        itStatus: "IN_PROGRESS",
        assignedToId: t.assignedToId ?? opts.actor.id,
        receivedAt: t.receivedAt ?? today,
        resolvedAt: today,
        userStatus: "ให้ยืมแล้ว รอคืนอุปกรณ์",
      },
    });
    await tx.ticketEvent.create({
      data: {
        ticketId: t.id,
        actorId: opts.actor.id,
        action: "PROGRESS",
        comment: `ให้ยืม: ${item.name}${item.serial ? ` (S/N ${item.serial})` : ""}`,
      },
    });
  });

  return { ok: true as const };
}

/** active loans past their due date */
export async function overdueLoans(siteCode?: string) {
  return prisma.loan.findMany({
    where: {
      status: { in: ["BOOKED", "ONLOAN"] },
      returnedAt: null,
      dueDate: { lt: new Date() },
      ...(siteCode ? { ticket: { siteCode } } : {}),
    },
    include: { item: true, ticket: { select: { id: true, docNo: true } } },
    orderBy: { dueDate: "asc" },
  });
}

/** IT extends the due date of an active loan (checks no clash with other bookings) */
export async function extendLoan(opts: { loanId: number; actor: SessionUser; dueDate: string }) {
  const loan = await prisma.loan.findUnique({ where: { id: opts.loanId } });
  if (!loan) return { ok: false as const, error: "NOT_FOUND" };
  if (loan.status !== "BOOKED" && loan.status !== "ONLOAN")
    return { ok: false as const, error: "การยืมนี้ไม่ได้อยู่ระหว่างยืม" };

  const newDue = new Date(opts.dueDate);
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.dueDate) || Number.isNaN(newDue.getTime()) || newDue < loan.borrowDate)
    return { ok: false as const, error: "วันคืนใหม่ไม่ถูกต้อง" };
  if (opts.dueDate < todayKey)
    return { ok: false as const, error: "วันคืนใหม่ต้องไม่ย้อนหลัง" };

  const clash = await prisma.loan.findFirst({
    where: {
      id: { not: loan.id },
      itemId: loan.itemId,
      status: { in: ["BOOKED", "ONLOAN"] },
      borrowDate: { lte: newDue },
      dueDate: { gte: loan.borrowDate },
    },
  });
  if (clash) return { ok: false as const, error: "ช่วงเวลาใหม่ทับกับการจองอื่นของอุปกรณ์ชิ้นนี้" };

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({ where: { id: loan.id }, data: { dueDate: newDue } });
    if (loan.ticketId) {
      await tx.ticketEvent.create({
        data: {
          ticketId: loan.ticketId,
          actorId: opts.actor.id,
          action: "PROGRESS",
          comment: `ต่ออายุการยืม กำหนดคืนใหม่ ${opts.dueDate}`,
        },
      });
    }
  });
  return { ok: true as const };
}

export async function returnLoan(opts: { loanId: number; actor: SessionUser; note?: string }) {
  const loan = await prisma.loan.findUnique({ where: { id: opts.loanId }, include: { item: true } });
  if (!loan) return { ok: false as const, error: "NOT_FOUND" };
  if (loan.status === "RETURNED") return { ok: false as const, error: "คืนแล้ว" };

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loan.id },
      data: { status: "RETURNED", returnedAt: new Date(), note: opts.note?.trim() || loan.note },
    });
    if (loan.ticketId) {
      const outstanding = await tx.loan.count({
        where: { ticketId: loan.ticketId, status: { in: ["BOOKED", "ONLOAN"] } },
      });
      await tx.ticketEvent.create({
        data: {
          ticketId: loan.ticketId,
          actorId: opts.actor.id,
          action: "PROGRESS",
          comment: `รับคืน: ${loan.item.name}`,
        },
      });
      if (outstanding === 0) {
        await tx.ticket.update({
          where: { id: loan.ticketId },
          data: { userStatus: "รับคืนอุปกรณ์ครบแล้ว รอปิดงาน" },
        });
      }
    }
  });

  return { ok: true as const };
}
