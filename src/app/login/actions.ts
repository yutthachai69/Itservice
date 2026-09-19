"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { authMode } from "@/lib/entra";

export async function loginAs(formData: FormData) {
  if (authMode() !== "mock") redirect("/login");
  const id = Number(formData.get("userId"));
  if (!Number.isInteger(id)) return;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.active) return;
  await setSession(user.id);
  redirect("/");
}
