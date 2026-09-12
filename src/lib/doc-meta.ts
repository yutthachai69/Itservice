import type { LucideIcon } from "lucide-react";
import {
  DatabaseZap,
  KeyRound,
  Laptop,
  MonitorCog,
  PackageCheck,
  ShieldCheck,
  UserCog,
  Video,
} from "lucide-react";
import { FORM_DEFS } from "./form-defs";

// Human titles for the downloadable form PDFs that aren't ticket types
// (so they don't have a FormDef of their own).
export const EXTRA_TITLES: Record<string, string> = {
  F01: "ทะเบียนประวัติเครื่องคอมพิวเตอร์",
  F08: "แบบฟอร์ม F08",
  F15: "แบบฟอร์ม F15",
  F16: "แบบฟอร์ม F16",
  ITR: "IT Request (ITR)",
};

export const titleFor = (code: string) => FORM_DEFS[code]?.title ?? EXTRA_TITLES[code] ?? code;

// one-line "ใช้สำหรับ…" per form — FormDef.title is usually just "แบบฟอร์ม" +
// shortTitle, so it reads as a near-duplicate of the page's own <h1>. This is
// what actually earns the subtitle line (used on /documents and the
// "เปิดคำร้องใหม่" page header).
export const DESC: Record<string, string> = {
  F02: "บันทึกการส่งมอบเครื่องคอมพิวเตอร์ให้ผู้รับ",
  F03: "ยืมโน้ตบุ๊ก โปรเจกเตอร์ จอ หรืออุปกรณ์เสริมชั่วคราว",
  F06: "แจ้งปัญหาคอมพิวเตอร์ โปรแกรม เครือข่าย หรือขอรับบริการ IT",
  F07: "ขอแก้ไข/เปลี่ยนแปลงข้อมูลในระบบงาน (ERP Softpro ฯลฯ)",
  F10: "ขอเปิด/ยกเลิกสิทธิ์เข้าใช้งานระบบ IT (User, ไดรฟ์แชร์, เครื่องปริ้น…)",
  F11: "ขอเปลี่ยน/รีเซ็ตรหัสผ่านคอมพิวเตอร์ อีเมล หรือระบบงาน",
  F12: "ขอเตรียมระบบประชุม/อบรมออนไลน์ (Teams / Zoom / Google Meet)",
  F13: "ขอสิทธิ์/ปรับปรุงสิทธิ์การใช้งานระบบ ERP Softpro",
};

// same icon per form code everywhere it's shown (sidebar service list, home
// cards, documents cards, ticket-form header) — one shared map instead of
// four copies drifting apart.
export const SERVICE_ICON: Record<string, LucideIcon> = {
  F06: MonitorCog,
  F11: KeyRound,
  F10: ShieldCheck,
  F03: Laptop,
  F12: Video,
  F07: DatabaseZap,
  F02: PackageCheck,
  F13: UserCog,
};

// the uploaded PDFs for these codes have overlapping/broken text boxes baked
// into the original export. We already know their exact field layout (it
// drives the ticket form + the real print output), so we regenerate a clean
// blank copy at /documents/blank/[code] instead of linking to the broken file.
export const REGENERATED = new Set(["F03", "F06", "F11", "F12"]);

/** where "view this blank form" / "download this blank form" should point */
export function docUrls(code: string) {
  if (REGENERATED.has(code)) {
    return { view: `/documents/blank/${code}`, download: `/documents/blank/${code}?print=1` };
  }
  return { view: `/api/documents/${code}`, download: `/api/documents/${code}?mode=download` };
}
