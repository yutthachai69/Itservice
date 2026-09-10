import { cookies } from "next/headers";
import { prisma } from "./db";
import {
  profileFromGraph,
  resolveSiteCode,
  isItDepartment,
  type DirectoryProfile,
} from "./directory";

const COOKIE = "uid";
const DEFAULT_SITE = "02"; // TUSM — fallback when directory office/company doesn't map

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  position: string | null;
  phone: string | null;
  siteCode: string | null;
  departmentId: number | null;
  departmentName: string | null;
  role: string;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  const id = raw ? Number(raw) : NaN;
  if (!Number.isInteger(id)) return null;

  const u = await prisma.user.findUnique({
    where: { id },
    include: { department: true },
  });
  if (!u || !u.active) return null;

  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    position: u.position,
    phone: u.phone,
    siteCode: u.siteCode,
    departmentId: u.departmentId,
    departmentName: u.department?.name ?? null,
    role: u.role,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

export async function setSession(userId: number) {
  const jar = await cookies();
  jar.set(COOKIE, String(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// ---------------------------------------------------------------------------
// JIT provisioning from the directory (Entra/Graph). Runs on every login so the
// local User row stays in sync with M365. Role is NOT touched on update — that
// is admin-managed here.
// ---------------------------------------------------------------------------

export async function provisionFromGraph(me: Record<string, unknown>): Promise<number> {
  return provisionFromDirectory(profileFromGraph(me));
}

export async function provisionFromDirectory(p: DirectoryProfile): Promise<number> {
  if (!p.username) throw new Error("directory profile has no username");

  const siteCode = resolveSiteCode(p) ?? DEFAULT_SITE;

  let departmentId: number | null = null;
  if (p.department) {
    const dep = await prisma.department.upsert({
      where: { siteCode_name: { siteCode, name: p.department } },
      create: { siteCode, name: p.department },
      update: {},
    });
    departmentId = dep.id;
  }

  const common = {
    displayName: p.displayName,
    email: p.email,
    position: p.jobTitle,
    phone: p.phone,
    siteCode,
    departmentId,
  };

  // role derived from the directory department (live on every login)
  const derivedRole = isItDepartment(p.department) ? "IT_STAFF" : "USER";

  const existing = await prisma.user.findUnique({ where: { username: p.username } });

  if (!existing) {
    const created = await prisma.user.create({
      data: { username: p.username, ...common, role: derivedRole },
    });
    return created.id;
  }

  // roleLocked = admin pinned it (IT_LEAD / ADMIN / non-IT helper) -> don't override
  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: existing.roleLocked ? common : { ...common, role: derivedRole },
  });
  return updated.id;
}
