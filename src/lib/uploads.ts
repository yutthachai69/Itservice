import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

// Local disk storage. Swap for object storage later — keep this the only module
// that touches the filesystem for attachments.
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXT = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".zip", ".rar", ".7z", ".log",
]);

export function validateUpload(name: string, size: number): string | null {
  if (size <= 0) return "ไฟล์ว่าง";
  if (size > MAX_FILE_BYTES) return `ไฟล์ใหญ่เกิน ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB`;
  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return `ไม่รองรับไฟล์ชนิด ${ext || "(ไม่มีนามสกุล)"}`;
  return null;
}

/** returns the stored key (relative path under uploads/) */
export async function saveAttachment(
  ticketId: number,
  originalName: string,
  bytes: Buffer,
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();
  const key = path.join(String(ticketId), `${randomUUID()}${ext}`);
  const full = path.join(UPLOAD_DIR, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  return key.replace(/\\/g, "/");
}

export async function readAttachment(storedKey: string): Promise<Buffer> {
  const full = path.join(UPLOAD_DIR, storedKey);
  if (!full.startsWith(UPLOAD_DIR)) throw new Error("path traversal");
  return readFile(full);
}

export async function deleteAttachment(storedKey: string): Promise<void> {
  const full = path.join(UPLOAD_DIR, storedKey);
  if (!full.startsWith(UPLOAD_DIR)) throw new Error("path traversal");
  await unlink(full).catch(() => {});
}
