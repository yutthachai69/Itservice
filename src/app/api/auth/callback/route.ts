import { NextRequest, NextResponse } from "next/server";
import { provisionFromGraph, sessionCookieValue } from "@/lib/auth";
import { exchangeCode, fetchGraphMe } from "@/lib/entra";

const CLEAR = { path: "/", maxAge: 0 };

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const err = url.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(new URL(`/login?e=${encodeURIComponent(err)}`, req.url));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = req.cookies;
  const savedState = jar.get("oidc_state")?.value;
  const verifier = jar.get("oidc_verifier")?.value;

  if (!code || !state || !verifier || state !== savedState) {
    return NextResponse.redirect(new URL("/login?e=bad_state", req.url));
  }

  try {
    const tokens = await exchangeCode({ code, verifier });
    const me = await fetchGraphMe(tokens.access_token);
    const uid = await provisionFromGraph(me);

    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set("uid", sessionCookieValue(uid), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    res.cookies.set("oidc_state", "", CLEAR);
    res.cookies.set("oidc_verifier", "", CLEAR);
    res.cookies.set("oidc_nonce", "", CLEAR);
    return res;
  } catch (e) {
    console.error("[auth callback]", e);
    return NextResponse.redirect(new URL("/login?e=exchange_failed", req.url));
  }
}
