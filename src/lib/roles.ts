// Client-safe role constants (no server-only imports here).

export const ROLES = ["USER", "IT_STAFF", "IT_LEAD", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<string, string> = {
  USER: "ผู้ใช้ทั่วไป",
  IT_STAFF: "เจ้าหน้าที่ IT",
  IT_LEAD: "หัวหน้า IT",
  ADMIN: "ผู้ดูแลระบบ",
};
