"use client";

// Login illustration — the six TSM Group sites as a connected network.
// Edges bow, draw themselves on in sequence, and carry a two-way traffic of
// "requests" (site -> hub) and "replies" (hub -> site). The hub breathes and
// sends a periodic heartbeat ripple; the whole constellation sways gently and
// leans a little toward the pointer. Highlights the viewer's own site when we
// can tell which one it is.

import { useEffect, useState } from "react";

type Site = { code: string; x: number; y: number; hq?: boolean };

const HUB: Site = { code: "TUSM", x: 48, y: 50, hq: true };

const SITES: Site[] = [
  { code: "TUSMBKK", x: 16, y: 20 },
  { code: "TKSM", x: 76, y: 15 },
  { code: "TSE", x: 86, y: 52 },
  { code: "TSMB", x: 52, y: 84 },
  { code: "TTSM", x: 13, y: 66 },
];

const NODES = [HUB, ...SITES];
const KNOWN = new Set(NODES.map((n) => n.code));

// spokes (site -> hub, so an inbound mote travels param 0 -> 1) + two ring links
const SPOKES: [Site, Site][] = SITES.map((s) => [s, HUB]);
const RINGS: [Site, Site][] = [
  [SITES[0], SITES[1]],
  [SITES[3], SITES[4]],
];

const REPLY = "#7aa5e8"; // soft brand-blue for outbound "IT replies"
const STORE_KEY = "tsm.lastSite";

/** gentle quadratic arc between two points, bowed the same way for every edge */
function arc(a: Site, b: Site): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = len * 0.14;
  const cx = mx + (-dy / len) * bow;
  const cy = my + (dx / len) * bow;
  return `M ${a.x} ${a.y} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${b.x} ${b.y}`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function AppPreview({ detectedSite = null }: { detectedSite?: string | null }) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState<string | null>(
    detectedSite && KNOWN.has(detectedSite) ? detectedSite : null,
  );

  useEffect(() => {
    // one-time read of the remembered site; server-detected site always wins
    if (active) return;
    try {
      const remembered = window.localStorage.getItem(STORE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (remembered && KNOWN.has(remembered)) setActive(remembered);
    } catch {
      /* storage blocked — stay decorative */
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const EDGES = [...SPOKES, ...RINGS];
  const EDGE_D = EDGES.map(([a, b]) => arc(a, b));

  return (
    <div className="w-full max-w-[400px]">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
        {active ? (
          <>เชื่อมต่อจากเครือข่าย <span className="text-brand">{active}</span></>
        ) : (
          "ดูแล IT ทั้งเครือ TSM จากที่เดียว"
        )}
      </p>

      <div className="relative aspect-square w-full" aria-hidden="true">
        <div className="lp-sway absolute inset-0">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-brand" aria-hidden="true">
            <defs>
              <radialGradient id="lp-glow">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.45} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </radialGradient>
              {EDGE_D.map((d, i) => (
                <path key={i} id={`lp-e${i}`} d={d} fill="none" />
              ))}
            </defs>

            {/* hub breathing glow */}
            <circle className="lp-hub-glow" cx={HUB.x} cy={HUB.y} r={18} fill="url(#lp-glow)" />

            {/* periodic heartbeat ripple from the hub */}
            {!reduced && (
              <circle
                className="lp-heartbeat"
                cx={HUB.x}
                cy={HUB.y}
                r={3}
                fill="none"
                stroke="currentColor"
                strokeWidth={0.6}
              />
            )}

            {/* visible edges — bow + draw-on, staggered */}
            {EDGES.map(([a, b], i) => {
              const lit = active === a.code || active === b.code;
              return (
                <path
                  key={i}
                  d={EDGE_D[i]}
                  pathLength={1}
                  className="lp-edge"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={lit ? 0.7 : 0.26}
                  strokeWidth={lit ? 1.1 : 0.7}
                  strokeLinecap="round"
                  style={{ "--ed": `${0.15 + i * 0.11}s` } as React.CSSProperties}
                />
              );
            })}

            {/* inbound "requests": site -> hub */}
            {!reduced &&
              SPOKES.map((_, i) => (
                <circle key={`in${i}`} r={0.9} fill="currentColor" opacity={0}>
                  <animateMotion dur="2.8s" begin={`${1.0 + i * 0.55}s`} repeatCount="indefinite">
                    <mpath href={`#lp-e${i}`} />
                  </animateMotion>
                  <animate
                    attributeName="opacity"
                    dur="2.8s"
                    begin={`${1.0 + i * 0.55}s`}
                    repeatCount="indefinite"
                    values="0;0.9;0.9;0"
                    keyTimes="0;0.15;0.8;1"
                  />
                </circle>
              ))}

            {/* outbound "replies": hub -> site, occasional */}
            {!reduced &&
              SPOKES.map((_, i) => (
                <circle key={`out${i}`} r={0.85} fill={REPLY} opacity={0}>
                  <animateMotion
                    dur="3.4s"
                    begin={`${4.2 + i * 1.9}s`}
                    repeatCount="indefinite"
                    keyPoints="1;0"
                    keyTimes="0;1"
                    calcMode="linear"
                  >
                    <mpath href={`#lp-e${i}`} />
                  </animateMotion>
                  <animate
                    attributeName="opacity"
                    dur="3.4s"
                    begin={`${4.2 + i * 1.9}s`}
                    repeatCount="indefinite"
                    values="0;0.95;0.95;0"
                    keyTimes="0;0.15;0.8;1"
                  />
                </circle>
              ))}
          </svg>

          {NODES.map((s, i) => {
            const isActive = active === s.code;
            const big = s.hq || isActive;
            return (
              <div
                key={s.code}
                className="lp-site lp-site-in absolute flex flex-col items-center"
                style={{ left: `${s.x}%`, top: `${s.y}%`, "--pd": `${0.5 + i * 0.13}s` } as React.CSSProperties}
              >
                <span
                  className={`relative flex ${s.hq ? "" : "lp-bob"}`}
                  style={{ "--bd": `${i * 0.7}s` } as React.CSSProperties}
                >
                  <span
                    className={
                      big
                        ? "h-4 w-4 rounded-full bg-brand ring-4 ring-brand/15"
                        : "h-2.5 w-2.5 rounded-full border-2 border-brand bg-card"
                    }
                  />
                  <span
                    className={`lp-site-pulse absolute inset-0 rounded-full ring-2 ring-brand ${
                      isActive ? "lp-site-pulse--fast" : ""
                    }`}
                    style={{ "--pd": `${0.6 + i * 0.24}s` } as React.CSSProperties}
                  />
                </span>
                <span
                  className={`mt-2 rounded bg-background/85 px-1.5 py-px font-mono tracking-tight ${
                    big
                      ? "text-xs font-semibold text-slate-900"
                      : "text-[11px] font-medium text-slate-700"
                  }`}
                >
                  {s.code}
                  {isActive && !s.hq && (
                    <span className="ml-1 rounded bg-brand/10 px-1 py-0.5 text-[9px] font-medium text-brand">
                      คุณ
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
