// F01 — computer asset registry field definitions.
// Reuses the ticket FieldDef/SectionDef shape. Keys in COLUMN_KEYS are stored as
// dedicated Asset columns; everything else is serialized into Asset.data (JSON).

import type { FieldDef, SectionDef } from "./form-defs";

export const COLUMN_KEYS = new Set([
  "assetNo",
  "siteCode",
  "assetType",
  "userName",
  "userDomain",
  "department",
  "brand",
  "model",
  "serialNumber",
  "ipAddress",
  "status",
  "note",
]);

const YESNO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const MONITOR_TYPE = ["TN", "VA", "IPS", "อื่นๆ"].map((v) => ({ value: v, label: v }));

export const ASSET_SECTIONS: SectionDef[] = [
  {
    title: "ผู้เพิ่ม / ผู้ใช้งาน",
    fields: [
      { key: "docNo", label: "เลขที่เอกสาร", type: "text", maxLength: 30, colSpan: 1 },
      { key: "addedDate", label: "วันที่เพิ่ม", type: "date", colSpan: 1 },
      { key: "siteCode", label: "บริษัท", type: "select", required: true, colSpan: 1, options: [] },
      {
        key: "assetType",
        label: "ประเภท Asset",
        type: "select",
        required: true,
        colSpan: 1,
        options: [
          "PC Asset",
          "Notebook Asset",
          "Server Asset",
          "Hyper V",
          "Controller Asset",
          "PC Asset ศูนย์ขนถ่าย",
          "Mobile/Tablet",
        ].map((v) => ({ value: v, label: v })),
      },
      { key: "assetNo", label: "เลข Asset", type: "text", required: true, maxLength: 30, colSpan: 1 },
      { key: "userName", label: "ชื่อผู้ใช้งาน", type: "text", maxLength: 120, colSpan: 1 },
      { key: "userDomain", label: "User Domain", type: "text", maxLength: 80, colSpan: 1 },
      { key: "department", label: "ฝ่าย/แผนก/หน่วย", type: "text", maxLength: 120, colSpan: 1 },
      { key: "position", label: "ตำแหน่ง", type: "text", maxLength: 80, colSpan: 1 },
      { key: "location", label: "Location", type: "text", maxLength: 40, colSpan: 1 },
    ],
  },
  {
    title: "System",
    fields: [
      {
        key: "brand",
        label: "Brand",
        type: "select",
        colSpan: 1,
        options: ["ACER", "ASUS", "DELL", "LENOVO", "HP", "MSI", "CUSTOM", "Apple", "Samsung", "อื่นๆ"].map(
          (v) => ({ value: v, label: v }),
        ),
      },
      { key: "model", label: "Model", type: "text", maxLength: 60, colSpan: 1 },
      { key: "cpuGen", label: "CPU Gen", type: "text", maxLength: 4, colSpan: 1 },
      { key: "cpuSpec", label: "CPU Specification", type: "text", maxLength: 40, colSpan: 1 },
      { key: "ramType", label: "Ram Type", type: "text", maxLength: 40, colSpan: 1 },
      { key: "totalRam", label: "Total Ram", type: "text", maxLength: 13, colSpan: 1 },
      { key: "slotRam", label: "Slot Ram", type: "text", maxLength: 10, colSpan: 1 },
      { key: "useRam", label: "Use Ram", type: "text", maxLength: 5, colSpan: 1 },
      { key: "storageCapacity", label: "Storage Capacity", type: "text", maxLength: 40, colSpan: 1 },
      { key: "ssd", label: "ใช้ SSD", type: "select", colSpan: 1, options: YESNO },
      { key: "os", label: "Operating System", type: "text", maxLength: 35, colSpan: 1 },
      { key: "licenseOs", label: "License OS", type: "select", colSpan: 1, options: YESNO },
      { key: "licenseName", label: "License name", type: "text", maxLength: 50, colSpan: 1 },
      { key: "serialNumber", label: "Serial Number", type: "text", maxLength: 60, colSpan: 1 },
    ],
  },
  {
    title: "Network",
    fields: [
      { key: "useInternet", label: "Use Internet", type: "select", colSpan: 1, options: YESNO },
      { key: "ipAddress", label: "IP Address", type: "text", maxLength: 20, colSpan: 1 },
      { key: "lanMac", label: "LAN MacAddress", type: "text", maxLength: 30, colSpan: 1 },
      { key: "wifiMac", label: "WIFI MacAddress", type: "text", maxLength: 50, colSpan: 1 },
      { key: "networkPort", label: "จุดเชื่อมต่อ Network", type: "text", maxLength: 30, colSpan: 1 },
    ],
  },
  {
    title: "Monitor / UPS / Keyboard / Mouse",
    fields: [
      { key: "monitor1Type", label: "Type Monitor (1)", type: "select", colSpan: 1, options: MONITOR_TYPE },
      { key: "monitor1Model", label: "Model Monitor (1)", type: "text", maxLength: 30, colSpan: 1 },
      { key: "monitor1Serial", label: "Serial Monitor (1)", type: "text", maxLength: 150, colSpan: 1 },
      { key: "monitor1Asset", label: "Fixed Asset Monitor (1)", type: "text", maxLength: 30, colSpan: 1 },
      { key: "monitor2Type", label: "Type Monitor (2)", type: "select", colSpan: 1, options: MONITOR_TYPE },
      { key: "monitor2Model", label: "Model Monitor (2)", type: "text", maxLength: 30, colSpan: 1 },
      { key: "monitor2Serial", label: "Serial Monitor (2)", type: "text", maxLength: 150, colSpan: 1 },
      { key: "monitor2Asset", label: "Fixed Asset Monitor (2)", type: "text", maxLength: 30, colSpan: 1 },
      { key: "upsBrand", label: "Brand UPS", type: "text", maxLength: 20, colSpan: 1 },
      { key: "upsSerial", label: "Serial UPS", type: "text", maxLength: 40, colSpan: 1 },
      { key: "upsAsset", label: "Fixed Asset UPS", type: "text", maxLength: 30, colSpan: 1 },
      { key: "keyboardBrand", label: "Brand Keyboard", type: "text", maxLength: 20, colSpan: 1 },
      { key: "keyboardSerial", label: "Serial Keyboard", type: "text", maxLength: 40, colSpan: 1 },
      { key: "mouseBrand", label: "Brand Mouse", type: "text", maxLength: 20, colSpan: 1 },
      { key: "mouseSerial", label: "Serial Mouse", type: "text", maxLength: 40, colSpan: 1 },
    ],
  },
  {
    title: "Machine Age / Warranty",
    fields: [
      { key: "receivedDate", label: "วันที่รับเข้าระบบ", type: "date", colSpan: 1 },
      { key: "ageText", label: "อายุเครื่อง (ปี/เดือน/วัน)", type: "text", maxLength: 30, colSpan: 1 },
      { key: "ageYears", label: "อายุเครื่อง (ปี)", type: "text", maxLength: 5, colSpan: 1 },
      { key: "warrantyStart", label: "วันที่เริ่มประกัน", type: "date", colSpan: 1 },
      { key: "warrantyEnd", label: "วันที่หมดประกัน", type: "date", colSpan: 1 },
      { key: "warrantyStatus", label: "Warranty Status (จำนวนวัน)", type: "text", maxLength: 20, colSpan: 1 },
    ],
  },
  {
    title: "สถานะการใช้งาน",
    fields: [
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        colSpan: 1,
        options: ["ใช้งาน", "ไม่ได้ใช้งาน", "สำรองใช้งาน", "อื่นๆ"].map((v) => ({ value: v, label: v })),
      },
      { key: "log", label: "Log", type: "text", maxLength: 20, colSpan: 1 },
    ],
  },
  {
    title: "Permission",
    fields: [
      {
        key: "usageType",
        label: "ประเภทการใช้งาน",
        type: "select",
        colSpan: 1,
        options: ["User", "Center", "Computer Control", "Spare", "อื่นๆ"].map((v) => ({ value: v, label: v })),
      },
      {
        key: "privilegeLevel",
        label: "ระดับสิทธิ์",
        type: "select",
        colSpan: 1,
        options: ["Domain User", "Local Admin", "Administrator", "อื่นๆ"].map((v) => ({ value: v, label: v })),
      },
    ],
  },
  {
    title: "อื่นๆ",
    fields: [
      { key: "assetNoAccount", label: "เลข Asset จากบัญชี", type: "text", maxLength: 40, colSpan: 1 },
      { key: "poNo", label: "เลขที่ PO", type: "text", maxLength: 20, colSpan: 1 },
      { key: "note", label: "หมายเหตุ", type: "textarea", colSpan: 2 },
    ],
  },
];

export const ASSET_FIELDS: FieldDef[] = ASSET_SECTIONS.flatMap((s) => s.fields);
