// Business-hours calculator. Working time = Mon–Fri, 08:00–17:00 local (9h/day),
// minus any public holidays passed in as a Set of "YYYY-MM-DD" keys.

export const WORK_START_HOUR = 8;
export const WORK_END_HOUR = 17;
export const WORK_HOURS_PER_DAY = WORK_END_HOUR - WORK_START_HOUR; // 9

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isOff(d: Date, holidays?: Set<string>) {
  const day = d.getDay();
  if (day === 0 || day === 6) return true;
  return holidays ? holidays.has(dateKey(d)) : false;
}

/** clamp a date forward to the next moment inside working hours */
function snapForward(d: Date, holidays?: Set<string>): Date {
  const x = new Date(d);
  // walk forward over weekends / holidays / off-hours in <=1 day steps
  for (let guard = 0; guard < 400; guard++) {
    if (isOff(x, holidays)) {
      x.setDate(x.getDate() + 1);
      x.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }
    const h = x.getHours() + x.getMinutes() / 60;
    if (h < WORK_START_HOUR) {
      x.setHours(WORK_START_HOUR, 0, 0, 0);
      return x;
    }
    if (h >= WORK_END_HOUR) {
      x.setDate(x.getDate() + 1);
      x.setHours(WORK_START_HOUR, 0, 0, 0);
      continue;
    }
    return x;
  }
  return x;
}

/** add N business hours to a start date, skipping nights / weekends / holidays */
export function addBusinessHours(start: Date, hours: number, holidays?: Set<string>): Date {
  let cur = snapForward(start, holidays);
  let remainingMs = hours * 3600_000;

  for (let guard = 0; guard < 1000 && remainingMs > 0; guard++) {
    const endOfDay = new Date(cur);
    endOfDay.setHours(WORK_END_HOUR, 0, 0, 0);
    const msLeftToday = endOfDay.getTime() - cur.getTime();

    if (remainingMs <= msLeftToday) {
      return new Date(cur.getTime() + remainingMs);
    }
    remainingMs -= msLeftToday;
    // jump to start of next working day
    cur = snapForward(new Date(endOfDay.getTime() + 60_000), holidays);
  }
  return cur;
}

/** business hours elapsed between a and b (a <= b). Returns hours (float). */
export function businessHoursBetween(a: Date, b: Date, holidays?: Set<string>): number {
  if (b <= a) return 0;
  let cur = snapForward(a, holidays);
  if (cur >= b) return 0;
  let ms = 0;

  for (let guard = 0; guard < 1000; guard++) {
    const endOfDay = new Date(cur);
    endOfDay.setHours(WORK_END_HOUR, 0, 0, 0);
    const segEnd = b < endOfDay ? b : endOfDay;
    if (segEnd > cur) ms += segEnd.getTime() - cur.getTime();
    if (b <= endOfDay) break;
    cur = snapForward(new Date(endOfDay.getTime() + 60_000), holidays);
    if (cur >= b) break;
  }
  return ms / 3600_000;
}
