import { existsSync } from "fs";
import { join } from "path";

// Optional thumbnail images for the /documents cards. Drop a file named after
// the form code into public/documents/ (e.g. "F06.png") and it replaces the
// icon tile automatically — no code changes needed.

const DIR = join(process.cwd(), "public", "documents");
const EXTS = ["png", "jpg", "jpeg", "webp", "svg"];

/** public URL of public/documents/{CODE}.{ext} if it exists, else null */
export function docThumb(code: string): string | null {
  for (const ext of EXTS) {
    const name = `${code}.${ext}`;
    if (existsSync(join(DIR, name))) return `/documents/${name}`;
  }
  return null;
}
