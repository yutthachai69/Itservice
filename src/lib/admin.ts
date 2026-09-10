import { getCurrentUser, type SessionUser } from "./auth";

export async function getAdmin(): Promise<SessionUser | null> {
  const u = await getCurrentUser();
  return u && u.role === "ADMIN" ? u : null;
}

export { ROLES, ROLE_LABEL, type Role } from "./roles";
