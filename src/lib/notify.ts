import { prisma } from "./db";
import { sendMail } from "./mailer";
import { getFormDef } from "./form-defs";
import { STATUS_LABEL } from "./constants";
import { availableItems } from "./loans";
import { categoryLabel } from "./loan-categories";

const BASE = process.env.APP_BASE_URL || "http://localhost:3000";
const IT_RECIPIENTS = (process.env.IT_NOTIFY_EMAIL || "")
  .split(/[;,]/)
  .map((email) => email.trim())
  .filter(Boolean);

type TicketLite = Awaited<ReturnType<typeof loadTicket>>;

async function loadTicket(ticketId: number) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      assignedTo: { select: { email: true, displayName: true } },
      requester: { select: { email: true } },
      approvals: { include: { approver: { select: { name: true, email: true } } } },
    },
  });
}

function tmpl(t: NonNullable<TicketLite>, heading: string, lines: string[]) {
  const def = getFormDef(t.formType);
  const url = `${BASE}/tickets/${t.id}`;
  const html = `
  <div style="font-family:system-ui,'Segoe UI',Tahoma,sans-serif;color:#0f172a;line-height:1.6">
    <h2 style="margin:0 0 4px">${escapeHtml(heading)}</h2>
    <p style="margin:0;color:#64748b">${escapeHtml(t.docNo)} · ${escapeHtml(def?.title ?? t.formType)}</p>
    <table style="margin:12px 0;font-size:14px">
      <tr><td style="color:#64748b;padding-right:12px">สถานะ</td><td>${escapeHtml(STATUS_LABEL[t.status] ?? t.status)}</td></tr>
      <tr><td style="color:#64748b;padding-right:12px">สถานะผู้ขอ</td><td>${escapeHtml(t.userStatus)}</td></tr>
      <tr><td style="color:#64748b;padding-right:12px">ผู้แจ้ง</td><td>${escapeHtml(t.reqName)}</td></tr>
    </table>
    ${lines.map((l) => `<p style="margin:6px 0">${l}</p>`).join("")}
    <p style="margin:16px 0"><a href="${escapeHtml(url)}" style="background:#175cd3;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">เปิดดูคำร้อง</a></p>
    <p style="color:#94a3b8;font-size:12px">${escapeHtml(url)}</p>
  </div>`;
  return html;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

const reqTo = (t: NonNullable<TicketLite>) =>
  t.notifyEmail ? t.reqEmail || t.requester?.email || "" : "";
const assigneeTo = (t: NonNullable<TicketLite>) => t.assignedTo?.email || "";

/** fire-and-forget wrapper — email must never break the workflow */
function fire(p: Promise<unknown>) {
  p.catch((e) => console.error("[notify] failed", e));
}

/** F03 only: does any equipment of the requested category cover the requested dates? */
async function checkLoanStock(t: NonNullable<TicketLite>) {
  try {
    const fd: Record<string, unknown> = JSON.parse(t.formData);
    const category = String(fd.deviceType ?? "");
    const from = new Date(String(fd.borrowDate ?? ""));
    const to = new Date(String(fd.returnDate ?? ""));
    if (!category || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return null;

    const items = await availableItems({ category, from, to });
    if (items.length > 0) return null;
    return { label: categoryLabel(category), from: fmtDMY(from), to: fmtDMY(to) };
  } catch {
    return null; // never let a stock check break ticket creation
  }
}

function fmtDMY(d: Date) {
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function onTicketCreated(ticketId: number) {
  fire(
    (async () => {
      const t = await loadTicket(ticketId);
      if (!t) return;
      const def = getFormDef(t.formType);

      // IT-initiated (F02 handover): notify the counterpart to acknowledge
      if (def?.initiatedByIT) {
        let fd: Record<string, unknown> = {};
        try {
          fd = JSON.parse(t.formData);
        } catch {
          /* ignore */
        }
        const to = String(fd[def.counterpartEmailKey ?? ""] ?? "");
        if (to) {
          await sendMail({
            to,
            subject: `[${t.docNo}] แจ้งส่งมอบอุปกรณ์ — กรุณายืนยันการรับมอบ`,
            html: tmpl(t, "มีการส่งมอบอุปกรณ์ให้คุณ", [
              `ผู้ส่งมอบ: ${t.reqName}`,
              "กรุณาเข้าระบบเพื่อยืนยันการรับมอบ หรือติดต่อเจ้าหน้าที่ IT หากข้อมูลไม่ถูกต้อง",
            ]),
          });
        }
        return;
      }

      // F03 — check real stock at the moment the request comes in, so an
      // "out of stock" notice goes out immediately without IT having to look.
      const stockOut = t.formType === "F03" ? await checkLoanStock(t) : null;

      if (reqTo(t)) {
        await sendMail({
          to: reqTo(t),
          subject: `[${t.docNo}] รับคำร้องของคุณแล้ว`,
          html: tmpl(t, "ระบบรับคำร้องของคุณแล้ว", [
            "เจ้าหน้าที่ IT จะดำเนินการและแจ้งความคืบหน้าให้ทราบ",
            ...(stockOut
              ? [
                  `<strong style="color:#b45309">ขณะนี้ยังไม่มี "${escapeHtml(stockOut.label)}" ว่างในช่วงที่ขอยืม (${escapeHtml(stockOut.from)}–${escapeHtml(stockOut.to)})</strong> เจ้าหน้าที่ IT จะติดต่อกลับเพื่อจัดหาให้ หรือแจ้งกำหนดที่พร้อมใช้งาน`,
                ]
              : []),
          ]),
        });
      }
      if (IT_RECIPIENTS.length > 0) {
        await sendMail({
          to: IT_RECIPIENTS,
          subject: `[${t.docNo}]${stockOut ? " [ของไม่พอ]" : ""} คำร้องใหม่: ${def?.shortTitle ?? t.formType}`,
          html: tmpl(t, "มีคำร้องใหม่เข้าคิว", [
            "กรุณาตรวจสอบและรับงาน",
            ...(stockOut
              ? [`<strong style="color:#b45309">ตอนนี้ไม่มี "${escapeHtml(stockOut.label)}" ว่างในช่วงที่ขอ — ต้องจัดหาหรือประสานผู้ขอ</strong>`]
              : []),
          ]),
        });
      }
      // F07/F10 — แจ้งผู้อนุมัติที่ยังไม่ตัดสิน
      const pending = t.approvals.filter((a) => a.status === "PENDING" && a.approver?.email);
      for (const a of pending) {
        await sendMail({
          to: a.approver!.email!,
          subject: `[${t.docNo}] รอการพิจารณา (${a.step})`,
          html: tmpl(t, "มีคำร้องรอการพิจารณาของคุณ", [
            `ขั้นตอน: ${a.step}`,
            "กรุณาเข้าระบบเพื่ออนุมัติหรือไม่อนุมัติ",
          ]),
        });
      }
    })(),
  );
}

export function onTransition(ticketId: number, action: string) {
  fire(
    (async () => {
      const t = await loadTicket(ticketId);
      if (!t) return;

      switch (action) {
        case "RECEIVE":
          if (reqTo(t))
            await sendMail({
              to: reqTo(t),
              subject: `[${t.docNo}] เจ้าหน้าที่รับงานแล้ว`,
              html: tmpl(t, "เจ้าหน้าที่ IT รับงานแล้ว", ["กำลังดำเนินการให้คุณ"]),
            });
          break;
        case "RESOLVE":
          if (reqTo(t))
            await sendMail({
              to: reqTo(t),
              subject: `[${t.docNo}] ดำเนินการเสร็จ — กรุณายืนยันปิดงาน`,
              html: tmpl(t, "เจ้าหน้าที่แจ้งว่าดำเนินการเสร็จแล้ว", [
                "กรุณาเข้าระบบเพื่อ<strong>ยืนยันปิดงาน</strong> หรือแจ้งว่ายังไม่เรียบร้อย",
              ]),
            });
          break;
        case "REJECT_RESOLVE":
          if (assigneeTo(t))
            await sendMail({
              to: assigneeTo(t),
              subject: `[${t.docNo}] ผู้แจ้งตีกลับ — ยังไม่เรียบร้อย`,
              html: tmpl(t, "ผู้แจ้งแจ้งว่างานยังไม่เรียบร้อย", ["กรุณาตรวจสอบและดำเนินการต่อ"]),
            });
          break;
        case "CONFIRM_CLOSE":
          if (assigneeTo(t))
            await sendMail({
              to: assigneeTo(t),
              subject: `[${t.docNo}] ผู้แจ้งยืนยันปิดงานแล้ว`,
              html: tmpl(t, "ผู้แจ้งยืนยันปิดงาน", ["งานนี้ปิดเรียบร้อย"]),
            });
          break;
        case "CLOSE":
          if (reqTo(t))
            await sendMail({
              to: reqTo(t),
              subject: `[${t.docNo}] ปิดงานแล้ว`,
              html: tmpl(t, "คำร้องของคุณถูกปิดงานแล้ว", [
                "หากยังมีปัญหา สามารถเปิดเรื่องอีกครั้งได้จากหน้าคำร้อง",
              ]),
            });
          break;
        case "CANCEL":
          if (reqTo(t))
            await sendMail({
              to: reqTo(t),
              subject: `[${t.docNo}] คำร้องถูกยกเลิก`,
              html: tmpl(t, "คำร้องถูกยกเลิก", []),
            });
          if (assigneeTo(t))
            await sendMail({
              to: assigneeTo(t),
              subject: `[${t.docNo}] คำร้องถูกยกเลิก`,
              html: tmpl(t, "คำร้องถูกยกเลิก", []),
            });
          break;
      }
    })(),
  );
}

export function onApprovalResult(ticketId: number, step: string, decision: "APPROVED" | "REJECTED") {
  fire(
    (async () => {
      const t = await loadTicket(ticketId);
      if (!t) return;

      if (decision === "REJECTED") {
        if (reqTo(t))
          await sendMail({
            to: reqTo(t),
            subject: `[${t.docNo}] คำร้องไม่ได้รับอนุมัติ`,
            html: tmpl(t, "คำร้องไม่ได้รับอนุมัติ", [`ขั้นตอน: ${step}`]),
          });
        return;
      }
      const remaining = t.approvals.filter((a) => a.status !== "APPROVED").length;
      if (remaining === 0 && IT_RECIPIENTS.length > 0) {
        await sendMail({
          to: IT_RECIPIENTS,
          subject: `[${t.docNo}] อนุมัติครบแล้ว พร้อมรับงาน`,
          html: tmpl(t, "อนุมัติครบทุกขั้นแล้ว", ["พร้อมให้เจ้าหน้าที่รับงาน"]),
        });
      }
    })(),
  );
}
