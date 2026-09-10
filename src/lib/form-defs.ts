// Form definitions for v1 ticket types (F06, F07, F10, F11, F12).
// Drives: the dynamic form renderer, server-side validation, and the print view.

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "checkboxes" // multi-select -> string[]
  | "date"
  | "datetime"
  | "email"
  | "tel"
  | "number";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  maxLength?: number;
  placeholder?: string;
  help?: string;
  colSpan?: 1 | 2; // grid columns (of 2)
}

export interface SectionDef {
  title: string;
  fields: FieldDef[];
}

export interface ApprovalStepDef {
  step: "CHECK" | "ACCOUNTING" | "APPROVE";
  label: string;
  approverType: "IT" | "ACCOUNTING";
  fieldKey: string; // key in formData holding chosen approverId
}

export interface FormDef {
  type: string; // F06 ...
  code: string; // "F06"
  title: string;
  shortTitle: string;
  manual?: string; // pdf name
  slaHours: number;
  /** userStatus text while waiting for IT */
  initialUserStatus: string;
  sections: SectionDef[];
  approvals?: ApprovalStepDef[];
  /**
   * IT opens this form (e.g. F02 handover) — not a normal user request.
   * On create the ticket goes straight to RESOLVED with the creator as assignee;
   * IT then confirms the counterpart acknowledged (CONFIRM_CLOSE) to close it.
   */
  initiatedByIT?: boolean;
  /** for initiatedByIT forms: formData key holding the counterpart's email */
  counterpartEmailKey?: string;
}

const YESNO = [
  { value: "yes", label: "ใช่" },
  { value: "no", label: "ไม่ใช่" },
];

// ---- shared blocks -------------------------------------------------

const requesterSection: SectionDef = {
  title: "รายละเอียดผู้ขอ (ตรวจสอบให้ถูกต้อง)",
  fields: [
    { key: "reqName", label: "ชื่อ-นามสกุล", type: "text", required: true, colSpan: 1 },
    { key: "reqPosition", label: "ตำแหน่ง", type: "text", colSpan: 1 },
    { key: "reqPhone", label: "เบอร์โทร/เบอร์โต๊ะ", type: "tel", maxLength: 20, colSpan: 1 },
    { key: "reqEmail", label: "E-Mail", type: "email", maxLength: 70, colSpan: 1 },
  ],
};

const serviceSiteField: FieldDef = {
  key: "serviceSiteCode",
  label: "บริษัทที่ขอรับบริการ",
  type: "select",
  required: true,
  colSpan: 1,
  options: [], // filled from SITES at render time
};

// ---- F06 ---------------------------------------------------------------

const F06: FormDef = {
  type: "F06",
  code: "F06",
  title: "แบบฟอร์มขอรับบริการระบบคอมพิวเตอร์",
  shortTitle: "ขอรับบริการระบบคอมพิวเตอร์",
  manual: "MN_F06.pdf",
  slaHours: 8, // F06
  initialUserStatus: "รอรับบริการ",
  sections: [
    requesterSection,
    {
      title: "รายละเอียดรายการ",
      fields: [
        serviceSiteField,
        {
          key: "problemTypes",
          label: "ประเภทปัญหา",
          type: "checkboxes",
          required: true,
          colSpan: 2,
          options: [
            { value: "software", label: "ส่วนของซอฟต์แวร์" },
            { value: "hardware", label: "ปัญหาระบบคอมพิวเตอร์" },
            { value: "other", label: "แก้ไขปัญหาอื่นๆ" },
          ],
        },
        {
          key: "problemDetail",
          label: "สาเหตุที่ขอรับบริการ / อาการที่พบ",
          type: "textarea",
          required: true,
          colSpan: 2,
          placeholder: "เกิดอะไรขึ้น เห็นข้อความอะไร และต้องการให้ IT ช่วยอย่างไร",
        },
      ],
    },
  ],
};

// ---- F07 ---------------------------------------------------------------

const F07: FormDef = {
  type: "F07",
  code: "F07",
  title: "แบบฟอร์มขอแก้ไขข้อมูลระบบ",
  shortTitle: "ขอแก้ไขข้อมูลระบบ",
  manual: "MN_F07.pdf",
  slaHours: 16, // F07
  initialUserStatus: "รอตรวจสอบ/อนุมัติ",
  sections: [
    requesterSection,
    {
      title: "รายละเอียดในการแก้ไขข้อมูลระบบ",
      fields: [
        serviceSiteField,
        {
          key: "system",
          label: "ระบบ",
          type: "select",
          required: true,
          colSpan: 1,
          options: [
            { value: "erp_softpro", label: "ระบบ ERP Softpro" },
            { value: "other", label: "อื่นๆ (ระบุ)" },
          ],
        },
        {
          key: "systemOther",
          label: "ระบุระบบ (เมื่อเลือก “อื่นๆ”)",
          type: "text",
          colSpan: 2,
          maxLength: 150,
        },
        { key: "changeDetail", label: "ระบุรายละเอียดของปัญหา", type: "textarea", required: true, colSpan: 2 },
        { key: "obstacles", label: "ปัญหาอุปสรรค (ถ้ามี)", type: "textarea", colSpan: 2 },
      ],
    },
  ],
  approvals: [
    { step: "CHECK", label: "ผู้ตรวจสอบ", approverType: "IT", fieldKey: "approverCheck" },
    { step: "ACCOUNTING", label: "ผู้ตรวจสอบ (บัญชี)", approverType: "ACCOUNTING", fieldKey: "approverAccounting" },
    { step: "APPROVE", label: "ผู้อนุมัติ", approverType: "IT", fieldKey: "approverApprove" },
  ],
};

// ---- F10 ---------------------------------------------------------------

const F10: FormDef = {
  type: "F10",
  code: "F10",
  title: "แบบฟอร์มขอใช้งาน/ยกเลิก ระบบเทคโนโลยีสารสนเทศ",
  shortTitle: "ขอใช้งาน/ยกเลิก ระบบ IT",
  manual: "MN_F10.pdf",
  slaHours: 16, // F10
  initialUserStatus: "รอตรวจสอบ/อนุมัติ",
  sections: [
    requesterSection,
    {
      title: "รายละเอียดในการขอใช้งาน/ยกเลิก ระบบเทคโนโลยีสารสนเทศ",
      fields: [
        { key: "reqNameEn", label: "ชื่อภาษาอังกฤษ (Name-Lastname)", type: "text", colSpan: 2, maxLength: 100 },
        {
          key: "action",
          label: "ขอใช้/ยกเลิก",
          type: "select",
          required: true,
          colSpan: 1,
          options: [
            { value: "request", label: "ขอใช้งานระบบ" },
            { value: "cancel", label: "ยกเลิกใช้งานระบบ" },
          ],
        },
        serviceSiteField,
        {
          key: "items",
          label: "รายการที่ขอใช้งาน/ยกเลิก",
          type: "checkboxes",
          required: true,
          colSpan: 2,
          options: [
            { value: "internal_user", label: "ชื่อผู้ใช้งานระบบภายใน" },
            { value: "user_softpro", label: "User Softpro" },
            { value: "rdp", label: "Remote Desktop User (ระบุชื่อระบบ)" },
            { value: "email", label: "Email" },
            { value: "share_drive", label: "สิทธิ์การใช้งานไดรฟ์แชร์" },
            { value: "printer", label: "สิทธิ์ใช้งานเครื่องปริ้น" },
            { value: "web_online", label: "ระบบการเว็บออนไลน์ (ระบุชื่อระบบ)" },
            { value: "other", label: "อื่นๆ" },
          ],
        },
        {
          key: "itemsDetail",
          label: "ระบุชื่อระบบ / รายละเอียดของรายการที่เลือก",
          type: "text",
          colSpan: 2,
          maxLength: 200,
        },
        { key: "detail", label: "ระบุรายละเอียดการขอใช้งาน/ยกเลิก ระบบเทคโนโลยีสารสนเทศ", type: "textarea", required: true, colSpan: 2 },
        { key: "obstacles", label: "ปัญหาอุปสรรค (ถ้ามี)", type: "textarea", colSpan: 2 },
      ],
    },
  ],
  approvals: [
    { step: "CHECK", label: "ผู้ตรวจสอบ", approverType: "IT", fieldKey: "approverCheck" },
    { step: "APPROVE", label: "ผู้อนุมัติให้สิทธิ์", approverType: "IT", fieldKey: "approverApprove" },
  ],
};

// ---- F11 ---------------------------------------------------------------

const F11: FormDef = {
  type: "F11",
  code: "F11",
  title: "แบบฟอร์มขอเปลี่ยนหรือแก้ไขรหัสผ่าน",
  shortTitle: "ขอเปลี่ยน/แก้ไขรหัสผ่าน",
  manual: "MN_F11.pdf",
  slaHours: 4, // F11
  initialUserStatus: "รอเปลี่ยน/แก้ไขรหัสผ่าน",
  sections: [
    requesterSection,
    {
      title: "รายละเอียดรายการ",
      fields: [
        serviceSiteField,
        {
          key: "passwordTypes",
          label: "ประเภทรหัสผ่าน",
          type: "checkboxes",
          required: true,
          colSpan: 2,
          options: [
            { value: "computer", label: "รหัสผ่านคอมพิวเตอร์" },
            { value: "email", label: "รหัสผ่าน Email" },
            { value: "softpro", label: "รหัสผ่านโปรแกรมซอฟต์โปร" },
            { value: "other", label: "รหัสผ่านระบบอื่นๆ" },
          ],
        },
        { key: "reason", label: "สาเหตุที่ขอเปลี่ยนหรือแก้ไข", type: "textarea", required: true, colSpan: 2 },
      ],
    },
  ],
};

// ---- F12 ---------------------------------------------------------------

const F12: FormDef = {
  type: "F12",
  code: "F12",
  title: "แบบฟอร์มขอใช้งานระบบ Video Conference",
  shortTitle: "ขอใช้ระบบ Video Conference",
  slaHours: 8, // F12
  initialUserStatus: "รอจัดเตรียมระบบ",
  sections: [
    requesterSection,
    {
      title: "รายละเอียดการประชุม/อบรม",
      fields: [
        serviceSiteField,
        {
          key: "meetingTypes",
          label: "ประเภท",
          type: "checkboxes",
          required: true,
          colSpan: 2,
          options: [
            { value: "meeting", label: "ประชุมออนไลน์" },
            { value: "training", label: "อบรมออนไลน์" },
            { value: "other", label: "อื่นๆ" },
          ],
        },
        { key: "subject", label: "เรื่องที่ประชุม/อบรม", type: "text", required: true, colSpan: 2 },
        { key: "startAt", label: "วันที่และเวลาเริ่มใช้", type: "datetime", required: true, colSpan: 1 },
        { key: "endAt", label: "วันที่และเวลาเลิกใช้", type: "datetime", required: true, colSpan: 1 },
        {
          key: "program",
          label: "โปรแกรมที่ประชุม/อบรม",
          type: "select",
          required: true,
          colSpan: 1,
          options: [
            { value: "teams", label: "Microsoft Teams" },
            { value: "zoom", label: "Zoom" },
            { value: "meet", label: "Google Meet" },
            { value: "other", label: "อื่นๆ" },
          ],
        },
        { key: "location", label: "สถานที่ห้องประชุม/อบรม", type: "text", colSpan: 1 },
        { key: "participants", label: "ผู้ร่วมประชุม/อบรม", type: "text", colSpan: 1 },
        { key: "participantCount", label: "จำนวนผู้ร่วมประชุม/อบรม", type: "number", colSpan: 1 },
        { key: "roomCreator", label: "ผู้สร้างห้องประชุม/อบรม", type: "text", colSpan: 1 },
        { key: "wifiCount", label: "จำนวนผู้ขอใช้ WIFI", type: "number", colSpan: 1 },
        { key: "meetingLink", label: "ลิงก์ประชุม", type: "textarea", colSpan: 2 },
        { key: "projectorEquipment", label: "อุปกรณ์ที่นำมาใช้กับ Projector", type: "text", colSpan: 2 },
      ],
    },
  ],
};

// ---- F02  (IT-initiated: computer handover) --------------------------

const F02: FormDef = {
  type: "F02",
  code: "F02",
  title: "แบบฟอร์มส่งมอบคอมพิวเตอร์",
  shortTitle: "ส่งมอบคอมพิวเตอร์",
  manual: "MN_F02.pdf",
  slaHours: 8,
  initialUserStatus: "รอผู้รับมอบยืนยันการรับมอบ",
  initiatedByIT: true,
  counterpartEmailKey: "receiverEmail",
  sections: [
    {
      title: "ผู้ส่งมอบ (IT)",
      fields: [
        { key: "reqName", label: "ชื่อผู้ส่งมอบ", type: "text", required: true, colSpan: 1 },
        { key: "reqPhone", label: "เบอร์โทร", type: "tel", maxLength: 20, colSpan: 1 },
      ],
    },
    {
      title: "ผู้รับมอบ (USER)",
      fields: [
        { key: "serviceSiteCode", label: "บริษัทที่ส่ง/รับมอบ", type: "select", required: true, colSpan: 1, options: [] },
        { key: "receiverName", label: "ชื่อ-นามสกุลผู้รับ", type: "text", required: true, colSpan: 1 },
        { key: "receiverDomain", label: "User Domain", type: "text", colSpan: 1 },
        { key: "receiverDept", label: "ฝ่าย/แผนก/หน่วยผู้รับ", type: "text", colSpan: 1 },
        { key: "receiverPosition", label: "ตำแหน่งผู้รับ", type: "text", colSpan: 1 },
        { key: "receiverEmail", label: "E-Mail ผู้รับ", type: "email", maxLength: 70, required: true, colSpan: 1 },
      ],
    },
    {
      title: "รายการที่ส่งมอบ",
      fields: [
        { key: "pcAsset", label: "PC/NB Asset", type: "text", colSpan: 1 },
        { key: "itemName", label: "รายการที่ส่งมอบ", type: "text", required: true, colSpan: 1 },
        { key: "brand", label: "Brand", type: "text", colSpan: 1 },
        { key: "model", label: "Model", type: "text", colSpan: 1 },
        { key: "serialNumber", label: "Serial Number", type: "text", colSpan: 1 },
        {
          key: "condition",
          label: "สภาพอุปกรณ์",
          type: "select",
          colSpan: 1,
          options: [
            { value: "normal", label: "ปกติ" },
            { value: "new", label: "ใหม่" },
          ],
        },
        { key: "handoverDate", label: "วันที่ส่งมอบ", type: "date", required: true, colSpan: 1 },
      ],
    },
  ],
};

// ---- F03  (borrow equipment) ----------------------------------------

const F03: FormDef = {
  type: "F03",
  code: "F03",
  title: "แบบฟอร์มขอยืมอุปกรณ์ชั่วคราว",
  shortTitle: "ขอยืมอุปกรณ์ชั่วคราว",
  manual: "MN_F03.pdf",
  slaHours: 8,
  initialUserStatus: "รอรับบริการ",
  sections: [
    requesterSection,
    {
      title: "รายละเอียดการยืม",
      fields: [
        serviceSiteField,
        {
          key: "deviceType",
          label: "ประเภทอุปกรณ์",
          type: "select",
          required: true,
          colSpan: 1,
          options: [
            { value: "notebook", label: "โน้ตบุ๊ค" },
            { value: "speakerphone", label: "ลำโพงประชุม (ปลาดาว)" },
            { value: "projector", label: "โปรเจกเตอร์" },
            { value: "monitor", label: "จอมอนิเตอร์" },
            { value: "adapter", label: "อุปกรณ์เสริม/สาย/Adapter" },
            { value: "other", label: "อื่นๆ" },
          ],
        },
        { key: "borrowDate", label: "วันที่ยืม", type: "date", required: true, colSpan: 1 },
        { key: "returnDate", label: "วันที่คืน (กำหนด)", type: "date", required: true, colSpan: 1 },
        { key: "purpose", label: "รายการที่ขอยืม / เหตุผล", type: "textarea", required: true, colSpan: 2 },
      ],
    },
  ],
};

export const FORM_DEFS: Record<string, FormDef> = { F02, F03, F06, F07, F10, F11, F12 };
export const FORM_LIST = Object.values(FORM_DEFS);
export const getFormDef = (t: string): FormDef | undefined => FORM_DEFS[t];

void YESNO;
