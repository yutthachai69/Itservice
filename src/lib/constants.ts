// Shared enums/labels. SQL Server stores these as plain strings.

export const SITES: { code: string; name: string }[] = [
  { code: "01", name: "TUSMBKK" },
  { code: "02", name: "TUSM" },
  { code: "03", name: "TKSM" },
  { code: "04", name: "TSE" },
  { code: "05", name: "TSMB" },
  { code: "06", name: "TTSM" },
];

export const siteName = (code: string) =>
  SITES.find((s) => s.code === code)?.name ?? code;

export type Role = "USER" | "IT_STAFF" | "IT_LEAD" | "ADMIN";
export const isIT = (role: string) =>
  role === "IT_STAFF" || role === "IT_LEAD" || role === "ADMIN";

// overall ticket status
export const STATUS = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
} as const;

export const STATUS_LABEL: Record<string, string> = {
  OPEN: "เปิดเรื่อง",
  IN_PROGRESS: "กำลังดำเนินการ",
  RESOLVED: "ดำเนินการเสร็จ",
  CLOSED: "ปิดงาน",
  CANCELLED: "ยกเลิก",
};

export const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800 ring-amber-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 ring-blue-200",
  RESOLVED: "bg-violet-100 text-violet-800 ring-violet-200",
  CLOSED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-neutral-200 text-neutral-600 ring-neutral-300",
};

export const IT_STATUS_LABEL: Record<string, string> = {
  NEW: "ยังไม่รับงาน",
  RECEIVED: "รับงานแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  CLOSED: "ปิดงานแล้ว",
};

// event action → label
export const ACTION_LABEL: Record<string, string> = {
  CREATE: "เปิดเรื่อง",
  EDIT: "แก้ไขข้อมูล",
  RECEIVE: "รับงาน",
  ASSIGN: "มอบหมายงาน",
  PROGRESS: "อัปเดตความคืบหน้า",
  RESOLVE: "แจ้งเสร็จ",
  CONFIRM_CLOSE: "ผู้แจ้งยืนยันปิดงาน",
  REJECT_RESOLVE: "ผู้แจ้งแจ้งว่ายังไม่เรียบร้อย",
  CLOSE: "ปิดงาน",
  CANCEL: "ยกเลิกเรื่อง",
  COMMENT: "ความเห็น",
  APPROVE: "อนุมัติ",
  REJECT: "ไม่อนุมัติ",
  REOPEN: "เปิดเรื่องอีกครั้ง",
};
