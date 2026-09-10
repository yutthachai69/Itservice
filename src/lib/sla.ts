import { businessHoursBetween } from "./business-hours";

export interface SlaInfo {
  dueAt: Date | null;
  /** true when past due and IT has not received the job yet */
  overdue: boolean;
  /** business hours overdue (0 when not overdue) */
  overdueHours: number;
  text: string; // "เกินเวลามา 2 วัน 3 ชม." | "เหลือ 5 ชม.ทำการ" | ""
}

export function computeSla(opts: {
  slaDueAt: Date | string | null;
  itStatus: string;
  now?: Date;
}): SlaInfo {
  const now = opts.now ?? new Date();
  const dueAt = opts.slaDueAt ? new Date(opts.slaDueAt) : null;
  const active = opts.itStatus === "NEW"; // still waiting to be picked up

  if (!dueAt || !active) {
    return { dueAt, overdue: false, overdueHours: 0, text: "" };
  }

  if (now.getTime() > dueAt.getTime()) {
    const h = businessHoursBetween(dueAt, now);
    return { dueAt, overdue: true, overdueHours: h, text: `เกินเวลามา ${humanizeHours(h)}` };
  }
  const left = businessHoursBetween(now, dueAt);
  return { dueAt, overdue: false, overdueHours: 0, text: `เหลือ ${humanizeHours(left)}ทำการ` };
}

/** hours (float) -> "1 วัน 2 ชม. 30 นาที" using 9 working hours / day */
function humanizeHours(hours: number): string {
  const totalMin = Math.max(0, Math.round(hours * 60));
  const workdayMin = 9 * 60;
  const days = Math.floor(totalMin / workdayMin);
  const rem = totalMin % workdayMin;
  const h = Math.floor(rem / 60);
  const m = rem % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} วันทำการ`);
  if (h) parts.push(`${h} ชม.`);
  if (m || parts.length === 0) parts.push(`${m} นาที`);
  return parts.join(" ");
}
