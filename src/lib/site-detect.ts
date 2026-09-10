// Best-effort "which site is this request coming from?" for the login screen.
//
// IT: fill SITE_SUBNETS with each site's LAN range(s) in CIDR form. First match
// wins. Leave it empty and detection simply returns null (login art stays
// decorative). Site codes are the ones in lib/constants SITES ("01".."06").

import { siteName } from "./constants";

const SITE_SUBNETS: { cidr: string; site: string }[] = [
  // --- examples — replace with real ranges ---
  // { cidr: "10.10.0.0/16", site: "01" }, // TUSMBKK
  // { cidr: "10.20.0.0/16", site: "02" }, // TUSM
  // { cidr: "10.30.0.0/16", site: "03" }, // TKSM
  // { cidr: "10.40.0.0/16", site: "04" }, // TSE
  // { cidr: "10.50.0.0/16", site: "05" }, // TSMB
  // { cidr: "10.60.0.0/16", site: "06" }, // TTSM
];

/** "1.2.3.4" -> 32-bit int, or null if not a plain IPv4 */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    out = (out << 8) | n;
  }
  return out >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
    return false;
  }
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/** Pull the client IP out of the usual proxy headers. */
export function clientIpFromHeaders(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  const raw = (xff ? xff.split(",")[0] : h.get("x-real-ip")) ?? "";
  const ip = raw.trim().replace(/^::ffff:/i, "");
  return ip || null;
}

/** Site CODE ("01".."06") for a request, or null when unknown. */
export function siteCodeFromHeaders(h: Headers): string | null {
  const ip = clientIpFromHeaders(h);
  if (!ip) return null;
  for (const { cidr, site } of SITE_SUBNETS) {
    if (ipInCidr(ip, cidr)) return site;
  }
  return null;
}

/** Site NAME ("TUSM"…) for a request, or null. Matches the login art node ids. */
export function siteNameFromHeaders(h: Headers): string | null {
  const code = siteCodeFromHeaders(h);
  return code ? siteName(code) : null;
}
