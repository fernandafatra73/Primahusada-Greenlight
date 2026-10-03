// Decorative, animated landscape shown beside the login form. Purely visual,
// so it is hidden from assistive tech and pauses under reduced-motion.
export function LoginScene() {
  return (
    <div className="login-scene" aria-hidden>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="login-scene__svg">
        <defs>
          <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e5fae" />
            <stop offset="55%" stopColor="#5b9bdc" />
            <stop offset="100%" stopColor="#bfdcf5" />
          </linearGradient>
          <linearGradient id="ls-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3fbf8a" />
            <stop offset="100%" stopColor="#0f7a55" />
          </linearGradient>
          <pattern id="ls-ripple" width="60" height="14" patternUnits="userSpaceOnUse">
            <path d="M0 7 Q15 2 30 7 T60 7" fill="none" stroke="#c9f5df" strokeWidth="1.4" opacity="0.7" />
          </pattern>
          <pattern id="ls-sleepers" width="14" height="8" patternUnits="userSpaceOnUse">
            <rect x="2" y="0" width="6" height="8" fill="#6b4a2f" />
          </pattern>
        </defs>

        <rect width="400" height="300" fill="url(#ls-sky)" />
        <circle cx="330" cy="58" r="22" fill="#fff6c9" opacity="0.9" />

        <g className="login-scene__clouds" fill="#ffffff" opacity="0.75">
          <ellipse cx="70" cy="50" rx="30" ry="10" />
          <ellipse cx="90" cy="44" rx="20" ry="9" />
          <ellipse cx="230" cy="70" rx="26" ry="8" />
        </g>

        <path d="M0 170 Q70 120 140 160 T280 150 T400 160 V300 H0 Z" fill="#3f8f5a" />
        <path d="M0 185 Q90 160 180 182 T400 178 V300 H0 Z" fill="#4fa868" />

        <g className="login-scene__trees">
          <Tree x={30} y={180} scale={1.1} />
          <Tree x={95} y={172} scale={0.85} />
          <Tree x={300} y={170} scale={1} />
          <Tree x={360} y={178} scale={1.2} />
        </g>

        <rect x="0" y="206" width="400" height="8" fill="url(#ls-sleepers)" />
        <rect x="0" y="206" width="400" height="2" fill="#8a96a3" />
        <rect x="0" y="212" width="400" height="2" fill="#8a96a3" />

        <g className="login-scene__train">
          <g className="login-scene__smoke" fill="#eef3f8">
            <circle cx="46" cy="160" r="6" />
            <circle cx="46" cy="160" r="6" />
            <circle cx="46" cy="160" r="6" />
          </g>
          <rect x="-58" y="180" width="48" height="22" rx="3" fill="#2b6cb0" />
          <rect x="-52" y="185" width="10" height="8" fill="#dbeafe" />
          <rect x="-36" y="185" width="10" height="8" fill="#dbeafe" />
          <rect x="-6" y="184" width="4" height="10" fill="#334155" />
          <rect x="0" y="176" width="58" height="26" rx="4" fill="#1d4f91" />
          <rect x="6" y="168" width="22" height="16" rx="2" fill="#163e73" />
          <rect x="10" y="171" width="12" height="8" fill="#dbeafe" />
          <rect x="40" y="164" width="9" height="14" fill="#334155" />
          <path d="M58 190 L68 202 H58 Z" fill="#f59e0b" />
          <Wheel cx={-46} />
          <Wheel cx={-22} />
          <Wheel cx={12} />
          <Wheel cx={42} />
        </g>

        <rect x="0" y="236" width="400" height="64" fill="url(#ls-water)" />
        <rect className="login-scene__ripple" x="-60" y="242" width="520" height="56" fill="url(#ls-ripple)" />
      </svg>
    </div>
  );
}

interface TreeProps {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

function Tree({ x, y, scale }: TreeProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-3" y="-4" width="6" height="18" fill="#6b4a2f" />
      <circle cx="0" cy="-16" r="14" fill="#2f7d45" />
      <circle cx="-9" cy="-8" r="9" fill="#38914f" />
      <circle cx="9" cy="-8" r="9" fill="#2a6f3e" />
    </g>
  );
}

function Wheel({ cx }: { readonly cx: number }) {
  return (
    <g transform={`translate(${cx} 200)`}>
      <circle r="6" fill="#1f2937" />
      <g className="login-scene__wheel">
        <circle r="3.5" fill="none" stroke="#9ca3af" strokeWidth="1" />
        <line x1="-4" y1="0" x2="4" y2="0" stroke="#9ca3af" strokeWidth="1" />
      </g>
    </g>
  );
}
