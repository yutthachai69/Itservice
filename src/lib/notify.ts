import { prisma } from "./db";
import { sendMail } from "./mailer";
import { getFormDef } from "./form-defs";
import { STATUS_LABEL } from "./constants";

const BASE = process.env.APP_BASE_URL || "http://localhost:3000";
const IT_INBOX = process.env.IT_NOTIFY_EMAIL || "";

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
    <h2 style="margin:0 0 4px">${heading}</h2>
    <p style="margin:0;color:#64748b">${t.docNo} · ${def?.title ?? t.formType}</p>
    <table style="margin:12px 0;font-size:14px">
      <tr><td style="color:#64748b;padding-right:12px">สถานะ</td><td>${STATUS_LABEL[t.status] ?? t.status}</td></tr>
      <tr><td style="color:#64748b;padding-right:12px">สถานะผู้ขอ</td><td>${t.userStatus}</td></tr>
      <tr><td style="color:#64748b;padding-right:12px">ผู้แจ้ง</td><td>${t.reqName}</td></tr>
    </table>
    ${lines.map((l) => `<p style="margin:6px 0">${l}</p>`).join("")}
    <p style="margin:16px 0"><a href="${url}" style="background:#16a34a;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none">เปิดดูคำร้อง</a></p>
    <p style="color:#94a3b8;font-size:12px">${url}</p>
  </div>`;
  return html;
}

const reqTo = (t: NonNullable<TicketLite>) =>
  t.notifyEmail ? t.reqEmail || t.requester?.email || "" : "";
const assigneeTo = (t: NonNullable<TicketLite>) => t.assignedTo?.email || "";

/** fire-and-forget wrapper — email must never break the workflow */
function fire(p: Promise<unknown>) {
  p.catch((e) => console.error("[notify] failed", e));
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

      if (reqTo(t)) {
        await sendMail({
          to: reqTo(t),
          subject: `[${t.docNo}] รับคำร้องของคุณแล้ว`,
          html: tmpl(t, "ระบบรับคำร้องของคุณแล้ว", [
            "เจ้าหน้าที่ IT จะดำเนินการและแจ้งความคืบหน้าให้ทราบ",
          ]),
        });
      }
      if (IT_INBOX) {
        await sendMail({
          to: IT_INBOX,
          subject: `[${t.docNo}] คำร้องใหม่: ${def?.shortTitle ?? t.formType}`,
          html: tmpl(t, "มีคำร้องใหม่เข้าคิว", ["กรุณาตรวจสอบและรับงาน"]),
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
      if (remaining === 0 && IT_INBOX) {
        await sendMail({
          to: IT_INBOX,
          subject: `[${t.docNo}] อนุมัติครบแล้ว พร้อมรับงาน`,
          html: tmpl(t, "อนุมัติครบทุกขั้นแล้ว", ["พร้อมให้เจ้าหน้าที่รับงาน"]),
        });
      }
    })(),
  );
}
