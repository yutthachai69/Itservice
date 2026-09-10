import { prisma } from "./db";
import { ASSET_FIELDS, ASSET_SECTIONS, COLUMN_KEYS } from "./asset-def";
import type { SessionUser } from "./auth";

export interface AssetValidation {
  ok: boolean;
  errors: Record<string, string>;
  values: Record<string, string>;
}

export function validateAsset(raw: Record<string, unknown>): AssetValidation {
  const errors: Record<string, string> = {};
  const values: Record<string, string> = {};

  for (const f of ASSET_FIELDS) {
    const s = raw[f.key] == null ? "" : String(raw[f.key]).trim();
    if (f.required && !s) errors[f.key] = "กรุณากรอกข้อมูล";
    if (s && f.type === "select" && f.key !== "siteCode" && f.options?.length) {
      if (!f.options.some((o) => o.value === s)) errors[f.key] = "ค่าที่เลือกไม่ถูกต้อง";
    }
    if (s && f.type === "date" && Number.isNaN(Date.parse(s))) errors[f.key] = "วันที่ไม่ถูกต้อง";
    if (f.maxLength && s.length > f.maxLength) errors[f.key] = `ยาวเกิน ${f.maxLength} ตัวอักษร`;
    values[f.key] = s;
  }
  return { ok: Object.keys(errors).length === 0, errors, values };
}

function split(values: Record<string, string>) {
  const cols: Record<string, string | null> = {};
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (COLUMN_KEYS.has(k)) cols[k] = v || null;
    else data[k] = v;
  }
  return { cols, data };
}

export async function createAsset(user: SessionUser, raw: Record<string, unknown>) {
  const { ok, errors, values } = validateAsset(raw);
  if (!ok) return { ok: false as const, errors };

  const dup = await prisma.asset.findUnique({ where: { assetNo: values.assetNo } });
  if (dup) return { ok: false as const, errors: { assetNo: "เลข Asset นี้มีอยู่แล้ว" } };

  const { cols, data } = split(values);
  const asset = await prisma.asset.create({
    data: {
      assetNo: values.assetNo,
      siteCode: values.siteCode,
      assetType: cols.assetType,
      userName: cols.userName,
      userDomain: cols.userDomain,
      department: cols.department,
      brand: cols.brand,
      model: cols.model,
      serialNumber: cols.serialNumber,
      ipAddress: cols.ipAddress,
      status: values.status || "ใช้งาน",
      note: cols.note,
      data: JSON.stringify(data),
      createdById: user.id,
    },
  });
  return { ok: true as const, asset };
}

export async function updateAsset(id: number, raw: Record<string, unknown>) {
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) return { ok: false as const, error: "NOT_FOUND" };

  const { ok, errors, values } = validateAsset(raw);
  if (!ok) return { ok: false as const, error: "VALIDATION", errors };

  if (values.assetNo !== existing.assetNo) {
    const dup = await prisma.asset.findUnique({ where: { assetNo: values.assetNo } });
    if (dup) return { ok: false as const, error: "VALIDATION", errors: { assetNo: "เลข Asset นี้มีอยู่แล้ว" } };
  }

  const { cols, data } = split(values);
  await prisma.asset.update({
    where: { id },
    data: {
      assetNo: values.assetNo,
      siteCode: values.siteCode,
      assetType: cols.assetType,
      userName: cols.userName,
      userDomain: cols.userDomain,
      department: cols.department,
      brand: cols.brand,
      model: cols.model,
      serialNumber: cols.serialNumber,
      ipAddress: cols.ipAddress,
      status: values.status || existing.status,
      note: cols.note,
      data: JSON.stringify(data),
    },
  });
  return { ok: true as const };
}

/** flatten an Asset row back into a {key: value} map for the form / detail view */
export function assetToValues(a: {
  assetNo: string;
  siteCode: string;
  assetType: string | null;
  userName: string | null;
  userDomain: string | null;
  department: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  ipAddress: string | null;
  status: string;
  note: string | null;
  data: string;
}): Record<string, string> {
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(a.data);
  } catch {
    json = {};
  }
  const out: Record<string, string> = {};
  for (const f of ASSET_SECTIONS.flatMap((s) => s.fields)) {
    if (COLUMN_KEYS.has(f.key)) {
      out[f.key] = String((a as Record<string, unknown>)[f.key] ?? "");
    } else {
      out[f.key] = String(json[f.key] ?? "");
    }
  }
  return out;
}
