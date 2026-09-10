import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Document number = YYMMNNN
 *   YY = Buddhist year, last 2 digits
 *   MM = month
 *   NNN = running number within that month (min 3 digits, grows if needed)
 * e.g. 2026-09 -> "6909" + "001"
 * Must be called inside a transaction to keep the counter consistent.
 */
export async function nextDocNo(tx: Tx, when: Date = new Date()): Promise<string> {
  const beYear = when.getFullYear() + 543;
  const yy = String(beYear % 100).padStart(2, "0");
  const mm = String(when.getMonth() + 1).padStart(2, "0");
  const period = `${yy}${mm}`;

  const counter = await tx.docCounter.upsert({
    where: { period },
    create: { period, seq: 1 },
    update: { seq: { increment: 1 } },
  });

  return `${period}${String(counter.seq).padStart(3, "0")}`;
}
