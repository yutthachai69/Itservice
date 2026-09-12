import { NextRequest, NextResponse } from "next/server";
import { readFileSync, statSync } from "fs";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import { listFormFiles } from "@/lib/form-files";
import { titleFor } from "@/lib/doc-meta";

// Serves the blank form PDFs instead of linking straight to
// /forms/<original filename>.pdf, for two reasons:
//  1. The files are named in Thai; browsers deriving a tab title / download
//     name from a raw percent-encoded URL (no charset hint) can mojibake it.
//     A proper RFC 5987 Content-Disposition filename fixes the download name.
//  2. Some of these PDFs carry garbage/leftover /Title metadata baked in by
//     whatever tool exported them (e.g. a literal control-byte prefix plus
//     "IT01-IT Rewrite 3.5.2024.xlsx" — an old source filename). Chrome's
//     built-in PDF viewer shows THAT for the tab title when previewing
//     inline, ignoring Content-Disposition entirely — so we also rewrite the
//     PDF's own /Title via pdf-lib before sending it.

const DIR = join(process.cwd(), "public", "forms");
const cache = new Map<string, Buffer>();

async function cleanPdf(file: string, code: string): Promise<Buffer> {
  const path = join(DIR, file);
  const cacheKey = `${file}:${statSync(path).mtimeMs}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const raw = readFileSync(path);
  let out = raw;
  try {
    const pdfDoc = await PDFDocument.load(raw, { ignoreEncryption: true, updateMetadata: false });
    pdfDoc.setTitle(titleFor(code));
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    out = Buffer.from(await pdfDoc.save());
  } catch {
    // if pdf-lib can't parse it for some reason, fall back to the raw bytes
    // rather than failing the download
  }
  // this route only ever serves a handful of files, so an unbounded cache is fine
  cache.set(cacheKey, out);
  return out;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const match = listFormFiles().find((f) => f.code === code.toUpperCase());
  if (!match) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let buf: Buffer;
  try {
    buf = await cleanPdf(match.file, match.code);
  } catch {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const download = req.nextUrl.searchParams.get("mode") === "download";
  const asciiName = `${match.code}.pdf`; // safe fallback for clients that ignore filename*
  const prettyName = `${titleFor(match.code)}.pdf`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(prettyName)}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
