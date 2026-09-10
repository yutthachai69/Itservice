// Microsoft Entra ID (Azure AD) OIDC — hand-rolled (authorization code + PKCE).
// AUTH_MODE=mock short-circuits everything with a canned Graph profile.

const TENANT = process.env.ENTRA_TENANT_ID ?? "";
const CLIENT_ID = process.env.ENTRA_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.ENTRA_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback";
const SCOPE = "openid profile email offline_access User.Read";

const GRAPH_SELECT =
  "displayName,mail,userPrincipalName,jobTitle,department,officeLocation,companyName,businessPhones,mobilePhone,onPremisesSamAccountName";

export function authMode(): "mock" | "entra" {
  return process.env.AUTH_MODE === "entra" ? "entra" : "mock";
}

function authBase() {
  return `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0`;
}

// ---- PKCE + random -------------------------------------------------------

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomString(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function makePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomString(32);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: b64url(digest) };
}

// ---- authorize / token ------------------------------------------------

export function buildAuthorizeUrl(opts: {
  state: string;
  nonce: string;
  challenge: string;
}): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    response_mode: "query",
    scope: SCOPE,
    state: opts.state,
    nonce: opts.nonce,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
  });
  return `${authBase()}/authorize?${p.toString()}`;
}

export async function exchangeCode(opts: {
  code: string;
  verifier: string;
}): Promise<{ access_token: string; id_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: REDIRECT_URI,
    code_verifier: opts.verifier,
    scope: SCOPE,
  });
  // confidential client: include secret when configured (web app registration)
  if (CLIENT_SECRET) body.set("client_secret", CLIENT_SECRET);

  const res = await fetch(`${authBase()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export function logoutUrl(postLogoutRedirect: string): string {
  const p = new URLSearchParams({ post_logout_redirect_uri: postLogoutRedirect });
  return `${authBase()}/logout?${p.toString()}`;
}

// ---- Graph ----------------------------------------------------------------

export async function fetchGraphMe(accessToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://graph.microsoft.com/v1.0/me?$select=${GRAPH_SELECT}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`graph /me failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** canned profile for AUTH_MODE=mock — shaped like a Graph /me response */
export function mockGraphMe(): Record<string, unknown> {
  const upn = process.env.MOCK_UPN ?? "Yutthachai@tusm.thaisugarmill.local";
  return {
    displayName: "Yutthachai Khammeephak",
    userPrincipalName: upn,
    mail: upn,
    jobTitle: "Application Support",
    department: "IT",
    officeLocation: "TUSM",
    companyName: "TUSM",
    businessPhones: ["250"],
    mobilePhone: null,
    onPremisesSamAccountName: upn.split("@")[0],
  };
}
