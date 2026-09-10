import { prisma } from "./db";

let cache: { at: number; set: Set<string> } | null = null;
const TTL = 5 * 60 * 1000; // 5 min

/** Set of "YYYY-MM-DD" holiday keys, lightly cached. */
export async function getHolidaySet(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < TTL) return cache.set;
  const rows = await prisma.holiday.findMany({ select: { dateKey: true } });
  const set = new Set(rows.map((r) => r.dateKey));
  cache = { at: Date.now(), set };
  return set;
}

export function invalidateHolidayCache() {
  cache = null;
}
