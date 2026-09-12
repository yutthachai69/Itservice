// Flat, abstract inline illustrations for the home page (no external assets).

export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 240" className={className} role="img" aria-label="ระบบบริการ IT">
      {/* soft blob */}
      <ellipse cx="180" cy="140" rx="150" ry="92" fill="var(--color-brand-weak)" />

      {/* main window / dashboard */}
      <g>
        <rect x="40" y="44" width="176" height="128" rx="12" fill="#fff" stroke="var(--color-border-strong)" />
        <rect x="40" y="44" width="176" height="26" rx="12" fill="var(--color-brand)" />
        <rect x="40" y="58" width="176" height="12" fill="var(--color-brand)" />
        <circle cx="56" cy="57" r="3.5" fill="#fff" opacity=".9" />
        <circle cx="68" cy="57" r="3.5" fill="#fff" opacity=".55" />
        <rect x="56" y="86" width="70" height="10" rx="5" fill="var(--color-brand)" opacity=".22" />
        <rect x="56" y="106" width="144" height="8" rx="4" fill="#e2e8f0" />
        <rect x="56" y="122" width="120" height="8" rx="4" fill="#e2e8f0" />
        <rect x="56" y="138" width="134" height="8" rx="4" fill="#e2e8f0" />
        <rect x="96" y="160" width="64" height="9" rx="4.5" fill="var(--color-border-strong)" />
      </g>

      {/* support chat bubble */}
      <g>
        <rect x="238" y="34" width="80" height="42" rx="12" fill="#fff" stroke="var(--color-border-strong)" />
        <path d="M258 76l-8 16 20-16z" fill="#fff" stroke="var(--color-border-strong)" />
        <circle cx="262" cy="55" r="4" fill="var(--color-brand)" />
        <circle cx="278" cy="55" r="4" fill="var(--color-brand)" opacity=".55" />
        <circle cx="294" cy="55" r="4" fill="var(--color-brand)" opacity=".3" />
      </g>

      {/* resolved / check badge */}
      <g>
        <circle cx="252" cy="150" r="30" fill="var(--color-brand)" />
        <path d="M239 150l9 9 17-19" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* plant */}
      <rect x="196" y="182" width="22" height="24" rx="3" fill="var(--color-brand-strong)" />
      <path d="M207 182c-2-16-11-20-18-22 2 13 9 20 18 22z" fill="#3fae5a" />
      <path d="M207 182c2-14 10-18 17-20-2 13-9 18-17 20z" fill="#57c06e" />

      {/* floating dots */}
      <circle cx="30" cy="150" r="6" fill="var(--color-brand)" opacity=".3" />
      <circle cx="300" cy="196" r="5" fill="var(--color-brand)" opacity=".25" />
      <circle cx="128" cy="26" r="4" fill="var(--color-brand)" opacity=".35" />
    </svg>
  );
}

export function EmptyInboxArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 96"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M60 6l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--color-brand)" opacity=".8" />
      <path d="M88 18l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="var(--color-brand)" opacity=".5" />
      <path d="M31 20l1.6 3.4L36 25l-3.4 1.6L31 30l-1.6-3.4L26 25l3.4-1.6z" fill="var(--color-brand)" opacity=".45" />
      <path
        d="M20 52h26l6 10h16l6-10h26v28a8 8 0 0 1-8 8H28a8 8 0 0 1-8-8z"
        fill="#fff"
        stroke="var(--color-border-strong)"
        strokeWidth="2"
      />
      <path
        d="M28 42h64v10l-6 10H72l-6 10H54l-6-10H34l-6-10z"
        fill="var(--color-brand-weak)"
        stroke="var(--color-border-strong)"
        strokeWidth="2"
      />
    </svg>
  );
}
