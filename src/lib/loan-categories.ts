// Client-safe. Categories for loanable equipment; also the F03 "ประเภทอุปกรณ์" options.

export const LOAN_CATEGORIES: { value: string; label: string }[] = [
  { value: "notebook", label: "โน้ตบุ๊ค" },
  { value: "speakerphone", label: "ลำโพงประชุม (ปลาดาว)" },
  { value: "projector", label: "โปรเจกเตอร์" },
  { value: "monitor", label: "จอมอนิเตอร์" },
  { value: "adapter", label: "อุปกรณ์เสริม/สาย/Adapter" },
  { value: "other", label: "อื่นๆ" },
];

export const categoryLabel = (v: string) =>
  LOAN_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export const LOAN_ITEM_STATUS: Record<string, string> = {
  AVAILABLE: "พร้อมให้ยืม",
  MAINTENANCE: "ซ่อม/ตรวจเช็ค",
  RETIRED: "ปลดระวาง",
};

export const LOAN_STATUS: Record<string, string> = {
  BOOKED: "จองไว้",
  ONLOAN: "กำลังยืม",
  RETURNED: "คืนแล้ว",
  CANCELLED: "ยกเลิก",
};
