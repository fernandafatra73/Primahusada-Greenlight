// Decorative, animated landscape shown beside the login form. Purely visual,
// so it is hidden from assistive tech and pauses under reduced-motion.
// Depth comes from shading: gradients for volume, haze on distant layers and
// blur on smoke/clouds, rather than from bitmap images.
export function LoginScene() {
  return (
    <div className="login-scene" aria-hidden>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="login-scene__svg">
        <defs>
          <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e3f86" />
            <stop offset="45%" stopColor="#3f86d0" />
            <stop offset="80%" stopColor="#a9d2f2" />
            <stop offset="100%" stopColor="#f3ead2" />
          </linearGradient>
          <radialGradient id="ls-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fffbe8" />
            <stop offset="35%" stopColor="#fff2b8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff2b8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ls-mountain-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7d9cc4" />
            <stop offset="100%" stopColor="#b9cfe6" />
          </linearGradient>
          <linearGradient id="ls-mountain-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f7a8f" />
            <stop offset="100%" stopColor="#8fb3b5" />
          </linearGradient>
          <linearGradient id="ls-hill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5e9e4f" />
            <stop offset="100%" stopColor="#2f6b32" />
          </linearGradient>
          <linearGradient id="ls-meadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#79b65a" />
            <stop offset="100%" stopColor="#3f7d36" />
          </linearGradient>
          <radialGradient id="ls-leaf" cx="0.35" cy="0.3" r="0.75">
            <stop offset="0%" stopColor="#7cc36a" />
            <stop offset="55%" stopColor="#3b8a3f" />
            <stop offset="100%" stopColor="#1d4f25" />
          </radialGradient>
          <linearGradient id="ls-pine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2d6b3a" />
            <stop offset="100%" stopColor="#143d22" />
          </linearGradient>
          <linearGradient id="ls-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7a5333" />
            <stop offset="100%" stopColor="#3f2a19" />
          </linearGradient>
          <linearGradient id="ls-ballast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9a958c" />
            <stop offset="100%" stopColor="#5f5a52" />
          </linearGradient>
          <linearGradient id="ls-rail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6ebef" />
            <stop offset="40%" stopColor="#8d979f" />
            <stop offset="100%" stopColor="#4a5158" />
          </linearGradient>
          <linearGradient id="ls-boiler" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3c4a57" />
            <stop offset="30%" stopColor="#7f8e9b" />
            <stop offset="55%" stopColor="#2a333c" />
            <stop offset="100%" stopColor="#11161b" />
          </linearGradient>
          <linearGradient id="ls-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f6fbf" />
            <stop offset="50%" stopColor="#1d4f91" />
            <stop offset="100%" stopColor="#123563" />
          </linearGradient>
          <linearGradient id="ls-window" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f6fbff" />
            <stop offset="100%" stopColor="#9cc3e6" />
          </linearGradient>
          <radialGradient id="ls-wheel" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#c0392b" />
            <stop offset="70%" stopColor="#8e2318" />
            <stop offset="100%" stopColor="#2b0d09" />
          </radialGradient>
          <radialGradient id="ls-smoke" cx="0.4" cy="0.35" r="0.6">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#d9dee4" />
            <stop offset="100%" stopColor="#a8b0ba" />
          </radialGradient>
          <linearGradient id="ls-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5cc4a0" />
            <stop offset="35%" stopColor="#2b977a" />
            <stop offset="100%" stopColor="#0b4f3c" />
          </linearGradient>
          <pattern id="ls-ripple" width="60" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 6 Q15 3 30 6 T60 6" fill="none" stroke="#d8fff0" strokeWidth="0.9" opacity="0.55" />
          </pattern>
          <pattern id="ls-ripple-fine" width="34" height="7" patternUnits="userSpaceOnUse">
            <path d="M0 4 Q8.5 2 17 4 T34 4" fill="none" stroke="#a7f0d3" strokeWidth="0.6" opacity="0.45" />
          </pattern>
          <linearGradient id="ls-fish" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b5541a" />
            <stop offset="45%" stopColor="#f39c34" />
            <stop offset="100%" stopColor="#fde7b8" />
          </linearGradient>
          <clipPath id="ls-above-water" clipPathUnits="userSpaceOnUse">
            <rect x="0" y="0" width="400" height="238" />
          </clipPath>
          <filter id="ls-blur-soft" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id="ls-blur-smoke" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          <filter id="ls-shadow" x="-10%" y="-10%" width="120%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.4" floodColor="#0b1d12" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Sky and light */}
        <rect width="400" height="300" fill="url(#ls-sky)" />
        <circle cx="318" cy="70" r="48" fill="url(#ls-sun)" />
        <circle cx="318" cy="70" r="13" fill="#fffdf2" />

        <g className="login-scene__clouds" filter="url(#ls-blur-soft)">
          <ellipse cx="80" cy="56" rx="38" ry="9" fill="#ffffff" opacity="0.85" />
          <ellipse cx="102" cy="50" rx="22" ry="9" fill="#ffffff" opacity="0.9" />
          <ellipse cx="220" cy="84" rx="34" ry="6" fill="#f2f7fc" opacity="0.75" />
          <ellipse cx="160" cy="36" rx="26" ry="5" fill="#eaf3fb" opacity="0.6" />
        </g>

        {/* Distant layers fade into haze for atmospheric depth */}
        <path
          d="M0 150 L40 112 L70 128 L110 92 L150 130 L190 104 L230 134 L270 98 L310 126 L350 108 L400 140 V180 H0 Z"
          fill="url(#ls-mountain-far)"
        />
        <path d="M110 92 L100 102 L108 100 L114 104 L120 98 Z M270 98 L262 106 L270 104 L276 107 L281 104 Z" fill="#eef4fb" opacity="0.85" />
        <path
          d="M0 162 L50 132 L95 150 L140 124 L185 152 L240 128 L290 150 L340 130 L400 155 V190 H0 Z"
          fill="url(#ls-mountain-near)"
        />
        <rect x="0" y="140" width="400" height="40" fill="#cfe2f2" opacity="0.25" />

        <path d="M0 176 Q60 150 130 168 T260 162 T400 170 V230 H0 Z" fill="url(#ls-hill)" />

        {/* Treeline on the hill */}
        <g fill="#24562c" opacity="0.9">
          {TREELINE.map((t) => (
            <ellipse key={t.x} cx={t.x} cy={t.y} rx={t.r} ry={t.r * 1.2} />
          ))}
        </g>

        <path d="M0 192 Q100 178 200 188 T400 186 V240 H0 Z" fill="url(#ls-meadow)" />

        <g filter="url(#ls-shadow)">
          <LeafyTree x={30} y={198} scale={1.05} />
          <Pine x={52} y={196} scale={1.25} />
          <LeafyTree x={78} y={199} scale={1.15} />
          <LeafyTree x={112} y={197} scale={0.85} />
          <Pine x={136} y={195} scale={0.95} />
          <LeafyTree x={258} y={196} scale={0.9} />
          <LeafyTree x={292} y={197} scale={1.25} />
          <Pine x={322} y={198} scale={1.35} />
          <LeafyTree x={350} y={200} scale={1.1} />
          <LeafyTree x={378} y={198} scale={0.95} />
        </g>

        {/* Shrubs along the embankment */}
        <g>
          {SHRUBS.map((s) => (
            <g key={s.x} transform={`translate(${s.x} 209)`}>
              <circle cx="-5" cy="-3" r="5" fill="url(#ls-leaf)" />
              <circle cx="4" cy="-4" r="6" fill="url(#ls-leaf)" />
              <circle cx="0" cy="-8" r="5" fill="url(#ls-leaf)" />
            </g>
          ))}
        </g>

        {/* Embankment, sleepers and steel rails */}
        <path d="M0 210 H400 V224 Q300 228 200 226 T0 226 Z" fill="url(#ls-ballast)" />
        <g fill="#4b3324">
          {SLEEPERS.map((x) => (
            <rect key={x} x={x} y="211" width="7" height="4" rx="0.6" />
          ))}
        </g>
        <rect x="0" y="210" width="400" height="2.4" fill="url(#ls-rail)" />
        <rect x="0" y="214" width="400" height="2" fill="url(#ls-rail)" opacity="0.9" />

        <g className="login-scene__train">
          <g transform="translate(0 41) scale(0.8)">
            <g className="login-scene__smoke" filter="url(#ls-blur-smoke)">
              <circle cx="71" cy="144" r="7" fill="url(#ls-smoke)" />
              <circle cx="71" cy="144" r="7" fill="url(#ls-smoke)" />
              <circle cx="71" cy="144" r="7" fill="url(#ls-smoke)" />
              <circle cx="71" cy="144" r="7" fill="url(#ls-smoke)" />
              <circle cx="71" cy="144" r="7" fill="url(#ls-smoke)" />
            </g>

            {CARRIAGES.map((x) => (
              <Carriage key={x} x={x} />
            ))}

            <g filter="url(#ls-shadow)">
              {/* Tender */}
              <rect x="-40" y="178" width="38" height="26" rx="2" fill="#1b232b" />
              <rect x="-40" y="176" width="38" height="4" fill="#2c3a46" />
              <path d="M-38 178 Q-21 168 -4 178 Z" fill="#0d0f12" />

              {/* Cab */}
              <rect x="0" y="160" width="28" height="44" rx="2" fill="url(#ls-body)" />
              <rect x="-3" y="155" width="34" height="6" rx="2" fill="#26313b" />
              <rect x="6" y="166" width="14" height="13" rx="1.5" fill="url(#ls-window)" />

              {/* Boiler, dome, chimney, smokebox */}
              <rect x="27" y="172" width="54" height="26" rx="12" fill="url(#ls-boiler)" />
              <rect x="36" y="172" width="2" height="26" fill="#c9a227" opacity="0.8" />
              <rect x="58" y="172" width="2" height="26" fill="#c9a227" opacity="0.8" />
              <path d="M46 173 Q46 162 54 162 Q62 162 62 173 Z" fill="#c9a227" />
              <path d="M66 172 L67 156 L64 151 H78 L75 156 L76 172 Z" fill="#1a1f24" />
              <rect x="77" y="168" width="11" height="32" rx="3" fill="#15191d" />
              <circle cx="87" cy="166" r="8" fill="url(#ls-sun)" opacity="0.8" />
              <circle cx="86" cy="166" r="3.4" fill="#fff5c4" stroke="#3a3f44" strokeWidth="1" />

              <rect x="0" y="198" width="92" height="4" fill="#9b2a1d" />
              <path d="M88 202 L100 214 H86 Z" fill="#7a2017" />
            </g>

            <Wheel cx={-32} cy={208} r={6} />
            <Wheel cx={-12} cy={208} r={6} />
            <Wheel cx={14} cy={208} r={6} />
            <Wheel cx={38} cy={204} r={10} />
            <Wheel cx={62} cy={204} r={10} />
            <Wheel cx={82} cy={208} r={6} />
            <rect x="36" y="203" width="28" height="2.6" rx="1.3" fill="#c9ced3" />
          </g>
        </g>

        {/* River bank and flowing water */}
        <path d="M0 226 Q100 232 200 228 T400 230 V240 H0 Z" fill="#3f7d36" />
        <rect x="0" y="236" width="400" height="64" fill="url(#ls-water)" />
        <g opacity="0.28" filter="url(#ls-blur-soft)">
          <ellipse cx="84" cy="246" rx="22" ry="6" fill="#1d4f25" />
          <ellipse cx="300" cy="246" rx="26" ry="6" fill="#1d4f25" />
          <rect x="0" y="238" width="400" height="5" fill="#e9fbf3" />
        </g>
        <rect className="login-scene__ripple" x="-60" y="240" width="520" height="60" fill="url(#ls-ripple)" />
        <rect
          className="login-scene__ripple login-scene__ripple--fine"
          x="-34"
          y="243"
          width="500"
          height="57"
          fill="url(#ls-ripple-fine)"
        />
        <path
          d="M0 237 q4 -7 6 0 q3 -9 6 0 q4 -6 6 0 M60 237 q3 -8 6 0 q4 -6 6 0 M140 237 q4 -7 6 0 q3 -9 6 0 M230 237 q3 -8 6 0 q4 -7 6 0 M320 237 q4 -9 6 0 q3 -6 6 0 M380 237 q3 -7 6 0"
          fill="none"
          stroke="#2f6b32"
          strokeWidth="1.2"
        />

        {/* Leaping fish, clipped at the waterline so it rises out of the river */}
        <g clipPath="url(#ls-above-water)">
          <g transform="translate(160 250) scale(1.4)">
            <g className="login-scene__fish">
              <Fish />
            </g>
          </g>
        </g>
        {/* Where the scaled leap arc crosses the waterline on the way up and down */}
        <Splash x={174} />
        <Splash x={269} late />
      </svg>
    </div>
  );
}

// Rough ridge of the hill path, used to seat the treeline on its crest.
const HILL_RIDGE: ReadonlyArray<readonly [number, number]> = [
  [0, 176],
  [60, 163],
  [130, 168],
  [200, 170],
  [260, 162],
  [330, 160],
  [400, 170],
];

function hillY(x: number): number {
  for (let i = 1; i < HILL_RIDGE.length; i += 1) {
    const [x1, y1] = HILL_RIDGE[i] ?? [400, 170];
    const [x0, y0] = HILL_RIDGE[i - 1] ?? [0, 176];
    if (x <= x1) {
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return 170;
}

// Deterministic jitter so the forest looks natural but renders identically every time.
const TREELINE: ReadonlyArray<{ readonly x: number; readonly y: number; readonly r: number }> = Array.from(
  { length: 58 },
  (_, i) => {
    const x = i * 7;
    const r = 4.5 + ((i * 37) % 5) * 0.6;
    return { x, y: hillY(x) - 1 - ((i * 13) % 4), r };
  },
);

const SHRUBS: ReadonlyArray<{ readonly x: number }> = [
  { x: 20 },
  { x: 96 },
  { x: 160 },
  { x: 214 },
  { x: 276 },
  { x: 340 },
  { x: 392 },
];

const SLEEPERS: ReadonlyArray<number> = Array.from({ length: 34 }, (_, i) => i * 12);

// Left edge of each passenger carriage, in train-local units behind the tender.
const CARRIAGES: ReadonlyArray<number> = [-142, -244, -346];

function Carriage({ x }: { readonly x: number }) {
  return (
    <g>
      <g filter="url(#ls-shadow)">
        <rect x={x} y="166" width="96" height="38" rx="3" fill="url(#ls-body)" />
        <path d={`M${x - 3} 168 Q${x + 48} 154 ${x + 99} 168 Z`} fill="#26313b" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={x + 6 + i * 15} y="172" width="10" height="9" rx="1.5" fill="url(#ls-window)" />
        ))}
        <rect x={x} y="184" width="96" height="1.6" fill="#f1c40f" opacity="0.9" />
        <text
          x={x + 48}
          y="196"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="8.4"
          fontWeight="700"
          fill="#ffffff"
          stroke="#0b2a55"
          strokeWidth="0.3"
        >
          Klinik Prima Husada
        </text>
        <rect x={x} y="200" width="96" height="1.4" fill="#f1c40f" opacity="0.9" />
        <rect x={x + 96} y="196" width="6" height="3" fill="#30363c" />
      </g>
      <Wheel cx={x + 12} cy={208} r={6} />
      <Wheel cx={x + 26} cy={208} r={6} />
      <Wheel cx={x + 70} cy={208} r={6} />
      <Wheel cx={x + 84} cy={208} r={6} />
    </g>
  );
}

function Fish() {
  return (
    <g>
      <path d="M-20 0 L-32 -11 Q-29 0 -32 11 Z" fill="#e0782a" stroke="#8a3a10" strokeWidth="0.6" />
      <path d="M-6 -9 Q2 -20 10 -9 Z" fill="#e0782a" />
      <path
        d="M22 0 Q16 -11 0 -11 Q-14 -11 -21 0 Q-14 11 0 11 Q16 11 22 0 Z"
        fill="url(#ls-fish)"
        stroke="#8a3a10"
        strokeWidth="0.6"
      />
      <path d="M-12 -4 Q0 -7 12 -3" fill="none" stroke="#fff3d6" strokeWidth="0.8" opacity="0.7" />
      <path d="M-2 4 L-8 11 L2 7 Z" fill="#e0782a" />
      <path d="M10 -9 Q8 0 10 9" fill="none" stroke="#8a3a10" strokeWidth="0.7" opacity="0.6" />
      <circle cx="15" cy="-3" r="2.2" fill="#ffffff" />
      <circle cx="15.5" cy="-3" r="1.2" fill="#111" />
    </g>
  );
}

function Splash({ x, late = false }: { readonly x: number; readonly late?: boolean }) {
  return (
    <g transform={`translate(${x} 239)`}>
      <g className={late ? 'login-scene__splash login-scene__splash--late' : 'login-scene__splash'}>
        <ellipse rx="12" ry="3" fill="none" stroke="#f2fffa" strokeWidth="1.2" />
        <circle cx="-7" cy="-7" r="1.4" fill="#f2fffa" />
        <circle cx="0" cy="-10" r="1.6" fill="#f2fffa" />
        <circle cx="7" cy="-6" r="1.3" fill="#f2fffa" />
      </g>
    </g>
  );
}

interface TreeProps {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

function LeafyTree({ x, y, scale }: TreeProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-3 0 L-2.2 -22 Q0 -24 2.2 -22 L3 0 Z" fill="url(#ls-trunk)" />
      <path d="M0 -14 L-9 -22 M0 -17 L8 -25" stroke="#4a3220" strokeWidth="1.6" />
      {/* Back canopy is darker so the front clusters read as nearer foliage */}
      <g fill="#1d4f25">
        <circle cx="-15" cy="-26" r="10" />
        <circle cx="15" cy="-27" r="10" />
        <circle cx="0" cy="-46" r="12" />
      </g>
      <circle cx="-13" cy="-20" r="9" fill="url(#ls-leaf)" />
      <circle cx="12" cy="-21" r="9.5" fill="url(#ls-leaf)" />
      <circle cx="0" cy="-22" r="9" fill="url(#ls-leaf)" />
      <circle cx="-10" cy="-33" r="11" fill="url(#ls-leaf)" />
      <circle cx="10" cy="-34" r="11" fill="url(#ls-leaf)" />
      <circle cx="0" cy="-40" r="12" fill="url(#ls-leaf)" />
      <circle cx="-4" cy="-48" r="8" fill="url(#ls-leaf)" />
      <circle cx="6" cy="-28" r="7" fill="url(#ls-leaf)" opacity="0.85" />
    </g>
  );
}

function Pine({ x, y, scale }: TreeProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-1.8" y="-6" width="3.6" height="6" fill="url(#ls-trunk)" />
      <path
        d="M0 -50 L-8 -36 H-4 L-12 -24 H-6 L-15 -13 H-8 L-18 -4 H18 L8 -13 H15 L6 -24 H12 L4 -36 H8 Z"
        fill="url(#ls-pine)"
      />
      <path d="M0 -50 L-4 -36 L-8 -24 L-11 -13 L-14 -4 H0 Z" fill="#3b7d46" opacity="0.45" />
    </g>
  );
}

interface WheelProps {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

function Wheel({ cx, cy, r }: WheelProps) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r} fill="url(#ls-wheel)" stroke="#1a1d20" strokeWidth="1.4" />
      <g className="login-scene__wheel" stroke="#e7c9c4" strokeWidth="0.8" opacity="0.85">
        <line x1={-r + 1.5} y1="0" x2={r - 1.5} y2="0" />
        <line x1="0" y1={-r + 1.5} x2="0" y2={r - 1.5} />
        <line x1={-(r - 2) * 0.7} y1={-(r - 2) * 0.7} x2={(r - 2) * 0.7} y2={(r - 2) * 0.7} />
      </g>
      <circle r={r * 0.25} fill="#d8dde1" />
    </g>
  );
}
