import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ticketDateFilter } from "@/lib/ticket-date-filter";
import { isIT, siteName, STATUS_LABEL, IT_STATUS_LABEL } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const sp = req.nextUrl.searchParams;
  const it = isIT(user.role);
  const where: Prisma.TicketWhereInput = {};
  const createdFrom = ticketDateFilter(sp.get("createdFrom"));
  const closedFrom = ticketDateFilter(sp.get("closedFrom"));
  if (createdFrom) where.createdAt = { gte: new Date(createdFrom) };
  if (closedFrom) where.closedAt = { gte: new Date(closedFrom) };
  if (!it || sp.get("mine") === "1") where.requesterId = user.id;
  if (it && sp.get("assignee") === "me") where.assignedToId = user.id;
  if (sp.get("formType")) where.formType = sp.get("formType")!;
  if (sp.get("site")) where.serviceSiteCode = sp.get("site")!;
  const status = sp.get("status") || "active";
  if (status === "active") where.status = { in: ["OPEN", "IN_PROGRESS", "RESOLVED"] };
  else if (status === "closed") where.status = { in: ["CLOSED", "CANCELLED"] };
  else if (status === "closed_only") where.status = "CLOSED";
  else if (status !== "all") where.status = status.toUpperCase();
  if (sp.get("sla") === "overdue") {
    where.itStatus = "NEW";
    where.status = { notIn: ["CLOSED", "CANCELLED"] };
    where.slaDueAt = { lt: new Date() };
  }
  const q = (sp.get("q") ?? "").trim();
  if (q) where.OR = [{ docNo: { contains: q } }, { reqName: { contains: q } }, { note: { contains: q } }];

  const rows = await prisma.ticket.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("tickets");
  ws.columns = [
    { header: "เลขเอกสาร", key: "docNo", width: 14 },
    { header: "ประเภท", key: "formType", width: 8 },
    { header: "บริษัท", key: "site", width: 12 },
    { header: "สถานะ", key: "status", width: 16 },
    { header: "สถานะ IT", key: "itStatus", width: 14 },
    { header: "สถานะผู้ขอ", key: "userStatus", width: 24 },
    { header: "ผู้ขอ", key: "reqName", width: 22 },
    { header: "แผนก", key: "reqDept", width: 22 },
    { header: "วันที่แจ้ง", key: "createdAt", width: 18 },
    { header: "ครบกำหนด SLA", key: "slaDueAt", width: 18 },
    { header: "ปิดงาน", key: "closedAt", width: 18 },
  ];
  ws.getRow(1).font = { bold: true };
  const fmt = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short" }).format(d) : "";

  for (const t of rows) {
    ws.addRow({
      docNo: t.docNo,
      formType: t.formType,
      site: siteName(t.serviceSiteCode),
      status: STATUS_LABEL[t.status] ?? t.status,
      itStatus: IT_STATUS_LABEL[t.itStatus] ?? t.itStatus,
      userStatus: t.userStatus,
      reqName: t.reqName,
      reqDept: t.reqDept ?? "",
      createdAt: fmt(t.createdAt),
      slaDueAt: fmt(t.slaDueAt),
      closedAt: fmt(t.closedAt),
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tickets-${Date.now()}.xlsx"`,
    },
  });
}
