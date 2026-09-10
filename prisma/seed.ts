import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SITES = [
  { code: "01", name: "TUSMBKK" },
  { code: "02", name: "TUSM" },
  { code: "03", name: "TKSM" },
  { code: "04", name: "TSE" },
  { code: "05", name: "TSMB" },
  { code: "06", name: "TTSM" },
];

// sample departments (cascading dropdown source) — replace with real HR/OU data later
const DEPARTMENTS = [
  "ฝ่ายเทคโนโลยีสารสนเทศ",
  "ฝ่ายบัญชีและการเงิน",
  "ฝ่ายทรัพยากรบุคคล",
  "ฝ่ายจัดซื้อ",
  "ฝ่ายขายและการตลาด",
  "สายงานด้านโรงงาน",
  "ฝ่ายคลังสินค้า",
  "สำนักกรรมการผู้จัดการ",
];

// approver names taken from the legacy F07/F10 dropdowns
const IT_APPROVERS = [
  "นายทวีศักดิ์ เนื่องยินดี",
  "นายกานต์ ดิษฐขัมภะ",
  "นายปฏิพัทธ์ วงศ์รัตน์วิจิตต์",
  "นายกฤษณะ วิไลกุล",
  "นายมนตรี บุญประคม",
  "นายบัณฑิต ว่องวัฒนะสิน",
];
const ACCOUNTING_APPROVERS = [
  "นายชัยมนัส ตั้งธรรม",
  "นางสาวสุนันทา จรัญวรากรชัย",
  "นายสุรชัย ปรัชญาโณทัย",
  "นายบุญชอบ กล่อมดี",
  "นายณฐพล บุญศิริ",
  "นางสาวนาตยา ผิวสว่าง",
  "นางสาวจิตินันท์ เลียงกลกิจ",
  "นางสาวเยาวลักษณ์ ชัยรุ่งเรืองสิน",
  "นางสนธยาภรณ์ ไกรวงษ์",
];

async function main() {
  for (const s of SITES) {
    await prisma.site.upsert({ where: { code: s.code }, create: s, update: { name: s.name } });
  }

  for (const s of SITES) {
    for (const name of DEPARTMENTS) {
      await prisma.department.upsert({
        where: { siteCode_name: { siteCode: s.code, name } },
        create: { siteCode: s.code, name },
        update: {},
      });
    }
  }

  for (const name of IT_APPROVERS) {
    const found = await prisma.approver.findFirst({ where: { name, type: "IT" } });
    if (!found) await prisma.approver.create({ data: { name, type: "IT" } });
  }
  for (const name of ACCOUNTING_APPROVERS) {
    const found = await prisma.approver.findFirst({ where: { name, type: "ACCOUNTING" } });
    if (!found) await prisma.approver.create({ data: { name, type: "ACCOUNTING" } });
  }

  const itDept = await prisma.department.findFirst({
    where: { siteCode: "02", name: "ฝ่ายเทคโนโลยีสารสนเทศ" },
  });
  const hrDept = await prisma.department.findFirst({
    where: { siteCode: "02", name: "ฝ่ายทรัพยากรบุคคล" },
  });

  const demoUsers = [
    {
      username: "user.demo",
      displayName: "สมชาย ผู้ใช้งาน",
      email: "user.demo@tsmgroup.local",
      position: "เจ้าหน้าที่",
      phone: "1234",
      siteCode: "02",
      departmentId: hrDept?.id ?? null,
      role: "USER",
    },
    {
      username: "it.staff",
      displayName: "IT Support (เจ้าหน้าที่)",
      email: "it.staff@tsmgroup.local",
      position: "เจ้าหน้าที่สนับสนุนระบบ",
      phone: "2001",
      siteCode: "02",
      departmentId: itDept?.id ?? null,
      role: "IT_STAFF",
    },
    {
      username: "it.lead",
      displayName: "IT Lead (หัวหน้า)",
      email: "it.lead@tsmgroup.local",
      position: "หัวหน้าแผนกไอที",
      phone: "2000",
      siteCode: "02",
      departmentId: itDept?.id ?? null,
      role: "IT_LEAD",
      roleLocked: true,
    },
    {
      username: "admin",
      displayName: "System Admin",
      email: "admin@tsmgroup.local",
      position: "ผู้ดูแลระบบ",
      phone: "2099",
      siteCode: "02",
      departmentId: itDept?.id ?? null,
      role: "ADMIN",
      roleLocked: true,
    },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { username: u.username },
      create: u,
      update: { role: u.role, displayName: u.displayName, roleLocked: u.roleLocked ?? false },
    });
  }

  console.log("seed done:", {
    sites: SITES.length,
    departments: await prisma.department.count(),
    approvers: await prisma.approver.count(),
    users: await prisma.user.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
