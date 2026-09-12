import { prisma } from "./db";
import { getFormDef, type FormDef } from "./form-defs";
import { nextDocNo } from "./docno";
import { isIT } from "./constants";
import { addBusinessHours } from "./business-hours";
import { getHolidaySet } from "./holidays";
import { onTicketCreated, onTransition, onApprovalResult } from "./notify";
import type { SessionUser } from "./auth";

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

const SNAPSHOT_KEYS = new Set([
  "reqName",
  "reqDept",
  "reqPosition",
  "reqPhone",
  "reqEmail",
  "serviceSiteCode",
  "note",
]);

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  values: Record<string, unknown>;
}

export function validateFormData(
  def: FormDef,
  raw: Record<string, unknown>,
): ValidationResult {
  const errors: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const section of def.sections) {
    for (const f of section.fields) {
      const v = raw[f.key];

      if (f.type === "checkboxes") {
        const arr = Array.isArray(v) ? v.map(String) : [];
        const valid = new Set((f.options ?? []).map((o) => o.value));
        const clean = arr.filter((x) => valid.has(x));
        if (f.required && clean.length === 0) errors[f.key] = "กรุณาเลือกอย่างน้อย 1 รายการ";
        values[f.key] = clean;
        continue;
      }

      const s = v == null ? "" : String(v).trim();
      if (f.required && !s) {
        errors[f.key] = "กรุณากรอกข้อมูล";
        values[f.key] = s;
        continue;
      }
      if (s && f.type === "select") {
        const valid = new Set((f.options ?? []).map((o) => o.value));
        // serviceSiteCode options are injected at render time; accept any 2-char code
        if (f.key !== "serviceSiteCode" && f.options && f.options.length && !valid.has(s)) {
          errors[f.key] = "ค่าที่เลือกไม่ถูกต้อง";
        }
      }
      if (s && (f.type === "date" || f.type === "datetime")) {
        if (Number.isNaN(Date.parse(s))) errors[f.key] = "รูปแบบวันที่ไม่ถูกต้อง";
      }
      if (s && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
        errors[f.key] = "อีเมลไม่ถูกต้อง";
      }
      if (f.maxLength && s.length > f.maxLength) {
        errors[f.key] = `ยาวเกิน ${f.maxLength} ตัวอักษร`;
      }
      values[f.key] = s;
    }
  }

  // approver picks
  for (const step of def.approvals ?? []) {
    const v = raw[step.fieldKey];
    const s = v == null ? "" : String(v).trim();
    if (!s) errors[step.fieldKey] = "กรุณาเลือก";
    values[step.fieldKey] = s ? Number(s) : null;
  }

  if (def.type === "F07" && values.system === "other" && !String(values.systemOther ?? "").trim()) {
    errors.systemOther = "กรุณาระบุชื่อระบบที่ต้องการแก้ไข";
  }
  if (def.type === "F10") {
    const selectedItems = Array.isArray(values.items) ? values.items : [];
    const needsItemDetail = selectedItems.some((item) => item === "rdp" || item === "web_online" || item === "other");
    if (needsItemDetail && !String(values.itemsDetail ?? "").trim()) {
      errors.itemsDetail = "กรุณาระบุชื่อระบบหรือรายละเอียดของรายการที่เลือก";
    }
  }

  const borrowDate = String(values.borrowDate ?? "");
  const returnDate = String(values.returnDate ?? "");
  if (def.type === "F03" && borrowDate && returnDate && returnDate < borrowDate) {
    errors.returnDate = "วันที่คืนต้องไม่ก่อนวันที่ยืม";
  }
  const startAt = String(values.startAt ?? "");
  const endAt = String(values.endAt ?? "");
  if (def.type === "F12" && startAt && endAt && endAt <= startAt) {
    errors.endAt = "เวลาสิ้นสุดต้องหลังเวลาเริ่มใช้";
  }

  return { ok: Object.keys(errors).length === 0, errors, values };
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

export async function createTicket(opts: {
  user: SessionUser;
  formType: string;
  raw: Record<string, unknown>;
}) {
  const def = getFormDef(opts.formType);
  if (!def) throw new Error("UNKNOWN_FORM");

  const { ok, errors, values } = validateFormData(def, opts.raw);
  if (!ok) return { ok: false as const, errors };

  const serviceSiteCode = String(values.serviceSiteCode ?? opts.user.siteCode ?? "02");
  const notifyEmail = opts.raw.notifyEmail === true || opts.raw.notifyEmail === "true";

  const now = new Date();
  const holidays = await getHolidaySet();
  const slaDueAt = addBusinessHours(now, def.slaHours, holidays); // Mon–Fri 08:00–17:00 minus holidays

  // formData = everything that isn't a dedicated column
  const formData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (!SNAPSHOT_KEYS.has(k)) formData[k] = v;
  }

  // IT-initiated forms (F02 handover): already done at creation — jump to RESOLVED,
  // creator is the assignee; they later confirm the counterpart acknowledged.
  const itInit = !!def.initiatedByIT;

  const ticket = await prisma.$transaction(async (tx) => {
    const docNo = await nextDocNo(tx, now);
    const t = await tx.ticket.create({
      data: {
        docNo,
        formType: def.type,
        siteCode: opts.user.siteCode ?? serviceSiteCode,
        requesterId: opts.user.id,
        reqName: String(values.reqName ?? opts.user.displayName),
        reqDept: (String(values.reqDept ?? "").trim() || opts.user.departmentName) || null,
        reqPosition: String(values.reqPosition ?? opts.user.position ?? "") || null,
        reqPhone: String(values.reqPhone ?? opts.user.phone ?? "") || null,
        reqEmail: String(values.reqEmail ?? opts.user.email ?? "") || null,
        serviceSiteCode,
        status: itInit ? "RESOLVED" : "OPEN",
        itStatus: itInit ? "RECEIVED" : "NEW",
        userStatus: def.initialUserStatus,
        assignedToId: itInit ? opts.user.id : null,
        receivedAt: itInit ? now : null,
        resolvedAt: itInit ? now : null,
        notifyEmail,
        note: (String(opts.raw.note ?? "").trim() || null),
        formData: JSON.stringify(formData),
        slaHours: def.slaHours,
        slaDueAt,
        events: {
          create: {
            actorId: opts.user.id,
            action: "CREATE",
            toStatus: itInit ? "RESOLVED" : "OPEN",
            comment: `เปิดเรื่อง ${def.shortTitle}`,
          },
        },
      },
    });

    for (const step of def.approvals ?? []) {
      const approverId = values[step.fieldKey] as number | null;
      await tx.ticketApproval.create({
        data: {
          ticketId: t.id,
          step: step.step,
          seq: (def.approvals ?? []).indexOf(step) + 1,
          approverId: approverId ?? null,
        },
      });
    }

    return t;
  });

  onTicketCreated(ticket.id);
  return { ok: true as const, ticket };
}

// ---------------------------------------------------------------------------
// edit
//   requester: allowed only while itStatus === "NEW" (IT hasn't picked it up)
//   IT: allowed anytime except CANCELLED
// ---------------------------------------------------------------------------

export async function updateTicket(opts: {
  ticketId: number;
  user: SessionUser;
  raw: Record<string, unknown>;
}) {
  const t = await prisma.ticket.findUnique({ where: { id: opts.ticketId } });
  if (!t) return { ok: false as const, error: "NOT_FOUND" };

  const actorIsIT = isIT(opts.user.role);
  const actorIsRequester = t.requesterId === opts.user.id;
  if (t.status === "CANCELLED") return { ok: false as const, error: "เรื่องถูกยกเลิกแล้ว" };
  if (!actorIsIT && !(actorIsRequester && t.itStatus === "NEW")) {
    return { ok: false as const, error: "FORBIDDEN" };
  }

  const def = getFormDef(t.formType);
  if (!def) return { ok: false as const, error: "UNKNOWN_FORM" };

  const { ok, errors, values } = validateFormData(def, opts.raw);
  if (!ok) return { ok: false as const, error: "VALIDATION", fields: errors };

  const oldForm: Record<string, unknown> = safeParse(t.formData);
  const newForm: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) if (!SNAPSHOT_KEYS.has(k)) newForm[k] = v;

  const newNote = String(opts.raw.note ?? "").trim() || null;
  const patch = {
    reqName: String(values.reqName ?? t.reqName),
    reqDept: (String(values.reqDept ?? "").trim() || t.reqDept) as string | null,
    reqPosition: (String(values.reqPosition ?? "").trim() || null) as string | null,
    reqPhone: (String(values.reqPhone ?? "").trim() || null) as string | null,
    reqEmail: (String(values.reqEmail ?? "").trim() || null) as string | null,
    serviceSiteCode: String(values.serviceSiteCode ?? t.serviceSiteCode),
    note: newNote,
    formData: JSON.stringify(newForm),
  };

  // summary of what changed (field labels)
  const labelOf = (key: string) =>
    def.sections.flatMap((s) => s.fields).find((f) => f.key === key)?.label ?? key;
  const tRec = t as unknown as Record<string, unknown>;
  const patchRec = patch as unknown as Record<string, unknown>;
  const changed: string[] = [];
  for (const f of def.sections.flatMap((s) => s.fields)) {
    const before = f.key in oldForm ? oldForm[f.key] : tRec[f.key];
    const after = f.key in newForm ? newForm[f.key] : patchRec[f.key];
    if (JSON.stringify(before ?? "") !== JSON.stringify(after ?? "")) changed.push(labelOf(f.key));
  }
  if ((t.note ?? null) !== newNote) changed.push("หมายเหตุ");

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id: t.id }, data: patch });
    await tx.ticketEvent.create({
      data: {
        ticketId: t.id,
        actorId: opts.user.id,
        action: "EDIT",
        comment: changed.length ? `แก้ไข: ${changed.join(", ")}` : "แก้ไขข้อมูล",
      },
    });
  });

  return { ok: true as const };
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// workflow transitions
// ---------------------------------------------------------------------------

export type TransitionAction =
  | "RECEIVE"
  | "ASSIGN"
  | "PROGRESS"
  | "RESOLVE"
  | "CONFIRM_CLOSE"
  | "REJECT_RESOLVE"
  | "CLOSE"
  | "CANCEL"
  | "REOPEN"
  | "COMMENT";

interface TransitionInput {
  ticketId: number;
  actor: SessionUser;
  action: TransitionAction;
  comment?: string;
  assignedToId?: number | null;
}

export async function applyTransition(input: TransitionInput) {
  const t = await prisma.ticket.findUnique({
    where: { id: input.ticketId },
    include: { approvals: true },
  });
  if (!t) return { ok: false as const, error: "NOT_FOUND" };

  const actorIsIT = isIT(input.actor.role);
  const actorIsRequester = t.requesterId === input.actor.id;
  const now = new Date();

  const data: Record<string, unknown> = {};
  let toStatus: string = t.status;

  switch (input.action) {
    case "COMMENT":
      if (!actorIsIT && !actorIsRequester) return deny();
      break;

    case "RECEIVE": {
      if (!actorIsIT) return deny();
      if (t.itStatus !== "NEW") return bad("รับงานไปแล้ว");
      const pending = t.approvals.some((a) => a.status !== "APPROVED");
      if (t.approvals.length > 0 && pending) return bad("ยังตรวจสอบ/อนุมัติไม่ครบ");
      data.itStatus = "RECEIVED";
      data.status = toStatus = "IN_PROGRESS";
      data.receivedAt = now;
      data.userStatus = "กำลังดำเนินการ";
      if (!t.assignedToId) data.assignedToId = input.actor.id;
      break;
    }

    case "ASSIGN": {
      if (!actorIsIT) return deny();
      if (input.assignedToId == null) return bad("ไม่ได้ระบุผู้รับผิดชอบ");
      data.assignedToId = input.assignedToId;
      break;
    }

    case "PROGRESS": {
      if (!actorIsIT) return deny();
      if (t.status === "CLOSED" || t.status === "CANCELLED") return bad("งานปิดแล้ว");
      data.itStatus = "IN_PROGRESS";
      data.status = toStatus = "IN_PROGRESS";
      data.userStatus = "กำลังดำเนินการ";
      break;
    }

    case "RESOLVE": {
      if (!actorIsIT) return deny();
      if (t.status === "CLOSED" || t.status === "CANCELLED") return bad("งานปิดแล้ว");
      data.status = toStatus = "RESOLVED";
      data.resolvedAt = now;
      data.userStatus = "รอผู้แจ้งยืนยันปิดงาน";
      break;
    }

    case "CONFIRM_CLOSE": {
      // ผู้แจ้งยืนยันว่างานเรียบร้อย -> ปิดงาน
      if (!actorIsRequester) return deny();
      if (t.status !== "RESOLVED") return bad("ยังไม่ถึงขั้นยืนยันปิดงาน");
      data.status = toStatus = "CLOSED";
      data.itStatus = "CLOSED";
      data.closedAt = now;
      data.closedById = input.actor.id;
      data.userStatus = "เสร็จสิ้น (ผู้แจ้งยืนยัน)";
      break;
    }

    case "REJECT_RESOLVE": {
      // ผู้แจ้งบอกว่ายังไม่เรียบร้อย -> ตีกลับให้ IT
      if (!actorIsRequester) return deny();
      if (t.status !== "RESOLVED") return bad("ยังไม่ถึงขั้นยืนยันปิดงาน");
      if (!input.comment?.trim()) return bad("กรุณาระบุว่ายังไม่เรียบร้อยตรงไหน");
      data.status = toStatus = "IN_PROGRESS";
      data.itStatus = "IN_PROGRESS";
      data.resolvedAt = null;
      data.userStatus = "ผู้แจ้งแจ้งว่ายังไม่เรียบร้อย";
      break;
    }

    case "CLOSE": {
      // IT ปิดเอง กรณีผู้แจ้งไม่ยืนยัน
      if (!actorIsIT) return deny();
      if (t.status === "CLOSED") return bad("ปิดงานแล้ว");
      if (t.status === "CANCELLED") return bad("เรื่องถูกยกเลิก");
      data.status = toStatus = "CLOSED";
      data.itStatus = "CLOSED";
      data.closedAt = now;
      data.closedById = input.actor.id;
      data.userStatus = "เสร็จสิ้น (IT ปิดงาน)";
      break;
    }

    case "CANCEL": {
      if (!actorIsIT && !actorIsRequester) return deny();
      if (t.status === "CLOSED") return bad("ปิดงานแล้ว ยกเลิกไม่ได้");
      // once IT has picked the ticket up, only IT can cancel it — the
      // requester should contact IT instead of pulling it out from under them
      if (!actorIsIT && t.itStatus !== "NEW") return bad("IT รับเรื่องแล้ว กรุณาติดต่อ IT เพื่อขอยกเลิก");
      data.status = toStatus = "CANCELLED";
      data.userStatus = "ยกเลิก";
      break;
    }

    case "REOPEN": {
      if (!actorIsIT && !actorIsRequester) return deny();
      if (t.status !== "CLOSED" && t.status !== "CANCELLED" && t.status !== "RESOLVED")
        return bad("เรื่องยังไม่ปิด");
      data.status = toStatus = "IN_PROGRESS";
      data.itStatus = "IN_PROGRESS";
      data.closedAt = null;
      data.closedById = null;
      data.userStatus = "กำลังดำเนินการ (เปิดใหม่)";
      break;
    }
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length) {
      await tx.ticket.update({ where: { id: t.id }, data });
    }
    await tx.ticketEvent.create({
      data: {
        ticketId: t.id,
        actorId: input.actor.id,
        action: input.action,
        fromStatus: t.status,
        toStatus,
        comment: input.comment?.trim() || null,
      },
    });
  });

  onTransition(t.id, input.action);
  return { ok: true as const };

  function deny() {
    return { ok: false as const, error: "FORBIDDEN" };
  }
  function bad(msg: string) {
    return { ok: false as const, error: msg };
  }
}

// ---------------------------------------------------------------------------
// approvals
// ---------------------------------------------------------------------------

export async function actOnApproval(opts: {
  approvalId: number;
  actor: SessionUser;
  decision: "APPROVED" | "REJECTED";
  comment?: string;
}) {
  if (!isIT(opts.actor.role)) return { ok: false as const, error: "FORBIDDEN" };

  const appr = await prisma.ticketApproval.findUnique({ where: { id: opts.approvalId } });
  if (!appr) return { ok: false as const, error: "NOT_FOUND" };

  await prisma.$transaction(async (tx) => {
    await tx.ticketApproval.update({
      where: { id: appr.id },
      data: { status: opts.decision, comment: opts.comment?.trim() || null, actedAt: new Date() },
    });
    await tx.ticketEvent.create({
      data: {
        ticketId: appr.ticketId,
        actorId: opts.actor.id,
        action: opts.decision === "APPROVED" ? "APPROVE" : "REJECT",
        comment: `${appr.step}: ${opts.comment?.trim() ?? ""}`.trim(),
      },
    });

    if (opts.decision === "REJECTED") {
      await tx.ticket.update({
        where: { id: appr.ticketId },
        data: { status: "CANCELLED", userStatus: "ไม่อนุมัติ" },
      });
    } else {
      const remaining = await tx.ticketApproval.count({
        where: { ticketId: appr.ticketId, status: { not: "APPROVED" } },
      });
      if (remaining === 0) {
        await tx.ticket.update({
          where: { id: appr.ticketId },
          data: { userStatus: "อนุมัติครบ รอ IT รับงาน" },
        });
      }
    }
  });

  onApprovalResult(appr.ticketId, appr.step, opts.decision);
  return { ok: true as const };
}
