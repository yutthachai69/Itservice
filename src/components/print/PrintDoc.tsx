import { getFormDef, type FieldDef } from "@/lib/form-defs";
import { getPrintDef } from "@/lib/print-def";
import { siteName } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/ui";

// Shape used to render a print page — either a real Ticket (from the DB) or a
// synthetic all-empty one for a blank, fillable-by-hand template.
export type PrintTicketLike = {
  docNo: string;
  formType: string;
  serviceSiteCode: string;
  reqName: string;
  reqDept: string | null;
  reqPosition: string | null;
  reqPhone: string | null;
  reqEmail: string | null;
  note: string | null;
  createdAt: Date;
  formData: string; // JSON
  loans: { id: number; item: { name: string; serial: string | null } }[];
  approvals: { step: string; status: string; approver: { name: string } | null }[];
};

/**
 * Renders one of the TSM paper forms (IT01-IT-Fxx) for printing — mirrors the
 * physical layout. Pass a real ticket to fill it in, or `blank` with an
 * all-empty ticket-shaped object to produce a clean, hand-fillable template
 * (used for forms whose original uploaded PDF has a broken/overlapping text
 * layer — we already know the exact field layout, so we can regenerate a
 * correct blank copy instead of shipping the broken file).
 */
export function PrintDoc({ t, blank = false }: { t: PrintTicketLike; blank?: boolean }) {
  const def = getFormDef(t.formType);
  const p = getPrintDef(t.formType);

  const fd: Record<string, unknown> = (() => {
    try {
      return JSON.parse(t.formData);
    } catch {
      return {};
    }
  })();

  // field lookup across the form-def
  const allFields: FieldDef[] = def ? def.sections.flatMap((s) => s.fields) : [];
  const field = (key: string) => allFields.find((f) => f.key === key);
  const labelOf = (key: string) => field(key)?.label ?? key;
  const display = (key: string): string => {
    const f = field(key);
    const v = fd[key];
    if (Array.isArray(v)) return v.map((x) => f?.options?.find((o) => o.value === x)?.label ?? x).join(", ");
    if (v == null || v === "") return "";
    if (f?.type === "datetime" || f?.type === "date") return fmtDate(String(v));
    return f?.options?.find((o) => o.value === v)?.label ?? String(v);
  };

  // checkbox / select options + which are ticked
  const checkOptions = p.checkboxField ? field(p.checkboxField)?.options ?? [] : [];
  const checked = new Set<string>(
    p.checkboxField
      ? Array.isArray(fd[p.checkboxField])
        ? (fd[p.checkboxField] as string[])
        : fd[p.checkboxField]
          ? [String(fd[p.checkboxField])]
          : []
      : [],
  );

  // F13 print table: the real paper form writes just "งาน-ทั่วไป" / "ผู้ปฏิบัติงาน"
  // in each Transection/UserLevel row and explains the "(แนะนำ)"/"(View/Print/…)"
  // parenthetical once in the footnote legend — using the full option label in
  // every row (as elsewhere in the app) wrapped badly and didn't match the source.
  const shortLabel = (key: string) => display(key).split(" (")[0];

  const reason = p.reasonField ? display(p.reasonField) : "";
  const extras = (p.userExtraFields ?? [])
    .map((k) => ({ label: labelOf(k), value: display(k) }))
    .filter((x) => x.value !== "");

  return (
    <div className="print-doc mx-auto bg-white text-[12px] leading-relaxed text-black">
      <style>{`
        @page { size: A4; margin: 12mm 12mm 14mm; }
        .print-doc { width: 186mm; }
        @media screen { .print-doc { padding: 12mm; box-shadow: 0 0 0 1px #e2e8f0; margin: 16px auto 40px; } }
        .bx { border: 1px solid #000; }
        .bx + .bx { border-top: 0; }
        .fld { border-bottom: 1px dotted #000; }
        .cell { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
        .tall { height: 26mm; }
        .softrow { min-height: 9mm; }
        .sig { border-bottom: 1px dotted #000; height: 12mm; }
        table.ptbl { border-collapse: collapse; width: 100%; }
      `}</style>

      {p.layout !== "softpro" && (
        <>
          {/* ── header (F06/F11/F12/F03/F02/F07/F10) ── */}
          <div className="flex items-start gap-3 pb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/TSM.png" alt="" className="h-12 w-12 object-contain" />
            <div className="flex-1 text-center">
              <div className="text-[16px] font-bold">{p.title}</div>
            </div>
            <div className="w-[46mm] text-[11px]">
              <div>
                วันที่แจ้ง <span className="fld inline-block min-w-[24mm]">{blank ? "" : fmtDate(t.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between text-[11px]">
            <div>
              บริษัทที่ขอรับบริการ{" "}
              <span className="fld inline-block min-w-[40mm]">{blank ? "" : siteName(t.serviceSiteCode)}</span>
            </div>
            <div>
              เลขเอกสาร <span className="fld inline-block min-w-[34mm] font-mono">{t.docNo}</span>
            </div>
          </div>
        </>
      )}

      {p.layout === "softpro" ? (
        <>
          {/* ── softpro layout (F13) — mirrors the real paper form exactly: no
              logo/วันที่แจ้ง/บริษัทที่ขอรับบริการ line like the other forms —
              just doc number, centered title, "Page 1 of 1" ── */}
          <div className="flex items-start justify-between text-[11px]">
            <div>เลขที่เอกสาร {t.docNo}</div>
            <div className="flex-1 whitespace-pre-line text-center text-[14px] font-bold">{p.title}</div>
            <div>Page 1 of 1</div>
          </div>

          <table className="ptbl mt-2 w-full text-[10px]" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th className="cell text-left">ชื่อ-นามสกุล</th>
                <th className="cell text-left">แผนก</th>
                <th className="cell text-left">ตำแหน่ง</th>
                <th className="cell text-left">
                  สังกัด
                  <br />
                  (ชื่อย่อ)
                </th>
                <th className="cell text-left">
                  บริษัทที่ปฏิบัติงาน
                  <br />
                  (Division)
                </th>
                <th className="cell text-left">Transection</th>
                <th className="cell text-left">UserLevel</th>
                <th className="cell text-left">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cell softrow align-top">
                  <div>{blank ? "" : t.reqName}</div>
                  {(blank || display("reqNameEn")) && (
                    <div className="text-slate-500">{blank ? "" : display("reqNameEn")}</div>
                  )}
                  <div className="mt-2">
                    ลำดับY:{" "}
                    <span className="fld inline-block min-w-[14mm]">{blank ? "" : display("prApprovalOrder")}</span>
                  </div>
                  <div>
                    วงเงินอนุมัติ(PR):{" "}
                    <span className="fld inline-block min-w-[14mm]">{blank ? "" : display("prApprovalLimit")}</span>
                  </div>
                </td>
                <td className="cell softrow align-top">{blank ? "" : t.reqDept ?? ""}</td>
                <td className="cell softrow align-top">{blank ? "" : t.reqPosition ?? ""}</td>
                <td className="cell softrow align-top">{blank ? "" : display("serviceSiteCode")}</td>
                <td className="cell softrow align-top">
                  {!blank &&
                    checkOptions
                      .filter((o) => checked.has(o.value))
                      .map((o) => <div key={o.value}>{o.label}</div>)}
                </td>
                <td className="cell softrow align-top">
                  {!blank &&
                    [1, 2, 3, 4, 5]
                      .map((n) => shortLabel(`workFunction${n}`))
                      .filter(Boolean)
                      .map((v, i) => <div key={i}>{v}</div>)}
                </td>
                <td className="cell softrow align-top">
                  {!blank &&
                    [1, 2, 3, 4, 5]
                      .map((n) => shortLabel(`userLevel${n}`))
                      .filter(Boolean)
                      .map((v, i) => <div key={i}>{v}</div>)}
                </td>
                <td className="cell softrow whitespace-pre-wrap align-top">{blank ? "" : t.note ?? ""}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 flex w-full justify-between gap-6 text-[11px]">
            <SoftproSignature role={p.userSignature} name={blank ? "" : t.reqName} />
            {(!blank && t.approvals.length > 0
              ? t.approvals.map((a) => ({
                  name: a.approver?.name ?? "",
                  role: a.step === "CHECK" ? "ผู้ตรวจสอบ" : "ผู้อนุมัติ",
                }))
              : [
                  { name: "", role: "ผู้ตรวจสอบ" },
                  { name: "", role: "ผู้อนุมัติ" },
                ]
            ).map((s, i) => (
              <SoftproSignature key={i} role={s.role} name={s.name} />
            ))}
          </div>

          {p.approvalNote && <p className="mt-2 w-full whitespace-pre-line text-[9px] leading-snug">{p.approvalNote}</p>}

          <div className="bx mt-3 w-full p-2 text-[11px]">
            <div className="flex justify-between gap-8">
              <span className="font-bold">ฝ่ายเทคโนโลยีสารสนเทศ รับงาน</span>
              <span className="flex-1">
                บันทึกข้อความ / ความเห็น <span className="fld inline-block min-w-[50mm]" />
              </span>
            </div>
            <div className="mt-4 flex justify-between gap-10">
              {(p.itBoxSignatures ?? []).map((role, i) => (
                <SoftproSignature key={i} role={role} name="" />
              ))}
            </div>
          </div>
        </>
      ) : p.layout === "boxed" ? (
        <>
          {/* ── USER box ── */}
          <div className="bx mt-2 p-2">
            <div className="text-[12px] font-bold">ส่วนของผู้ขอรับบริการ (USER)</div>

            <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
              <div>
                ชื่อ-นามสกุล <span className="fld inline-block min-w-[45mm]">{t.reqName}</span>
              </div>
              <div>
                ฝ่าย/แผนก <span className="fld inline-block min-w-[45mm]">{t.reqDept ?? ""}</span>
              </div>
              <div>
                ตำแหน่ง <span className="fld inline-block min-w-[45mm]">{t.reqPosition ?? ""}</span>
              </div>
              <div>
                โทรศัพท์ <span className="fld inline-block min-w-[45mm]">{t.reqPhone ?? ""}</span>
              </div>
              <div>
                Email <span className="fld inline-block min-w-[45mm]">{t.reqEmail ?? ""}</span>
              </div>
              <div>
                บริษัท <span className="fld inline-block min-w-[45mm]">{blank ? "" : siteName(t.serviceSiteCode)}</span>
              </div>
            </div>

            {checkOptions.length > 0 && (
              <div className="mt-2 text-[11px]">
                <div className="font-semibold">รายละเอียดรายการ</div>
                <div className="mt-1 flex flex-wrap gap-x-8 gap-y-1">
                  {checkOptions.map((o) => (
                    <span key={o.value}>{checked.has(o.value) ? "☑" : "☐"} {o.label}</span>
                  ))}
                </div>
              </div>
            )}

            {(blank ? p.userExtraFields ?? [] : extras.map((e) => e.label)).length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                {(blank
                  ? (p.userExtraFields ?? []).map((k) => ({ label: labelOf(k), value: "" }))
                  : extras
                ).map((e) => (
                  <div key={e.label}>
                    {e.label} <span className="fld inline-block min-w-[40mm]">{e.value}</span>
                  </div>
                ))}
              </div>
            )}

            <table className="ptbl mt-2">
              <thead>
                <tr>
                  <th className="cell w-2/3 text-left text-[11px]">{p.reasonLabel}</th>
                  <th className="cell text-left text-[11px]">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="cell tall whitespace-pre-wrap text-[11px]">{reason}</td>
                  <td className="cell tall whitespace-pre-wrap text-[11px]">{t.note ?? ""}</td>
                </tr>
              </tbody>
            </table>

            <div className="mx-auto mt-4 w-[70mm] text-center text-[11px]">
              <div className="sig" />
              <div>( {blank ? "" : t.reqName} )</div>
              <div className="text-slate-600">{p.userSignature}</div>
            </div>
          </div>

          {/* ── IT box ── */}
          <div className="bx p-2">
            <div className="text-[12px] font-bold">ส่วนของผู้ให้บริการ (IT)</div>

            {p.loanDetails ? (
              <table className="ptbl mt-2 text-[11px]">
                <thead>
                  <tr>
                    <th className="cell w-1/2 text-left">รายละเอียด รุ่น/Spec</th>
                    <th className="cell text-left">สถานะ/สภาพอุปกรณ์</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="cell tall align-top">
                      {!blank && t.loans.length > 0 ? (
                        t.loans.map((l) => (
                          <div key={l.id}>
                            {l.item.name}
                            {l.item.serial ? ` · S/N ${l.item.serial}` : ""}
                          </div>
                        ))
                      ) : (
                        <>
                          <div>Brand ..............................................</div>
                          <div>Model ..............................................</div>
                          <div>Serial Number ................................</div>
                        </>
                      )}
                    </td>
                    <td className="cell tall align-top">
                      <div>☐ ปกติ&nbsp;&nbsp;&nbsp;☐ ใหม่</div>
                      <div className="mt-2">PC Asset ...........................................</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="ptbl mt-2">
                <thead>
                  <tr>
                    <th className="cell w-2/3 text-left text-[11px]">{p.itBoxLabel ?? "ปัญหา/การดำเนินการ"}</th>
                    <th className="cell text-left text-[11px]">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="cell tall" />
                    <td className="cell tall" />
                  </tr>
                </tbody>
              </table>
            )}

            <div className="mt-4 flex justify-between gap-6 text-[11px]">
              {(p.itSignatures ?? []).map((role, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className="sig" />
                  <div>( ................................ )</div>
                  <div className="text-slate-600">{role}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── approval layout (F07 / F10) ── */}
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
            <div>
              ชื่อภาษาไทย <span className="fld inline-block min-w-[45mm]">{t.reqName}</span>
            </div>
            <div>
              แผนก <span className="fld inline-block min-w-[45mm]">{t.reqDept ?? ""}</span>
            </div>
            <div>
              ตำแหน่ง <span className="fld inline-block min-w-[45mm]">{t.reqPosition ?? ""}</span>
            </div>
            <div>
              โทรศัพท์ <span className="fld inline-block min-w-[45mm]">{t.reqPhone ?? ""}</span>
            </div>
            {(blank || display("reqNameEn")) && (
              <div className="col-span-2">
                ชื่อภาษาอังกฤษ (Name-Lastname){" "}
                <span className="fld inline-block min-w-[90mm]">{blank ? "" : display("reqNameEn")}</span>
              </div>
            )}
          </div>

          {checkOptions.length > 0 && (
            <div className="mt-2 text-[11px]">
              <div className="font-semibold">
                {t.formType === "F07"
                  ? "รายละเอียดในการแก้ไขข้อมูลระบบ"
                  : "รายละเอียดในการขอใช้งาน/ยกเลิก ระบบเทคโนโลยีสารสนเทศ"}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-8 gap-y-1">
                {checkOptions.map((o) => (
                  <span key={o.value}>{checked.has(o.value) ? "☑" : "☐"} {o.label}</span>
                ))}
              </div>
              {(blank || display("systemOther")) && (
                <div className="mt-1">
                  อื่นๆ (ระบุ) <span className="fld inline-block min-w-[80mm]">{blank ? "" : display("systemOther")}</span>
                </div>
              )}
              {(blank || display("itemsDetail")) && (
                <div className="mt-1">
                  ระบุชื่อระบบ/รายละเอียด{" "}
                  <span className="fld inline-block min-w-[80mm]">{blank ? "" : display("itemsDetail")}</span>
                </div>
              )}
            </div>
          )}

          {(blank ? p.userExtraFields ?? [] : extras.map((e) => e.label)).length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
              {(blank
                ? (p.userExtraFields ?? []).map((k) => ({ label: labelOf(k), value: "" }))
                : extras
              ).map((e, i) => (
                <div key={`${e.label}-${i}`}>
                  {e.label} <span className="fld inline-block min-w-[40mm]">{e.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <table className="ptbl flex-1">
              <thead>
                <tr>
                  <th className="cell text-left text-[11px]">{p.reasonLabel}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="cell whitespace-pre-wrap text-[11px]" style={{ height: "42mm" }}>
                    {reason}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="w-[52mm] space-y-3 pt-1 text-[11px]">
              {(!blank && t.approvals.length > 0
                ? t.approvals.map((a) => ({
                    name: a.approver?.name ?? "",
                    role:
                      a.step === "CHECK"
                        ? "ผู้ตรวจสอบ"
                        : a.step === "ACCOUNTING"
                          ? "ผู้ตรวจสอบ (บัญชี)"
                          : "ผู้อนุมัติ",
                    ok: a.status === "APPROVED",
                  }))
                : [
                    { name: "", role: "ผู้ตรวจสอบ", ok: false },
                    { name: "", role: "ผู้อนุมัติ", ok: false },
                  ]
              ).map((s, i) => (
                <div key={i} className="text-right">
                  <span className="fld inline-block min-w-[36mm] text-center align-bottom">{s.name}</span>{" "}
                  {s.role}
                </div>
              ))}
              <div className="text-right">
                <span className="fld inline-block min-w-[36mm]">&nbsp;</span> {p.userSignature}
              </div>
            </div>
          </div>

          {p.approvalNote && <p className="mt-2 text-[9px] leading-snug">{p.approvalNote}</p>}

          {/* ส่วนเทคโนโลยีสารสนเทศ */}
          <div className="bx mt-3 p-2">
            <div className="flex items-start justify-between">
              <div className="text-[12px] font-bold">ส่วนเทคโนโลยีสารสนเทศ</div>
              <div className="text-[10px]">
                <div>หมายเลขที่งาน .....................................</div>
                <div>วันที่แก้ไข ..................... เวลา .............</div>
              </div>
            </div>
            <div className="mt-6 flex gap-10 text-[11px]">
              {(p.itBoxSignatures ?? []).map((role, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className="sig" />
                  <div>( ................................ )</div>
                  <div className="text-slate-600">{role}</div>
                </div>
              ))}
            </div>
          </div>

          {(blank || display("obstacles")) && (
            <p className="mt-2 text-[11px]">
              ปัญหาอุปสรรค (ถ้ามี){" "}
              <span className="fld inline-block min-w-[120mm]">{blank ? "" : display("obstacles")}</span>
            </p>
          )}
        </>
      )}

      <div className="mt-3 flex justify-between border-t border-slate-300 pt-1 text-[9px] text-slate-500">
        <span>{blank ? "แบบฟอร์มเปล่าสำหรับพิมพ์กรอกด้วยมือ" : `พิมพ์เมื่อ ${fmtDateTime(new Date())} · เอกสาร ${t.docNo}`}</span>
        <span>{p.docCode}</span>
      </div>
    </div>
  );
}

/**
 * F13 (softpro layout) signature block — matches the real paper form's
 * pattern of writing the role label directly on the signature line itself
 * ("ผู้ขอ.....................") rather than as a caption underneath, with
 * the name in parens below it and a blank day/month/year date under that.
 */
function SoftproSignature({ role, name }: { role: string; name: string }) {
  return (
    <div className="flex-1">
      <div className="fld">{role}</div>
      <div className="mt-1 text-center">( {name} )</div>
      <div className="mt-1 text-center text-slate-500">......../......../........</div>
    </div>
  );
}
