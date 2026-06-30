interface Props {
  size?: number;
  glow?: boolean;
}

export function WCTrophy({ size = 64, glow = true }: Props) {
  const w = size;
  const h = size * 1.55;
  return (
    <svg
      viewBox="0 0 64 99"
      width={w}
      height={h}
      style={glow ? { filter: 'drop-shadow(0 0 14px rgba(234,179,8,0.55))' } : undefined}
      aria-label="Troféu da Copa do Mundo"
    >
      <defs>
        <linearGradient id="wct-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fef9c3" />
          <stop offset="30%"  stopColor="#fbbf24" />
          <stop offset="65%"  stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="wct-gold2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#fef9c3" />
          <stop offset="50%"  stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="wct-green" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"  stopColor="#166534" />
          <stop offset="100%" stopColor="#052e16" />
        </linearGradient>
        <radialGradient id="wct-globe" cx="45%" cy="35%">
          <stop offset="0%"   stopColor="#fef3c7" />
          <stop offset="60%"  stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
      </defs>

      {/* ── Malachite base ─────────────────────────────── */}
      <rect x="9"  y="88" width="46" height="9"  rx="2" fill="url(#wct-green)" />
      <rect x="13" y="85" width="38" height="5"  rx="1" fill="url(#wct-green)" opacity="0.7" />
      {/* Gold ring around base */}
      <rect x="11" y="84" width="42" height="2"  rx="1" fill="url(#wct-gold)" opacity="0.8" />
      <rect x="9"  y="87" width="46" height="1.5" rx="1" fill="url(#wct-gold)" opacity="0.5" />

      {/* ── Gold pedestal ──────────────────────────────── */}
      <path d="M21 84 L24 67 L40 67 L43 84 Z" fill="url(#wct-gold2)" />
      {/* Highlight on pedestal */}
      <path d="M28 84 L30 67 L34 67 L32 84 Z" fill="#fef3c7" opacity="0.2" />

      {/* ── Lower cup body ─────────────────────────────── */}
      <path d="M16 67 C14 62 10 56 10 50 L54 50 C54 56 50 62 48 67 Z"
        fill="url(#wct-gold)" />
      <path d="M26 67 C24 62 22 56 22 50 L42 50 C42 56 40 62 38 67 Z"
        fill="#fef3c7" opacity="0.15" />

      {/* ── Left figure / handle ───────────────────────── */}
      <path d="M10 50 C8 44 4 36 7 28 C10 22 14 26 16 32 C17 38 16 45 14 50 Z"
        fill="url(#wct-gold2)" />
      <path d="M7 28 C9 24 11 20 14 18 C15 22 14 26 12 30 Z"
        fill="url(#wct-gold)" />

      {/* ── Right figure / handle ──────────────────────── */}
      <path d="M54 50 C56 44 60 36 57 28 C54 22 50 26 48 32 C47 38 48 45 50 50 Z"
        fill="url(#wct-gold2)" />
      <path d="M57 28 C55 24 53 20 50 18 C49 22 50 26 52 30 Z"
        fill="url(#wct-gold)" />

      {/* ── Upper body / neck ──────────────────────────── */}
      <path d="M20 50 C20 44 22 36 26 30 L38 30 C42 36 44 44 44 50 Z"
        fill="url(#wct-gold)" />
      <path d="M28 50 C28 44 29 37 30 32 L34 32 C35 37 36 44 36 50 Z"
        fill="#fef3c7" opacity="0.2" />

      {/* Neck to globe connector */}
      <path d="M26 30 C27 25 28 21 32 18 C36 21 37 25 38 30 Z"
        fill="url(#wct-gold2)" />

      {/* ── Globe ─────────────────────────────────────── */}
      <circle cx="32" cy="13" r="13" fill="url(#wct-globe)" />
      {/* Globe highlight */}
      <circle cx="27" cy="9" r="4" fill="#fef9c3" opacity="0.25" />
      {/* Latitude lines */}
      <ellipse cx="32" cy="13" rx="13" ry="5"  fill="none" stroke="#92400e" strokeWidth="0.6" opacity="0.5" />
      <ellipse cx="32" cy="13" rx="13" ry="9"  fill="none" stroke="#92400e" strokeWidth="0.4" opacity="0.35" />
      {/* Longitude lines */}
      <ellipse cx="32" cy="13" rx="6"  ry="13" fill="none" stroke="#92400e" strokeWidth="0.5" opacity="0.4" />
      <line x1="32" y1="0" x2="32" y2="26" stroke="#92400e" strokeWidth="0.5" opacity="0.4" />
      {/* Globe rim */}
      <circle cx="32" cy="13" r="13" fill="none" stroke="#78350f" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}
