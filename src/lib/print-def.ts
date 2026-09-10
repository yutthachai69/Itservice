// Per-form print layout — mirrors the physical TSM paper forms (IT01-IT-Fxx).
//
// Two shapes:
//  - "boxed"    : F06 / F11 / F12 / F03 — a USER box + an IT box, each with a
//                 two-column "detail | note" area and its own signature row.
//  - "approval" : F07 / F10 — a detail box beside an approver signature column,
//                 then a separate "ส่วนเทคโนโลยีสารสนเทศ" box.

export type PrintLayout = "boxed" | "approval";

export interface PrintDef {
  title: string;
  docCode: string; // e.g. "IT01-IT-F06 Rev.3"
  layout: PrintLayout;

  /** checkboxes shown under "รายละเอียดรายการ" — the form-def field key */
  checkboxField?: string;
  /** free-text field key rendered in the big left box */
  reasonField?: string;
  reasonLabel: string;

  /** boxed: label of the IT-side box (F03 overrides with device details) */
  itBoxLabel?: string;
  /** boxed: extra labelled field keys listed inside the USER box (F12) */
  userExtraFields?: string[];
  /** boxed: caption under the USER signature */
  userSignature: string;
  /** boxed: the three IT-side signatures */
  itSignatures?: string[];
  /** F03: render the borrowed-equipment details in the IT box */
  loanDetails?: boolean;

  /** approval: signatures inside the IT box */
  itBoxSignatures?: string[];
  /** approval: small print under the approver column */
  approvalNote?: string;
}

const IT_SIGS = ["ผู้รับงาน", "ผู้ให้บริการ", "หัวหน้างาน"];

export const PRINT_DEFS: Record<string, PrintDef> = {
  F06: {
    title: "แบบฟอร์มขอรับบริการระบบคอมพิวเตอร์",
    docCode: "IT01-IT-F06",
    layout: "boxed",
    checkboxField: "problemTypes",
    reasonField: "problemDetail",
    reasonLabel: "สาเหตุที่ขอใช้ระบบ",
    itBoxLabel: "ปัญหา/การดำเนินการ",
    userSignature: "ผู้ขอรับบริการระบบคอมพิวเตอร์",
    itSignatures: IT_SIGS,
  },
  F11: {
    title: "แบบฟอร์มขอเปลี่ยนหรือแก้ไขรหัสผ่าน",
    docCode: "IT01-IT-F11",
    layout: "boxed",
    checkboxField: "passwordTypes",
    reasonField: "reason",
    reasonLabel: "สาเหตุที่ขอเปลี่ยนหรือแก้ไข",
    itBoxLabel: "ปัญหา/การดำเนินการ",
    userSignature: "ผู้ขอเปลี่ยนหรือแก้ไขรหัสผ่าน",
    itSignatures: IT_SIGS,
  },
  F12: {
    title: "แบบฟอร์มขอใช้งานระบบ Video Conference",
    docCode: "IT01-IT-F12",
    layout: "boxed",
    checkboxField: "meetingTypes",
    reasonLabel: "สาเหตุที่ขอใช้ระบบ",
    itBoxLabel: "ปัญหา/การดำเนินการ",
    userExtraFields: [
      "subject",
      "startAt",
      "endAt",
      "program",
      "location",
      "participantCount",
      "roomCreator",
      "wifiCount",
      "projectorEquipment",
      "meetingLink",
    ],
    userSignature: "ผู้ขอใช้ระบบ Video Conference",
    itSignatures: IT_SIGS,
  },
  F03: {
    title: "แบบฟอร์มยืมอุปกรณ์ชั่วคราว",
    docCode: "IT01-IT-F03",
    layout: "boxed",
    reasonField: "purpose",
    reasonLabel: "รายการที่เบิก/ยืม",
    userExtraFields: ["borrowDate", "returnDate"],
    loanDetails: true,
    itBoxLabel: "รายละเอียด รุ่น/Spec",
    userSignature: "ผู้ขอยืม/ผู้เบิกคืน",
    itSignatures: IT_SIGS,
  },
  F02: {
    title: "แบบฟอร์มส่งมอบคอมพิวเตอร์",
    docCode: "IT01-IT-F02",
    layout: "boxed",
    reasonLabel: "รายการที่ส่งมอบ",
    userExtraFields: [
      "receiverName",
      "receiverDept",
      "receiverPosition",
      "receiverEmail",
      "pcAsset",
      "itemName",
      "brand",
      "model",
      "serialNumber",
      "condition",
      "handoverDate",
    ],
    itBoxLabel: "หมายเหตุการส่งมอบ",
    userSignature: "ผู้รับมอบ",
    itSignatures: ["ผู้ส่งมอบ (IT)", "ผู้รับมอบ", "หัวหน้างาน"],
  },
  F07: {
    title: "แบบฟอร์มขอแก้ไขข้อมูลระบบ",
    docCode: "IT01-IT-F07 Rev.3",
    layout: "approval",
    checkboxField: "system",
    reasonField: "changeDetail",
    reasonLabel: "ระบุรายละเอียดของปัญหา",
    userSignature: "ผู้ขอ",
    itBoxSignatures: ["ผู้อนุมัติ", "ผู้แก้ไข"],
    approvalNote:
      "หมายเหตุ : สำนักงานกรุงเทพ ผู้ตรวจสอบ = ผู้จัดการฝ่าย / โรงงาน ผู้ตรวจสอบ = หน.แผนก/หน.ส่วน/ผู้จัดการฝ่าย, ผู้อนุมัติ = ผู้จัดการฝ่ายสำนักงาน/รองผู้อำนวยการโรงงาน/ผู้จัดการโรงงาน",
  },
  F10: {
    title: "แบบฟอร์มขอใช้งาน/ยกเลิก ระบบเทคโนโลยีสารสนเทศ",
    docCode: "IT01-IT-F10 Rev.5",
    layout: "approval",
    checkboxField: "items",
    reasonField: "detail",
    reasonLabel: "ระบุรายละเอียดการขอใช้งาน/ยกเลิก ระบบเทคโนโลยีสารสนเทศ",
    userSignature: "ผู้ขอสิทธิ์ใช้งาน",
    itBoxSignatures: ["ผู้อนุมัติให้ดำเนินการ", "ผู้ดำเนินการ"],
    approvalNote:
      "หมายเหตุ ผู้ขอสิทธิ์ใช้งาน = หน.แผนก/หน.ส่วน หรือผู้ที่มีตำแหน่งสูงกว่าผู้ได้รับสิทธิ์ในการขอ, ผู้ตรวจสอบ = ผู้จัดการฝ่าย, ผู้อนุมัติให้สิทธิ์ = COO/CFO, กรรมการผู้จัดการ, ประธานกรรมการ/CEO",
  },
};

export const getPrintDef = (t: string): PrintDef =>
  PRINT_DEFS[t] ?? {
    title: "แบบฟอร์มให้บริการเทคโนโลยีสารสนเทศ",
    docCode: `IT01-IT-${t}`,
    layout: "boxed",
    reasonLabel: "รายละเอียด",
    userSignature: "ผู้ขอรับบริการ",
    itSignatures: IT_SIGS,
  };
