/* Demo dataset — realistic-looking data for screenshots / presentation.
 * Repeatable: wipes prior transactional data + demo.* users, then recreates.
 * Keeps base seed (sites, departments, approvers, the 4 base users).
 *   npm run db:seed:demo
 */
import { PrismaClient } from "@prisma/client";
import { addBusinessHours } from "../src/lib/business-hours";

const prisma = new PrismaClient();

const DAY = 86400000;
const now = new Date();
const ago = (d: number) => new Date(now.getTime() - d * DAY);
const ahead = (d: number) => new Date(now.getTime() + d * DAY);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

const FIRST = ["สมชาย", "สมหญิง", "วิภา", "ธนกร", "ปิยะ", "อรพรรณ", "กิตติ", "นภา", "ชลิต", "มานพ", "รัตนา", "ประไพ"];
const LAST = ["ใจดี", "รักงาน", "แซ่ลิ้ม", "ศรีสุข", "วงศ์คำ", "พูนทรัพย์", "เจริญพร", "มั่นคง", "สายชล", "ทองแท้"];
const DEPTS = ["ฝ่ายบัญชีและการเงิน", "ฝ่ายทรัพยากรบุคคล", "ฝ่ายจัดซื้อ", "ฝ่ายขายและการตลาด", "สายงานด้านโรงงาน", "ฝ่ายคลังสินค้า"];
const SITES = ["01", "02", "03", "04", "05", "06"];
const rnd = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

async function wipe() {
  await prisma.ticketEvent.deleteMany();
  await prisma.ticketApproval.deleteMany();
  await prisma.ticketAttachment.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.loanItem.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.docCounter.deleteMany();
  await prisma.user.deleteMany({ where: { username: { startsWith: "demo." } } });
}

async function users() {
  const deptRows = await prisma.department.findMany();
  const deptId = (site: string, name: string) =>
    deptRows.find((d) => d.siteCode === site && d.name === name)?.id ?? null;

  const rows: {
    username: string;
    displayName: string;
    email: string;
    position: string;
    phone: string;
    siteCode: string;
    departmentId: number | null;
    role: string;
    roleLocked: boolean;
  }[] = [];

  // a few IT staff
  const itSites = ["02", "01", "05"];
  itSites.forEach((s, i) => {
    const name = `${rnd(FIRST)} ${rnd(LAST)}`;
    rows.push({
      username: `demo.it${i + 1}`,
      displayName: name,
      email: `demo.it${i + 1}@tsmgroup.local`,
      position: "เจ้าหน้าที่สนับสนุนระบบ",
      phone: `20${10 + i}`,
      siteCode: s,
      departmentId: deptId(s, "ฝ่ายเทคโนโลยีสารสนเทศ"),
      role: "IT_STAFF",
      roleLocked: true,
    });
  });

  // regular users
  for (let i = 0; i < 14; i++) {
    const s = rnd(SITES);
    const dep = rnd(DEPTS);
    rows.push({
      username: `demo.u${i + 1}`,
      displayName: `${rnd(FIRST)} ${rnd(LAST)}`,
      email: `demo.u${i + 1}@tsmgroup.local`,
      position: rnd(["เจ้าหน้าที่", "หัวหน้าแผนก", "ผู้จัดการ", "พนักงาน"]),
      phone: `${1000 + i}`,
      siteCode: s,
      departmentId: deptId(s, dep),
      role: "USER",
      roleLocked: false,
    });
  }

  for (const r of rows) {
    await prisma.user.upsert({ where: { username: r.username }, create: r, update: r });
  }
  return prisma.user.findMany({ where: { username: { startsWith: "demo." } } });
}

const SLA: Record<string, number> = { F02: 8, F03: 8, F06: 8, F07: 16, F10: 16, F11: 4, F12: 8 };
const FORM_TITLE: Record<string, string> = {
  F02: "ส่งมอบคอมพิวเตอร์",
  F03: "ขอยืมอุปกรณ์ชั่วคราว",
  F06: "ขอรับบริการระบบคอมพิวเตอร์",
  F07: "ขอแก้ไขข้อมูลระบบ",
  F10: "ขอใช้งาน/ยกเลิก ระบบ IT",
  F11: "ขอเปลี่ยน/แก้ไขรหัสผ่าน",
  F12: "ขอใช้ระบบ Video Conference",
};

const counters: Record<string, number> = {};
function docNo(d: Date) {
  const be = (d.getFullYear() + 543) % 100;
  const p = `${String(be).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}`;
  counters[p] = (counters[p] ?? 0) + 1;
  return `${p}${String(counters[p]).padStart(3, "0")}`;
}

const FORM_DATA: Record<string, () => Record<string, unknown>> = {
  F06: () => ({ problemTypes: [rnd(["software", "hardware"])], problemDetail: rnd(["เปิดโปรแกรมไม่ขึ้น", "เครื่องช้ามาก", "ปริ้นเตอร์ไม่ทำงาน", "จอไม่ติด"]) }),
  F07: () => ({ system: rnd(["erp_softpro", "internal_online"]), changeDetail: "ขอแก้ไขราคาขายในระบบให้ตรงกับใบเสนอราคา", approverCheck: null, approverAccounting: null, approverApprove: null }),
  F10: () => ({ action: "request", items: [rnd(["vpn", "email", "share_drive"])], detail: "ขอเปิดสิทธิ์ให้พนักงานเข้าใหม่", approverCheck: null, approverApprove: null }),
  F11: () => ({ passwordTypes: [rnd(["computer", "email", "softpro"])], reason: rnd(["ลืมรหัสผ่าน", "รหัสหมดอายุ", "โดนล็อก"]) }),
  F12: () => ({ meetingTypes: ["meeting"], subject: "ประชุมประจำเดือนฝ่ายขาย", startAt: ymd(ahead(3)) + "T09:00", endAt: ymd(ahead(3)) + "T12:00", program: "teams", location: "ห้องประชุม 2" }),
  F03: () => ({ deviceType: rnd(["notebook", "speakerphone", "projector"]), borrowDate: ymd(ahead(2)), returnDate: ymd(ahead(9)), purpose: "ใช้ในงานสัมมนาต่างจังหวัด" }),
  F02: () => ({ receiverName: `${rnd(FIRST)} ${rnd(LAST)}`, receiverEmail: "demo.recv@tsmgroup.local", receiverDept: rnd(DEPTS), itemName: "Notebook Dell Latitude 5440", brand: "DELL", model: "Latitude 5440", serialNumber: `SN${Math.floor(Math.random() * 99999)}`, condition: "new", handoverDate: ymd(ago(1)) }),
};

async function makeTicket(opts: {
  formType: string;
  requesterId: number;
  assigneeId?: number | null;
  createdDaysAgo: number;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELLED";
  itStatus?: string;
  userStatus: string;
  reqName: string;
  reqEmail: string;
  reqDept?: string | null;
  siteCode: string;
  events: { action: string; comment?: string; daysAgo: number; actorId?: number | null }[];
}) {
  const created = ago(opts.createdDaysAgo);
  const dn = docNo(created);
  const closed = opts.status === "CLOSED";
  const resolvedish = opts.status === "RESOLVED" || closed;
  const t = await prisma.ticket.create({
    data: {
      docNo: dn,
      formType: opts.formType,
      siteCode: opts.siteCode,
      requesterId: opts.requesterId,
      reqName: opts.reqName,
      reqDept: opts.reqDept ?? null,
      reqPosition: "เจ้าหน้าที่",
      reqPhone: "1234",
      reqEmail: opts.reqEmail,
      serviceSiteCode: opts.siteCode,
      status: opts.status,
      itStatus: opts.itStatus ?? (opts.status === "OPEN" ? "NEW" : closed ? "CLOSED" : "IN_PROGRESS"),
      userStatus: opts.userStatus,
      assignedToId: opts.assigneeId ?? null,
      notifyEmail: true,
      note: null,
      formData: JSON.stringify(FORM_DATA[opts.formType]?.() ?? {}),
      slaHours: SLA[opts.formType],
      slaDueAt: addBusinessHours(created, SLA[opts.formType]),
      createdAt: created,
      receivedAt: opts.status === "OPEN" ? null : ago(Math.max(0, opts.createdDaysAgo - 1)),
      resolvedAt: resolvedish ? ago(Math.max(0, opts.createdDaysAgo - 2)) : null,
      closedAt: closed ? ago(Math.max(0, opts.createdDaysAgo - 3)) : null,
      closedById: closed ? opts.assigneeId ?? null : null,
    },
  });
  for (const e of opts.events) {
    await prisma.ticketEvent.create({
      data: {
        ticketId: t.id,
        actorId: e.actorId ?? opts.requesterId,
        action: e.action,
        comment: e.comment ?? null,
        createdAt: ago(e.daysAgo),
      },
    });
  }
  return t;
}

async function tickets(demoUsers: { id: number; displayName: string; email: string | null; role: string; siteCode: string | null }[]) {
  const it = demoUsers.filter((u) => u.role === "IT_STAFF");
  const reg = demoUsers.filter((u) => u.role === "USER");
  const itId = () => rnd(it).id;

  const approvers = await prisma.approver.findMany({ where: { active: true } });
  const apprIT = approvers.filter((a) => a.type === "IT");
  const apprAcc = approvers.filter((a) => a.type === "ACCOUNTING");

  type Spec = { form: string; status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELLED"; age: number; us: string; withAppr?: "pending" | "approved" | "rejected" };
  const specs: Spec[] = [
    { form: "F06", status: "OPEN", age: 0, us: "รอรับบริการ" },
    { form: "F06", status: "OPEN", age: 2, us: "รอรับบริการ" },
    { form: "F06", status: "IN_PROGRESS", age: 3, us: "กำลังดำเนินการ" },
    { form: "F06", status: "IN_PROGRESS", age: 6, us: "กำลังดำเนินการ" },
    { form: "F06", status: "CLOSED", age: 12, us: "เสร็จสิ้น (ผู้แจ้งยืนยัน)" },
    { form: "F06", status: "CLOSED", age: 20, us: "ประเมินแล้ว" },
    { form: "F11", status: "OPEN", age: 1, us: "รอเปลี่ยน/แก้ไขรหัสผ่าน" },
    { form: "F11", status: "IN_PROGRESS", age: 2, us: "กำลังดำเนินการ" },
    { form: "F11", status: "CLOSED", age: 8, us: "ประเมินแล้ว" },
    { form: "F11", status: "CLOSED", age: 15, us: "เสร็จสิ้น (ผู้แจ้งยืนยัน)" },
    { form: "F07", status: "OPEN", age: 1, us: "รอตรวจสอบ/อนุมัติ", withAppr: "pending" },
    { form: "F07", status: "IN_PROGRESS", age: 5, us: "กำลังดำเนินการ", withAppr: "approved" },
    { form: "F07", status: "CLOSED", age: 18, us: "ประเมินแล้ว", withAppr: "approved" },
    { form: "F10", status: "OPEN", age: 2, us: "รอตรวจสอบ/อนุมัติ", withAppr: "pending" },
    { form: "F10", status: "CANCELLED", age: 9, us: "ไม่อนุมัติ", withAppr: "rejected" },
    { form: "F12", status: "IN_PROGRESS", age: 3, us: "กำลังดำเนินการ" },
    { form: "F12", status: "RESOLVED", age: 4, us: "รอผู้แจ้งยืนยันปิดงาน" },
    { form: "F02", status: "RESOLVED", age: 1, us: "รอผู้รับมอบยืนยันการรับมอบ" },
    { form: "F02", status: "CLOSED", age: 10, us: "เสร็จสิ้น (ผู้แจ้งยืนยัน)" },
    { form: "F03", status: "OPEN", age: 0, us: "รอรับบริการ" },
    { form: "F03", status: "RESOLVED", age: 3, us: "ให้ยืมแล้ว รอคืนอุปกรณ์" },
    { form: "F03", status: "CLOSED", age: 14, us: "เสร็จสิ้น (ผู้แจ้งยืนยัน)" },
  ];

  const made: { t: { id: number; formType: string; status: string }; spec: Spec }[] = [];
  for (const s of specs) {
    const u = s.form === "F02" ? rnd(it) : rnd(reg);
    const assignee =
      s.form === "F02" ? u.id : s.status === "OPEN" ? null : itId();
    const ev: { action: string; comment?: string; daysAgo: number; actorId?: number | null }[] = [
      { action: "CREATE", comment: `เปิดเรื่อง ${FORM_TITLE[s.form]}`, daysAgo: s.age },
    ];
    if (s.status !== "OPEN") ev.push({ action: "RECEIVE", comment: "รับเรื่อง", daysAgo: Math.max(0, s.age - 1), actorId: assignee });
    if (s.status === "CLOSED") {
      ev.push({ action: "RESOLVE", comment: "ดำเนินการเสร็จ", daysAgo: Math.max(0, s.age - 2), actorId: assignee });
      ev.push({ action: "CONFIRM_CLOSE", comment: "ผู้แจ้งยืนยัน", daysAgo: Math.max(0, s.age - 3) });
    }
    if (s.status === "CANCELLED") ev.push({ action: "REJECT", comment: "ไม่อนุมัติ - งบไม่ผ่าน", daysAgo: Math.max(0, s.age - 2), actorId: assignee ?? itId() });

    const t = await makeTicket({
      formType: s.form,
      requesterId: u.id,
      assigneeId: assignee,
      createdDaysAgo: s.age,
      status: s.status,
      userStatus: s.us,
      reqName: u.displayName,
      reqEmail: u.email ?? "",
      reqDept: rnd(DEPTS),
      siteCode: u.siteCode ?? "02",
      events: ev,
    });

    if (s.withAppr) {
      const steps = s.form === "F07" ? ["CHECK", "ACCOUNTING", "APPROVE"] : ["CHECK", "APPROVE"];
      for (let i = 0; i < steps.length; i++) {
        const pool = steps[i] === "ACCOUNTING" ? apprAcc : apprIT;
        const st =
          s.withAppr === "approved" ? "APPROVED" : s.withAppr === "rejected" && i === 0 ? "REJECTED" : s.withAppr === "rejected" ? "PENDING" : "PENDING";
        await prisma.ticketApproval.create({
          data: {
            ticketId: t.id,
            step: steps[i],
            seq: i + 1,
            approverId: rnd(pool)?.id ?? null,
            status: st,
            actedAt: st === "PENDING" ? null : ago(Math.max(0, s.age - 1)),
          },
        });
      }
    }
    made.push({ t, spec: s });
  }

  // evaluations on some closed tickets
  const closedT = made.filter((m) => m.t.status === "CLOSED").slice(0, 5);
  for (const m of closedT) {
    await prisma.evaluation.create({
      data: {
        ticketId: m.t.id,
        raterId: reg[0]?.id ?? null,
        score: rnd([5, 5, 4, 4, 3]),
        scoreQuality: rnd([5, 5, 4, 4, 3]),
        scoreSpeed: rnd([5, 4, 4, 3, 3]),
        comment: rnd(["เจ้าหน้าที่บริการดีมาก รวดเร็ว", "แก้ปัญหาได้เรียบร้อย", "รอนานไปนิด แต่โอเค", ""]),
        createdAt: ago(2),
      },
    });
  }
  return made;
}

async function loanItems() {
  const mk = (name: string, category: string, serial: string, site = "02") =>
    prisma.loanItem.create({ data: { name, category, serial, siteCode: site } });
  const items = [];
  for (let i = 1; i <= 4; i++) items.push(await mk(`Notebook Dell Latitude #${i}`, "notebook", `NB-DL-${1000 + i}`));
  for (let i = 1; i <= 3; i++) items.push(await mk(`ลำโพงประชุม Jabra Speak 710 #${i}`, "speakerphone", `JB-710-${i}`));
  items.push(await mk("Projector Epson EB-X06", "projector", "EPX06-01"));
  items.push(await mk("Projector BenQ MX560", "projector", "BQ560-01", "01"));
  items.push(await mk("จอ Portable ASUS ZenScreen", "monitor", "ZS-001"));
  return items;
}

async function loans(items: { id: number; name: string }[], f03Tickets: { id: number; formType: string; status: string }[]) {
  const nb = items.filter((i) => i.name.includes("Notebook"));
  const sp = items.filter((i) => i.name.includes("Jabra"));
  const lent = f03Tickets.find((t) => t.status === "RESOLVED");
  const closed = f03Tickets.find((t) => t.status === "CLOSED");

  // active loan tied to the RESOLVED F03
  if (lent && nb[0]) {
    await prisma.loan.create({
      data: { itemId: nb[0].id, ticketId: lent.id, borrowerName: "ผู้ยืมเดโม", borrowDate: ago(3), dueDate: ahead(4), status: "ONLOAN", createdAt: ago(3) },
    });
  }
  // overdue loan (no ticket)
  if (sp[0]) {
    await prisma.loan.create({
      data: { itemId: sp[0].id, borrowerName: "ฝ่ายการตลาด (คุณนภา)", borrowDate: ago(14), dueDate: ago(4), status: "ONLOAN", createdAt: ago(14) },
    });
  }
  // returned loan tied to the CLOSED F03
  if (closed && nb[1]) {
    await prisma.loan.create({
      data: { itemId: nb[1].id, ticketId: closed.id, borrowerName: "ผู้ยืมเดโม", borrowDate: ago(14), dueDate: ago(7), returnedAt: ago(8), status: "RETURNED", createdAt: ago(14) },
    });
  }
}

async function assets() {
  const brands = ["DELL", "HP", "LENOVO", "ASUS"];
  for (let i = 1; i <= 8; i++) {
    const b = rnd(brands);
    await prisma.asset.create({
      data: {
        assetNo: `PC-${rnd(SITES)}-${String(100 + i).padStart(4, "0")}`,
        siteCode: rnd(SITES),
        assetType: rnd(["PC Asset", "Notebook Asset"]),
        userName: `${rnd(FIRST)} ${rnd(LAST)}`,
        department: rnd(DEPTS),
        brand: b,
        model: `${b} Model ${1000 + i}`,
        serialNumber: `SN${Math.floor(Math.random() * 999999)}`,
        ipAddress: `10.${rnd(SITES)}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`,
        status: rnd(["ใช้งาน", "ใช้งาน", "ใช้งาน", "สำรองใช้งาน", "ไม่ได้ใช้งาน"]),
        data: JSON.stringify({
          cpuGen: rnd(["10", "11", "12", "13"]),
          totalRam: rnd(["8 GB", "16 GB", "32 GB"]),
          ssd: "yes",
          os: "Windows 11 Pro",
          receivedDate: ymd(ago(300 + i * 30)),
        }),
      },
    });
  }
}

async function holidays() {
  const list: [string, string][] = [
    ["2026-01-01", "วันขึ้นปีใหม่"],
    ["2026-04-13", "วันสงกรานต์"],
    ["2026-04-14", "วันสงกรานต์"],
    ["2026-04-15", "วันสงกรานต์"],
    ["2026-05-01", "วันแรงงานแห่งชาติ"],
    ["2026-12-05", "วันคล้ายวันพระบรมราชสมภพ ร.9"],
    ["2026-12-10", "วันรัฐธรรมนูญ"],
    ["2026-12-31", "วันสิ้นปี"],
  ];
  for (const [dateKey, name] of list) {
    await prisma.holiday.upsert({ where: { dateKey }, create: { dateKey, name }, update: { name } });
  }
}

async function main() {
  await wipe();
  const u = await users();
  await holidays();
  const made = await tickets(u);
  const items = await loanItems();
  await loans(
    items,
    made.filter((m) => m.t.formType === "F03").map((m) => m.t),
  );
  await assets();

  // keep DocCounter in sync so real tickets continue after the demo ones
  for (const [period, seq] of Object.entries(counters)) {
    await prisma.docCounter.upsert({ where: { period }, create: { period, seq }, update: { seq } });
  }

  console.log("demo seed done:", {
    users: u.length,
    tickets: await prisma.ticket.count(),
    approvals: await prisma.ticketApproval.count(),
    evaluations: await prisma.evaluation.count(),
    loanItems: await prisma.loanItem.count(),
    loans: await prisma.loan.count(),
    assets: await prisma.asset.count(),
    holidays: await prisma.holiday.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
