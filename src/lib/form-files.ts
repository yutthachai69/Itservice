import { readdirSync, statSync } from "fs";
import { join } from "path";

// Downloadable blank form PDFs dropped into public/forms/ by IT.
// Filenames are matched loosely: "F07.pdf", "MN_F07.pdf", "10092026_F07.pdf" all
// resolve to code "F07". Anything else keeps its bare filename as the code.

const DIR = join(process.cwd(), "public", "forms");

export type FormFile = { code: string; file: string; bytes: number };

export function listFormFiles(): FormFile[] {
  let names: string[];
  try {
    names = readdirSync(DIR);
  } catch {
    return [];
  }

  const out: FormFile[] = [];
  for (const name of names) {
    if (!name.toLowerCase().endsWith(".pdf")) continue;
    // grab an Fnn / ITR token wherever it sits: "(F03)…", "MN_F06.pdf",
    // "10092026_F07.pdf", "F11 v2.pdf" all resolve to the bare code.
    const m = name.match(/(?:^|[^A-Za-z])(?:MN[_-])?(F\d{1,2}|ITR)(?![A-Za-z])/i);
    const code = m ? m[1].toUpperCase() : name.replace(/\.pdf$/i, "");
    let bytes = 0;
    try {
      bytes = statSync(join(DIR, name)).size;
    } catch {
      /* ignore */
    }
    out.push({ code, file: name, bytes });
  }
  // stable, natural-ish order by code
  return out.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

/** filename of the PDF for a given form code, or null */
export function formPdfFile(code: string): string | null {
  const want = code.toUpperCase();
  return listFormFiles().find((f) => f.code === want)?.file ?? null;
}
