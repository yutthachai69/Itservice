import { NextRequest, NextResponse } from "next/server";
import { authMode, logoutUrl } from "@/lib/entra";

function doLogout(req: NextRequest) {
  const loginUrl = new URL("/login", req.url).toString();
  const dest = authMode() === "entra" ? logoutUrl(loginUrl) : loginUrl;
  const res = NextResponse.redirect(dest);
  res.cookies.set("uid", "", { path: "/", maxAge: 0 });
  return res;
}

export const GET = doLogout;
export const POST = doLogout;
