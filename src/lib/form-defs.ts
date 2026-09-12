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
    // options are injected at render time from /api/departments for the chosen service site
    { key: "reqDept", label: "ฝ่าย / แผนก", type: "select", colSpan: 1, help: "รายการอัปเดตตาม “บริษัทที่ขอรับบริการ”" },
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
          help: "จำเป็นเมื่อเลือกระบบอื่นๆ",
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
          help: "จำเป็นเมื่อเลือกรายการที่ต้องระบุชื่อระบบหรือรายละเอียดเพิ่มเติม",
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

// ---- F13  (ERP Softpro access request) --------------------------------
// Modeled on the legacy standalone system at permissionrequest.tsmgroup.local
// ("แบบฟอร์มขอสิทธิ์มาตรฐาน") — kept as its own form rather than folded into
// F10 because the fields (work-function areas, PR approval order, Division
// factory/office codes) are Softpro-specific and don't fit F10's generic
// "items" checklist. Two fields are simplified from the legacy page rather
// than reproduced exactly:
//  - the legacy "User Level" dropdown per ฟังก์ชั่นงาน is populated by an
//    AJAX postback keyed to the selected work function, so its real option
//    values aren't visible in static markup — collected as free text instead.
//  - "Division" was a checkbox grid (site x โรงงาน/สำนักงาน/กรุงเทพฯ) — kept
//    as checkboxes with the legacy value codes, e.g. "TKSM(MG)".
const WORK_FUNCTION_OPTIONS = [
  { value: "งาน-ทั่วไป", label: "งาน-ทั่วไป (แนะนำ)" },
  { value: "งาน-IT Config", label: "งาน-IT Config" },
  { value: "งาน-จัดซื้อ", label: "งาน-จัดซื้อ" },
  { value: "งาน-บัญชี", label: "งาน-บัญชี" },
  { value: "งาน-การเงิน", label: "งาน-การเงิน" },
  { value: "งาน-ขาย", label: "งาน-ขาย" },
  { value: "งาน-ฝ่ายไร่", label: "งาน-ฝ่ายไร่" },
  { value: "งาน-PR Memo", label: "งาน-PR Memo" },
  { value: "งาน-คลังพัสดุ", label: "งาน-คลังพัสดุ" },
  { value: "งาน-คลังสินค้า", label: "งาน-คลังสินค้า" },
  { value: "งาน-งบประมาณ", label: "งาน-งบประมาณ" },
  { value: "งาน-ข้อมูลเกษตรกร", label: "งาน-ข้อมูลเกษตรกร" },
  { value: "งาน-สำรวจพื้นที่และขอส่งเสริม", label: "งาน-สำรวจพื้นที่และขอส่งเสริม" },
  { value: "งาน-เกี๊ยว", label: "งาน-เกี๊ยว" },
  { value: "งาน-เบิกจ่ายวัตถุดิบ", label: "งาน-เบิกจ่ายวัตถุดิบ" },
  { value: "งาน-ติดตามหนี้", label: "งาน-ติดตามหนี้" },
  { value: "งาน-สินเชื่อ", label: "งาน-สินเชื่อ" },
  { value: "งาน-คำนวนและจ่ายเช็ค", label: "งาน-คำนวนและจ่ายเช็ค" },
  { value: "งาน-บันทึกค่า CCS และการปรับค่า", label: "งาน-บันทึกค่า CCS และการปรับค่า" },
  { value: "งาน-สรุปปิดหีบ", label: "งาน-สรุปปิดหีบ" },
  { value: "งาน-ห้องชั่ง", label: "งาน-ห้องชั่ง" },
  { value: "ผู้ปฏิบัติงาน-คิว / บัตรคิว", label: "ผู้ปฏิบัติงาน-คิว / บัตรคิว" },
  { value: "งาน-จ่ายน้ำมัน", label: "งาน-จ่ายน้ำมัน" },
  { value: "งาน-ติดตามหนี้(AP)", label: "งาน-ติดตามหนี้(AP)" },
  { value: "งาน-ควบคุมการจ่ายเงิน(AP)", label: "งาน-ควบคุมการจ่ายเงิน(AP)" },
  { value: "งาน-ควบคุมเงินสดย่อย(AP)", label: "งาน-ควบคุมเงินสดย่อย(AP)" },
];

const USER_LEVEL_OPTIONS = [
  { value: "ผู้ใช้ข้อมูล (View/Print)", label: "ผู้ใช้ข้อมูล (View/Print)" },
  { value: "ผู้ปฏิบัติงาน (View/Print/Append/Edit/Delete)", label: "ผู้ปฏิบัติงาน (View/Print/Append/Edit/Delete)" },
  { value: "ผู้อนุมัติ (View/Print/Approve/Reject/Void,Unapprove)", label: "ผู้อนุมัติ (View/Print/Approve/Reject/Void,Unapprove)" },
];

function workFunctionField(n: 1 | 2 | 3 | 4 | 5): FieldDef {
  return {
    key: `workFunction${n}`,
    label: `ฟังก์ชั่นงานที่ ${n}`,
    type: "select",
    required: n === 1,
    colSpan: 1,
    options: WORK_FUNCTION_OPTIONS,
    help:
      n === 1
        ? "แต่ละฟังก์ชั่นงานมีหน้าจอ/เมนูย่อยของตัวเองในระบบ Softpro — ดูรายชื่อโค้ดหน้าจอทั้งหมดได้จากปุ่ม “รายชื่อโค้ดหน้าจอ Softpro” ด้านบน หากไม่แน่ใจว่าต้องเลือกหน้าจอใด ให้ระบุในหมายเหตุ แล้ว IT จะช่วยตรวจสอบให้ตอนพิจารณาคำร้อง"
        : undefined,
  };
}

function userLevelField(n: 1 | 2 | 3 | 4 | 5): FieldDef {
  return {
    key: `userLevel${n}`,
    // the responsive grid can end up 2 or 3 columns wide, so a plain "User
    // Level" placed right after its matching work-function field drifts out
    // of alignment and reads as unrelated — spelling out which slot it
    // belongs to keeps it unambiguous at any column count.
    label: `User Level (ฟังก์ชั่นงานที่ ${n})`,
    type: "select",
    required: n === 1,
    colSpan: 1,
    options: USER_LEVEL_OPTIONS,
  };
}

const F13: FormDef = {
  type: "F13",
  code: "F13",
  title: "แบบฟอร์มขอสิทธิ์ระบบ ERP Softpro",
  shortTitle: "ขอสิทธิ์ Softpro",
  slaHours: 16,
  initialUserStatus: "รอตรวจสอบ/อนุมัติ",
  sections: [
    requesterSection,
    {
      title: "ฟังก์ชั่นงานที่ขอสิทธิ์",
      fields: [
        { key: "reqNameEn", label: "ชื่อภาษาอังกฤษ (Name-Lastname)", type: "text", colSpan: 2, maxLength: 100 },
        workFunctionField(1),
        workFunctionField(2),
        workFunctionField(3),
        workFunctionField(4),
        workFunctionField(5),
        userLevelField(1),
        userLevelField(2),
        userLevelField(3),
        userLevelField(4),
        userLevelField(5),
      ],
    },
    {
      title: "สิทธิ์อนุมัติ (PR) และหน่วยงาน",
      fields: [
        {
          key: "prApprovalOrder",
          label: "ลำดับ Y ในการอนุมัติ (PR)",
          type: "select",
          colSpan: 1,
          options: [
            { value: "Y1", label: "Y1" },
            { value: "Y2", label: "Y2" },
            { value: "Y3", label: "Y3" },
          ],
        },
        { key: "prApprovalLimit", label: "วงเงินอนุมัติ (PR)", type: "text", maxLength: 14, colSpan: 1, placeholder: "พิมพ์จำนวนเงิน" },
        serviceSiteField,
        {
          key: "division",
          label: "บริษัทที่ปฏิบัติงาน (Division)",
          type: "checkboxes",
          required: true,
          colSpan: 2,
          help: "เลือกได้มากกว่า 1 หน่วยงาน — โรงงาน / สำนักงาน หรือกรุงเทพฯ ตามหน่วยที่ปฏิบัติงานจริง",
          options: [
            { value: "TKSM(MG)", label: "TKSM · โรงงาน (MG)" },
            { value: "TKSMBKK(HG)", label: "TKSM · สำนักงาน/กรุงเทพฯ (HG)" },
            { value: "TKP(MI)", label: "TKP · โรงงาน (MI)" },
            { value: "TKPBKK(HI)", label: "TKP · สำนักงาน/กรุงเทพฯ (HI)" },
            { value: "TKP2(MJ)", label: "TKP2 · โรงงาน (MJ)" },
            { value: "TKP2BKK(HJ)", label: "TKP2 · สำนักงาน/กรุงเทพฯ (HJ)" },
            { value: "TSE(MN)", label: "TSE · โรงงาน (MN)" },
            { value: "TSEBKK(HN)", label: "TSE · สำนักงาน/กรุงเทพฯ (HN)" },
            { value: "TTSM(MA)", label: "TTSM · โรงงาน (MA)" },
            { value: "TTSMBKK(HA)", label: "TTSM · สำนักงาน/กรุงเทพฯ (HA)" },
            { value: "TSMB(MS)", label: "TSMB · โรงงาน (MS)" },
            { value: "TSMBBKK(HS)", label: "TSMB · สำนักงาน/กรุงเทพฯ (HS)" },
            { value: "TSMB2012(MT)", label: "TSMB2012 · โรงงาน (MT)" },
            { value: "TSMB2012BKK(HT)", label: "TSMB2012 · สำนักงาน/กรุงเทพฯ (HT)" },
            { value: "TUSM(UD)", label: "TUSM · โรงงาน (UD)" },
            { value: "TUSMBKK(HO)", label: "TUSM · สำนักงาน/กรุงเทพฯ (HO)" },
            { value: "TUP(MC)", label: "TUP · โรงงาน (MC)" },
            { value: "TUPBKK(HC)", label: "TUP · สำนักงาน/กรุงเทพฯ (HC)" },
          ],
        },
        { key: "notes", label: "หมายเหตุ", type: "textarea", colSpan: 2 },
      ],
    },
  ],
  approvals: [
    { step: "CHECK", label: "ผู้ตรวจสอบ", approverType: "IT", fieldKey: "approverCheck" },
    { step: "APPROVE", label: "ผู้อนุมัติให้สิทธิ์", approverType: "IT", fieldKey: "approverApprove" },
  ],
};

export const FORM_DEFS: Record<string, FormDef> = { F02, F03, F06, F07, F10, F11, F12, F13 };
export const FORM_LIST = Object.values(FORM_DEFS);
export const getFormDef = (t: string): FormDef | undefined => FORM_DEFS[t];

void YESNO;
