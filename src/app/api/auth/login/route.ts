import { NextRequest, NextResponse } from "next/server";
import { provisionFromGraph, setSession } from "@/lib/auth";
import { authMode, buildAuthorizeUrl, makePkce, mockGraphMe, randomString } from "@/lib/entra";

const TEMP_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600, // 10 min
};

export async function GET(req: NextRequest) {
  if (authMode() === "mock") {
    const uid = await provisionFromGraph(mockGraphMe());
    await setSession(uid);
    return NextResponse.redirect(new URL("/", req.url));
  }

  const { verifier, challenge } = await makePkce();
  const state = randomString(16);
  const nonce = randomString(16);

  const res = NextResponse.redirect(buildAuthorizeUrl({ state, nonce, challenge }));
  res.cookies.set("oidc_verifier", verifier, TEMP_COOKIE_OPTS);
  res.cookies.set("oidc_state", state, TEMP_COOKIE_OPTS);
  res.cookies.set("oidc_nonce", nonce, TEMP_COOKIE_OPTS);
  return res;
}
