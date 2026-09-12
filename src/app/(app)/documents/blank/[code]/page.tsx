import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getFormDef } from "@/lib/form-defs";
import { PrintDoc, type PrintTicketLike } from "@/components/print/PrintDoc";
import { AutoPrint } from "@/components/AutoPrint";

// A clean, hand-fillable blank copy of a paper form, generated from the same
// field layout that drives the real ticket form + print output — used when
// the originally uploaded PDF for that code has a broken/overlapping text
// layer and can't just be linked to directly. Add ?print=1 to jump straight
// to the browser's print dialog (Save as PDF).
export default async function BlankFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  if (!getFormDef(code)) notFound();

  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;

  const blankTicket: PrintTicketLike = {
    docNo: "",
    formType: code,
    serviceSiteCode: "",
    reqName: "",
    reqDept: "",
    reqPosition: "",
    reqPhone: "",
    reqEmail: "",
    note: "",
    createdAt: new Date(),
    formData: "{}",
    loans: [],
    approvals: [],
  };

  return (
    <>
      {sp.print === "1" && <AutoPrint />}
      <PrintDoc t={blankTicket} blank />
    </>
  );
}
