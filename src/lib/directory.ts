// Maps Microsoft Graph / AD profile fields onto our own Site codes + a normalized
// profile shape. One place to adjust when HR's naming differs from ours.

import { SITES } from "./constants";

export interface DirectoryProfile {
  /** stable login key — sAMAccountName / UPN local-part */
  username: string;
  displayName: string;
  email: string | null;
  jobTitle: string | null;
  department: string | null;
  officeLocation: string | null;
  companyName: string | null;
  phone: string | null;
}

/** Graph /me payload -> DirectoryProfile */
export function profileFromGraph(me: Record<string, unknown>): DirectoryProfile {
  const upn = String(me.userPrincipalName ?? me.mail ?? "");
  const sam = me.onPremisesSamAccountName ? String(me.onPremisesSamAccountName) : "";
  const username = (sam || upn.split("@")[0] || "").toLowerCase();
  const phones = Array.isArray(me.businessPhones) ? (me.businessPhones as string[]) : [];
  return {
    username,
    displayName: String(me.displayName ?? username),
    email: (me.mail as string) ?? upn ?? null,
    jobTitle: (me.jobTitle as string) ?? null,
    department: (me.department as string) ?? null,
    officeLocation: (me.officeLocation as string) ?? null,
    companyName: (me.companyName as string) ?? null,
    phone: phones[0] ?? (me.mobilePhone as string) ?? null,
  };
}

// Department strings (from Entra) that count as "IT" -> gets IT_STAFF on login sync.
// Extend this list when other sites label the IT dept differently.
const IT_DEPARTMENT_HINTS = [
  "IT",
  "INFORMATION TECHNOLOGY",
  "ICT",
  "MIS",
  "เทคโนโลยีสารสนเทศ",
  "แผนกไอที",
];

export function isItDepartment(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.trim().toUpperCase();
  return IT_DEPARTMENT_HINTS.some((h) => n === h.toUpperCase() || n.includes(h.toUpperCase()));
}

/**
 * Resolve a Site code from the directory's office/company text.
 * Directory holds names like "TUSM", "TUSMBKK" (see SITES); we match by name.
 * Returns null when nothing matches (caller falls back to a default).
 */
export function resolveSiteCode(p: DirectoryProfile): string | null {
  const candidates = [p.officeLocation, p.companyName]
    .filter(Boolean)
    .map((s) => String(s).trim().toUpperCase());

  // exact name match first (TUSMBKK before TUSM so longer wins)
  const byLen = [...SITES].sort((a, b) => b.name.length - a.name.length);
  for (const c of candidates) {
    const hit = byLen.find((s) => c === s.name || c.includes(s.name));
    if (hit) return hit.code;
  }
  return null;
}
