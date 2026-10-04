import type { CSSProperties } from 'react';

// Decorative, animated international-airport scene that fills the login screen.
// Purely visual, so it is hidden from assistive tech and pauses under
// reduced-motion. Depth comes from gradients, haze on distant layers and a
// perspective runway rather than from bitmap images.
//
// The scene is drawn in a 400x300 space and placed inside a 16:9 canvas, so it
// fills a monitor; the login card floats over the right side. Aircraft on the
// runway are drawn head-on / from behind and scaled with perspective so they
// follow the white centre line.

const HORIZON = 140;
const RUNWAY_BOTTOM = 266;
const RUNWAY_CX = 210;
const RUNWAY_HALF_TOP = 14;
const RUNWAY_HALF_BOTTOM = 165;
const WIDE_L = -60;
const WIDE_R = 540;
const WIDE_W = WIDE_R - WIDE_L;

function runwayHalf(t: number): number {
  return RUNWAY_HALF_TOP + (RUNWAY_HALF_BOTTOM - RUNWAY_HALF_TOP) * t;
}

function runwayY(t: number): number {
  return HORIZON + (RUNWAY_BOTTOM - HORIZON) * t;
}

// Centre-line dashes shrink toward the horizon so the runway reads in perspective.
const CENTER_DASHES: ReadonlyArray<string> = Array.from({ length: 11 }, (_, i) => {
  const t0 = (i / 11) ** 1.8;
  const t1 = t0 + (((i + 1) / 11) ** 1.8 - t0) * 0.55;
  const w0 = 0.5 + 2.6 * t0;
  const w1 = 0.5 + 2.6 * t1;
  const y0 = runwayY(t0);
  const y1 = runwayY(t1);
  return `${RUNWAY_CX - w0},${y0} ${RUNWAY_CX + w0},${y0} ${RUNWAY_CX + w1},${y1} ${RUNWAY_CX - w1},${y1}`;
});

// Runway-threshold "piano keys" near the viewer, on both sides of the centre line.
const THRESHOLD_BARS: ReadonlyArray<string> = [-1, 1].flatMap((side) =>
  [0.2, 0.31, 0.42, 0.53, 0.64, 0.75].map((f) => {
    const t0 = 0.8;
    const t1 = 0.95;
    const h0 = runwayHalf(t0);
    const h1 = runwayHalf(t1);
    const df = 0.055;
    const x = (h: number, k: number) => RUNWAY_CX + side * k * h;
    return `${x(h0, f)},${runwayY(t0)} ${x(h0, f + df)},${runwayY(t0)} ${x(h1, f + df)},${runwayY(t1)} ${x(h1, f)},${runwayY(t1)}`;
  }),
);

// Edge lights along both sides of the runway, with a soft glow.
const EDGE_LIGHTS: ReadonlyArray<{ readonly x: number; readonly y: number; readonly r: number }> = Array.from(
  { length: 10 },
  (_, i) => {
    const t = ((i + 0.5) / 10) ** 1.6;
    const half = runwayHalf(t) * 1.03;
    return { x: RUNWAY_CX - half, y: runwayY(t), r: 0.5 + 1.1 * t };
  },
).flatMap((l) => [l, { ...l, x: 2 * RUNWAY_CX - l.x }]);

const TERMINAL_WINDOWS: ReadonlyArray<number> = Array.from({ length: 13 }, (_, i) => 52 + i * 10.6);

const PLANE_WINDOWS: ReadonlyArray<number> = Array.from({ length: 9 }, (_, i) => -22 + i * 4.3);

const LAMP_XS: ReadonlyArray<number> = [10, 100, 190, 280, 370, 460];

const SUN_RAYS: ReadonlyArray<{ readonly deg: number; readonly x: number; readonly y: number }> = Array.from(
  { length: 12 },
  (_, i) => {
    const rad = (i * 30 * Math.PI) / 180;
    return { deg: i * 30, x: 318 + 90 * Math.cos(rad), y: 56 + 90 * Math.sin(rad) };
  },
);

export function LoginScene() {
  return (
    <div className="login-scene" aria-hidden>
      <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMax slice" className="login-scene__svg">
        <defs>
          <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1670d6" />
            <stop offset="45%" stopColor="#4aa5f0" />
            <stop offset="85%" stopColor="#bfe3fb" />
            <stop offset="100%" stopColor="#f4f1dc" />
          </linearGradient>
          <radialGradient id="ls-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fffbe8" />
            <stop offset="35%" stopColor="#fff2b8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff2b8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ls-hills-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8aa9cf" />
            <stop offset="100%" stopColor="#c3d8ea" />
          </linearGradient>
          <linearGradient id="ls-hills" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5f93bd" />
            <stop offset="100%" stopColor="#a9cbe0" />
          </linearGradient>
          <linearGradient id="ls-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7fbf5a" />
            <stop offset="100%" stopColor="#3f8a3a" />
          </linearGradient>
          <linearGradient id="ls-apron" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d3dae0" />
            <stop offset="100%" stopColor="#9aa4ad" />
          </linearGradient>
          <linearGradient id="ls-asphalt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#62686f" />
            <stop offset="100%" stopColor="#25292d" />
          </linearGradient>
          <linearGradient id="ls-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d3ecff" />
            <stop offset="100%" stopColor="#4b8fcf" />
          </linearGradient>
          <linearGradient id="ls-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cfd9e3" />
          </linearGradient>
          <linearGradient id="ls-fuselage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#e6edf4" />
            <stop offset="100%" stopColor="#b7c4d1" />
          </linearGradient>
          <linearGradient id="ls-fuselage-h" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b9c6d3" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b9c6d3" />
          </linearGradient>
          <linearGradient id="ls-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a5057" />
            <stop offset="100%" stopColor="#30353b" />
          </linearGradient>
          <radialGradient id="ls-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fff6c2" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fff6c2" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ls-thrust" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffd27a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ff7a2a" stopOpacity="0" />
          </radialGradient>
          <filter id="ls-blur-soft" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id="ls-shadow" x="-10%" y="-10%" width="120%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.1" floodColor="#0b1d12" floodOpacity="0.4" />
          </filter>
        </defs>

        <g transform="translate(40 0) scale(1.2)">
          {/* Clear sky, sun and layered clouds */}
          <rect x={WIDE_L} y="0" width={WIDE_W} height="300" fill="url(#ls-sky)" />
          <circle cx="318" cy="56" r="54" fill="url(#ls-sun)" />
          <circle cx="318" cy="56" r="12" fill="#fffdf2" />
          <g stroke="#ffffff" strokeWidth="0.6" opacity="0.18">
            {SUN_RAYS.map((r) => (
              <line key={r.deg} x1="318" y1="56" x2={r.x} y2={r.y} />
            ))}
          </g>

          <g className="login-scene__clouds" filter="url(#ls-blur-soft)">
            <ellipse cx="90" cy="48" rx="36" ry="8" fill="#ffffff" opacity="0.9" />
            <ellipse cx="112" cy="42" rx="20" ry="8" fill="#ffffff" opacity="0.95" />
            <ellipse cx="230" cy="74" rx="32" ry="6" fill="#f2f7fc" opacity="0.8" />
            <ellipse cx="170" cy="28" rx="24" ry="5" fill="#eaf3fb" opacity="0.7" />
            <ellipse cx="345" cy="104" rx="28" ry="5" fill="#ffffff" opacity="0.7" />
            <ellipse cx="-10" cy="90" rx="30" ry="6" fill="#ffffff" opacity="0.7" />
            <ellipse cx="440" cy="40" rx="34" ry="7" fill="#ffffff" opacity="0.85" />
            <ellipse cx="500" cy="82" rx="26" ry="5" fill="#f2f7fc" opacity="0.7" />
          </g>

          {/* Distant hills fade into haze */}
          <path d="M-60 146 L-10 124 L40 140 L100 118 L160 138 L230 120 L300 140 L370 116 L440 138 L540 122 V160 H-60 Z" fill="url(#ls-hills-far)" />
          <path d="M-60 150 Q0 128 70 142 T210 138 T350 142 T540 140 V160 H-60 Z" fill="url(#ls-hills)" />
          <rect x={WIDE_L} y="138" width={WIDE_W} height="16" fill="#dff0fb" opacity="0.4" />

          {/* Ground: grass, then concrete aprons either side of the runway */}
          <rect x={WIDE_L} y={HORIZON} width={WIDE_W} height={RUNWAY_BOTTOM + 8 - HORIZON} fill="url(#ls-grass)" />
          <polygon
            points={`${WIDE_L},${HORIZON} ${RUNWAY_CX - RUNWAY_HALF_TOP},${HORIZON} ${RUNWAY_CX - RUNWAY_HALF_BOTTOM},${RUNWAY_BOTTOM} ${WIDE_L},${RUNWAY_BOTTOM}`}
            fill="url(#ls-apron)"
          />
          <polygon
            points={`${WIDE_R},${HORIZON} ${RUNWAY_CX + RUNWAY_HALF_TOP},${HORIZON} ${RUNWAY_CX + RUNWAY_HALF_BOTTOM},${RUNWAY_BOTTOM} ${WIDE_R},${RUNWAY_BOTTOM}`}
            fill="url(#ls-apron)"
          />
          <path d="M150 168 Q170 196 120 266" fill="none" stroke="#f3c614" strokeWidth="1.4" opacity="0.9" />
          <path d="M290 170 Q270 200 330 266" fill="none" stroke="#f3c614" strokeWidth="1.4" opacity="0.9" />

          {/* Runway: asphalt, white edge lines, white centre line and threshold bars */}
          <polygon
            points={`${RUNWAY_CX - RUNWAY_HALF_TOP},${HORIZON} ${RUNWAY_CX + RUNWAY_HALF_TOP},${HORIZON} ${RUNWAY_CX + RUNWAY_HALF_BOTTOM},${RUNWAY_BOTTOM} ${RUNWAY_CX - RUNWAY_HALF_BOTTOM},${RUNWAY_BOTTOM}`}
            fill="url(#ls-asphalt)"
          />
          <line
            x1={RUNWAY_CX - RUNWAY_HALF_TOP * 0.92}
            y1={HORIZON}
            x2={RUNWAY_CX - RUNWAY_HALF_BOTTOM * 0.92}
            y2={RUNWAY_BOTTOM}
            stroke="#ffffff"
            strokeWidth="1.6"
          />
          <line
            x1={RUNWAY_CX + RUNWAY_HALF_TOP * 0.92}
            y1={HORIZON}
            x2={RUNWAY_CX + RUNWAY_HALF_BOTTOM * 0.92}
            y2={RUNWAY_BOTTOM}
            stroke="#ffffff"
            strokeWidth="1.6"
          />
          {THRESHOLD_BARS.map((points) => (
            <polygon key={points} points={points} fill="#ffffff" opacity="0.9" />
          ))}
          {CENTER_DASHES.map((points) => (
            <polygon key={points} points={points} fill="#ffffff" />
          ))}
          {EDGE_LIGHTS.map((l) => (
            <g key={`${l.x}-${l.y}`}>
              <circle cx={l.x} cy={l.y} r={l.r * 3} fill="url(#ls-glow)" opacity="0.7" />
              <circle cx={l.x} cy={l.y} r={l.r} fill="#ffe27a" />
            </g>
          ))}

          {/* Right-hand hangar and a second glass concourse */}
          <g>
            <path d="M262 152 V138 Q306 118 350 138 V152 Z" fill="#aebccb" />
            <path d="M262 138 Q306 118 350 138" fill="none" stroke="#e8eef4" strokeWidth="1.6" />
            <g stroke="#8fa0b2" strokeWidth="0.6">
              {[274, 286, 298, 310, 322, 334].map((x) => (
                <line key={x} x1={x} y1="152" x2={x} y2="130" />
              ))}
            </g>
            <rect x="296" y="142" width="22" height="10" fill="#51606f" />
            <rect x="362" y="130" width="120" height="22" fill="url(#ls-wall)" />
            <rect x="362" y="126" width="120" height="5" rx="2" fill="#1d4f91" />
            <rect x="362" y="136" width="120" height="16" fill="url(#ls-glass)" />
            {[374, 392, 410, 428, 446, 464].map((x) => (
              <rect key={x} x={x} y="136" width="0.9" height="16" fill="#e8f4ff" opacity="0.85" />
            ))}
          </g>

          {/* Control tower */}
          <g filter="url(#ls-shadow)">
            <rect x="237" y="104" width="7" height="48" fill="url(#ls-wall)" />
            <path d="M231 104 L250 104 L247 94 L234 94 Z" fill="#7a8794" />
            <rect x="234" y="88" width="13" height="6" fill="url(#ls-glass)" />
            <rect x="232" y="86" width="17" height="2.4" fill="#e8eef4" />
            <line x1="240.5" y1="86" x2="240.5" y2="74" stroke="#7a8794" strokeWidth="1" />
            <circle className="login-scene__beacon" cx="240.5" cy="73.5" r="1.8" fill="#ff4d4d" />
          </g>

          {/* Passenger terminal with the Prima Husada 2030 sign */}
          <g filter="url(#ls-shadow)">
            <rect x="-40" y="124" width="86" height="28" fill="url(#ls-wall)" />
            <rect x="-40" y="120" width="86" height="5" rx="2" fill="#1d4f91" />
            <rect x="-40" y="132" width="86" height="20" fill="url(#ls-glass)" />
            <rect x="46" y="118" width="148" height="34" fill="url(#ls-wall)" />
            <path d="M96 118 V106 Q120 96 144 106 V118 Z" fill="url(#ls-glass)" />
            <path d="M96 106 Q120 96 144 106" fill="none" stroke="#e8eef4" strokeWidth="1.8" />
            <rect x="42" y="113" width="156" height="6" rx="2" fill="#1d4f91" />
            <rect x="42" y="113" width="156" height="1.8" fill="#6fb3ee" />
            <line x1="120" y1="99" x2="120" y2="84" stroke="#7a8794" strokeWidth="0.8" />
            <path className="login-scene__flag" d="M120 84 H132 L129 87 L132 90 H120 Z" fill="#e5393b" />
            <rect x="62" y="122" width="116" height="14" rx="2.5" fill="#0e2f63" stroke="#f1c40f" strokeWidth="1" />
            <text
              x="120"
              y="132"
              textAnchor="middle"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="8.6"
              fontWeight="700"
              fill="#ffffff"
              textLength="102"
              lengthAdjust="spacingAndGlyphs"
            >
              PRIMA HUSADA 2030
            </text>
            <rect x="46" y="138" width="148" height="14" fill="url(#ls-glass)" />
            {TERMINAL_WINDOWS.map((x) => (
              <rect key={x} x={x} y="138" width="0.9" height="14" fill="#e8f4ff" opacity="0.85" />
            ))}
            <rect x="46" y="138" width="148" height="1.4" fill="#1d4f91" />
          </g>

          {/* Trees at the edge of the airfield */}
          <g>
            <TreeBlob x={206} y={150} />
            <TreeBlob x={216} y={150} small />
            <TreeBlob x={370} y={150} />
            <TreeBlob x={30} y={152} />
            <TreeBlob x={496} y={152} />
            <TreeBlob x={-30} y={152} small />
          </g>

          {/* Windsock beside the runway */}
          <g>
            <line x1="352" y1="168" x2="352" y2="150" stroke="#8a97a3" strokeWidth="1" />
            <g className="login-scene__windsock">
              <path d="M352 150 L368 152 L368 158 L352 156 Z" fill="#ff7a1a" />
              <path d="M358 151 L360 151.4 L360 157 L358 156.6 Z M364 152 L366 152.2 L366 157.6 L364 157.4 Z" fill="#ffffff" />
            </g>
          </g>

          {/* Jet bridge and the stand-by aircraft */}
          <path d="M118 150 L112 163" stroke="#9aa5ae" strokeWidth="4.2" strokeLinecap="round" />
          <circle cx="118" cy="150" r="3" fill="#7a8794" />
          <g transform="translate(100 170)" filter="url(#ls-shadow)">
            <SidePlane tail="#1d6fc4" label="PRIMA HUSADA" />
          </g>
          {/* Foreign airlines (fictional liveries) still parked at their stands */}
          <g transform="translate(300 170) scale(0.78)" filter="url(#ls-shadow)">
            <SidePlane tail="#c9961a" label="GULF STAR" />
          </g>
          <g transform="translate(440 172) scale(0.9)" filter="url(#ls-shadow)">
            <SidePlane tail="#1e9e5a" label="PACIFIC WINGS" />
          </g>
          <g transform="translate(38 207) scale(1.05)" filter="url(#ls-shadow)">
            <SidePlane tail="#d62828" label="SAKURA AIR" />
          </g>
          <g transform="translate(52 240) scale(0.88)" filter="url(#ls-shadow)">
            <SidePlane tail="#1f5fbf" label="NORDIC SKY" />
          </g>
          <ServiceVan x={142} y={182} />

          {/* Take-off (seen from behind) and landing (seen head-on) follow the centre line */}
          <g className="login-scene__takeoff">
            <PlaneRear tail="#1d6fc4" />
          </g>
          <g className="login-scene__landing">
            <PlaneFront tail="#1d6fc4" />
          </g>

          <Cafe />

          {/* Forecourt: planting, lamps, road with moving cars and the pavement with people */}
          <rect x={WIDE_L} y={RUNWAY_BOTTOM} width={WIDE_W} height="6" fill="url(#ls-grass)" />
          <g>
            {[8, 48, 88, 128, 168, 208, 248, 288, 328, 364, 404, 444, 484].map((x) => (
              <g key={x}>
                <ellipse cx={x} cy="268.5" rx="9" ry="3.6" fill="#2f7d32" />
                <circle cx={x - 3} cy="267.5" r="1" fill="#ff3b5c" />
                <circle cx={x + 3} cy="269" r="1" fill="#ffd400" />
              </g>
            ))}
          </g>
          <rect x={WIDE_L} y="272" width={WIDE_W} height="16" fill="url(#ls-road)" />
          <rect x={WIDE_L} y="271" width={WIDE_W} height="1.6" fill="#e8eef4" />
          <g fill="#f4f6f8">
            {Array.from({ length: 19 }, (_, i) => (
              <rect key={i} x={WIDE_L + i * 32 + 4} y="279.2" width="16" height="1.3" />
            ))}
          </g>
          {CARS.map((c) => (
            <g key={c.id} transform={`translate(0 ${c.y})`}>
              <g className={c.reverse ? 'login-scene__car login-scene__car--rev' : 'login-scene__car'} style={carTiming(c)}>
                <g transform={c.reverse ? `scale(-1 1) translate(${-VEHICLE_WIDTH[c.kind]} 0)` : undefined}>
                  <Vehicle spec={c} mirrored={c.reverse} />
                </g>
              </g>
            </g>
          ))}
          <rect x={WIDE_L} y="288" width={WIDE_W} height="12" fill="#d9dee3" />
          <rect x={WIDE_L} y="288" width={WIDE_W} height="1.6" fill="#b4bcc4" />
          {LAMP_XS.map((x) => (
            <g key={x}>
              <line x1={x} y1="298" x2={x} y2="272" stroke="#56626e" strokeWidth="1" />
              <circle cx={x} cy="271" r="6" fill="url(#ls-glow)" opacity="0.6" />
              <circle cx={x} cy="271.5" r="1.6" fill="#fff3a0" />
            </g>
          ))}
          {PEOPLE.map((p) => (
            <g key={p.id} transform={`translate(${p.x} 298.5)`}>
              <g className={p.walk ? 'login-scene__walker' : undefined} style={walkTiming(p)}>
                <Person shirt={p.shirt} pants={p.pants} skin={p.skin} />
              </g>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

interface WingsProps {
  readonly dark?: boolean;
}

// Swept wings and engines seen head-on or from behind; wingspan is 100 units.
function Wings({ dark = false }: WingsProps) {
  return (
    <g>
      {[1, -1].map((side) => (
        <g key={side} transform={`scale(${side} 1)`}>
          <path d="M6 -10 L50 -15 L50 -13 L6 -5 Z" fill="#c8d3de" stroke="#8fa0b2" strokeWidth="0.4" />
          <path d="M44 -15 L50 -19 L50 -13 Z" fill="#9fb0c0" />
          <circle cx="17" cy="-6" r="5.6" fill="#e3eaf0" stroke="#8fa0b2" strokeWidth="0.5" />
          <circle cx="17" cy="-6" r="3.6" fill={dark ? '#1c242b' : '#3a444d'} />
          <circle cx="17" cy="-6" r="1.1" fill="#9aa5ae" />
        </g>
      ))}
    </g>
  );
}

function Gear() {
  return (
    <g fill="#2b2f34">
      <rect x="-0.7" y="-6" width="1.4" height="6" fill="#4a5158" />
      <rect x="-2.6" y="-3" width="1.8" height="3" rx="0.6" />
      <rect x="0.8" y="-3" width="1.8" height="3" rx="0.6" />
      {[-1, 1].map((side) => (
        <g key={side}>
          <rect x={side * 12 - 0.6} y="-8" width="1.2" height="8" fill="#4a5158" />
          <rect x={side * 12 - 2.8} y="-4" width="2" height="4" rx="0.6" />
          <rect x={side * 12 + 0.8} y="-4" width="2" height="4" rx="0.6" />
        </g>
      ))}
    </g>
  );
}

interface TailProps {
  readonly tail: string;
}

// Jet seen from behind (take-off). Origin sits at the wheels.
function PlaneRear({ tail }: TailProps) {
  return (
    <g filter="url(#ls-shadow)">
      <Gear />
      <Wings />
      <path d="M-20 -19.5 L0 -21.5 L20 -19.5 L0 -16.5 Z" fill="#d3dce5" stroke="#9fb0c0" strokeWidth="0.3" />
      <ellipse cx="0" cy="-12" rx="7.6" ry="8.6" fill="url(#ls-fuselage-h)" stroke="#9fb0c0" strokeWidth="0.4" />
      <path d="M-2.6 -18 L-1.6 -45 L1.6 -45 L2.6 -18 Z" fill={tail} />
      <rect x="-1.9" y="-45.8" width="3.8" height="1.6" rx="0.6" fill="#f1c40f" />
      <circle cx="0" cy="-9" r="1.6" fill="#59636d" />
      {[-17, 17].map((x) => (
        <circle key={x} className="login-scene__thrust" cx={x} cy="-6" r="6" fill="url(#ls-thrust)" />
      ))}
      <circle className="login-scene__strobe" cx="0" cy="-46" r="1.4" fill="#ffffff" />
    </g>
  );
}

// Jet seen head-on (landing). Origin sits at the wheels.
function PlaneFront({ tail }: TailProps) {
  return (
    <g filter="url(#ls-shadow)">
      <path d="M-2.4 -19 L-1.5 -36 L1.5 -36 L2.4 -19 Z" fill={tail} />
      <Gear />
      <Wings dark />
      <ellipse cx="0" cy="-12" rx="7.6" ry="8.6" fill="url(#ls-fuselage-h)" stroke="#9fb0c0" strokeWidth="0.4" />
      <path d="M-5 -15.5 Q0 -19.5 5 -15.5 L3.6 -12.4 Q0 -13.8 -3.6 -12.4 Z" fill="#1f2d3a" />
      <path d="M-0.6 -15.6 V-13.4 M0.6 -15.6 V-13.4" stroke="#8aa0b4" strokeWidth="0.4" />
      {[-9, 9].map((x) => (
        <circle key={x} className="login-scene__landing-light" cx={x} cy="-8" r="5" fill="url(#ls-glow)" />
      ))}
      <circle cx="0" cy="-8.5" r="1" fill="#fff8c4" />
    </g>
  );
}

type VehicleKind = 'car' | 'suv' | 'bus';

const VEHICLE_WIDTH: Readonly<Record<VehicleKind, number>> = { car: 26, suv: 30, bus: 64 };

interface CarSpec {
  readonly id: string;
  readonly kind: VehicleKind;
  readonly color: string;
  /** Secondary livery colour (buses) or badge text colour. */
  readonly accent?: string;
  /** Text painted on the vehicle (bus name or model badge). */
  readonly label?: string;
  readonly operator?: string;
  readonly y: number;
  readonly reverse: boolean;
  readonly duration: number;
  readonly delay: number;
  readonly x: number;
}

// Lane at y 280 drives right, lane at y 287 drives left; timings differ so vehicles never bunch.
// Bus names and models are decorative liveries.
const CARS: ReadonlyArray<CarSpec> = [
  { id: 'red', kind: 'car', color: '#d63031', y: 280, reverse: false, duration: 14, delay: -2, x: 60 },
  { id: 'damri-1', kind: 'bus', color: '#1d5fb0', accent: '#f1c40f', operator: 'DAMRI', label: 'PRIMA HUSADA', y: 280, reverse: false, duration: 26, delay: -4, x: 150 },
  { id: 'xl7', kind: 'suv', color: '#b9c3cc', label: 'XL7', y: 280, reverse: false, duration: 20, delay: -12, x: 300 },
  { id: 'citylink', kind: 'bus', color: '#ffffff', accent: '#e67e22', operator: 'CITY', label: 'LINK', y: 280, reverse: false, duration: 28, delay: -18, x: 420 },
  { id: 'blue', kind: 'car', color: '#1d6fc4', y: 287, reverse: true, duration: 16, delay: -5, x: 150 },
  { id: 'damri-2', kind: 'bus', color: '#1d5fb0', accent: '#f1c40f', operator: 'DAMRI', label: 'PRIMA HUSADA', y: 287, reverse: true, duration: 30, delay: -22, x: 330 },
  { id: 'rush', kind: 'suv', color: '#f1f3f5', label: 'RUSH', y: 287, reverse: true, duration: 19, delay: -9, x: 220 },
  { id: 'mitsubishi', kind: 'suv', color: '#2d3436', label: 'MITSUBISHI', y: 287, reverse: true, duration: 22, delay: -15, x: 100 },
];

function carTiming(c: CarSpec): CSSProperties {
  return { '--ls-dur': `${c.duration}s`, '--ls-delay': `${c.delay}s`, '--ls-x': `${c.x}px` } as CSSProperties;
}

interface PersonSpec {
  readonly id: string;
  readonly x: number;
  readonly shirt: string;
  readonly pants: string;
  readonly skin: string;
  readonly walk: boolean;
  readonly duration: number;
}

const PEOPLE: ReadonlyArray<PersonSpec> = [
  { id: 'p1', x: 70, shirt: '#e74c3c', pants: '#2c3e50', skin: '#f1c27d', walk: true, duration: 9 },
  { id: 'p2', x: 84, shirt: '#2980b9', pants: '#34495e', skin: '#c68642', walk: false, duration: 0 },
  { id: 'p3', x: 150, shirt: '#27ae60', pants: '#1f2d3a', skin: '#e0ac69', walk: true, duration: 11 },
  { id: 'p4', x: 168, shirt: '#f39c12', pants: '#3b3b3b', skin: '#8d5524', walk: false, duration: 0 },
  { id: 'p5', x: 222, shirt: '#8e44ad', pants: '#2c3e50', skin: '#f1c27d', walk: true, duration: 10 },
  { id: 'p6', x: 290, shirt: '#16a085', pants: '#2d3436', skin: '#c68642', walk: true, duration: 12 },
  { id: 'p7', x: 306, shirt: '#ecf0f1', pants: '#2c3e50', skin: '#e0ac69', walk: false, duration: 0 },
  { id: 'p8', x: 20, shirt: '#e67e22', pants: '#2c3e50', skin: '#c68642', walk: true, duration: 13 },
  { id: 'p9', x: 38, shirt: '#3498db', pants: '#3b3b3b', skin: '#f1c27d', walk: false, duration: 0 },
  { id: 'p10', x: 350, shirt: '#e84393', pants: '#2d3436', skin: '#e0ac69', walk: true, duration: 9 },
  { id: 'p11', x: 372, shirt: '#00b894', pants: '#34495e', skin: '#8d5524', walk: false, duration: 0 },
  { id: 'p12', x: 420, shirt: '#fdcb6e', pants: '#2c3e50', skin: '#f1c27d', walk: true, duration: 11 },
  { id: 'p13', x: 470, shirt: '#6c5ce7', pants: '#2d3436', skin: '#c68642', walk: false, duration: 0 },
];

function walkTiming(p: PersonSpec): CSSProperties {
  return { '--ls-dur': `${p.duration}s` } as CSSProperties;
}

interface SidePlaneProps {
  readonly tail: string;
  readonly label?: string;
}

// Side-view jet facing right, centred on its fuselage. Wheels sit about 10 units below the origin.
function SidePlane({ tail, label }: SidePlaneProps) {
  return (
    <g>
      <path d="M-30 -5 L-38 -21 L-28 -21 L-19 -6 Z" fill={tail} />
      <path d="M-29 -1 L-40 -6 L-35 0 Z" fill="#9fb0c0" />
      <path
        d="M-31 -2 Q-31 -7 -22 -7 H20 Q30 -6 32 0 Q29 5 18 6 H-22 Q-31 5 -31 -2 Z"
        fill="url(#ls-fuselage)"
        stroke="#9fb0c0"
        strokeWidth="0.4"
      />
      <path d="M-31 2 H31 Q29 5 18 6 H-22 Q-31 5 -31 2 Z" fill={tail} opacity="0.9" />
      <path d="M22 -6 Q29 -5 31 -1 H22 Z" fill="#273746" />
      <g fill="#6fa8d6">
        {PLANE_WINDOWS.map((x) => (
          <circle key={x} cx={x} cy="-2.4" r="1" />
        ))}
      </g>
      <path d="M-2 1 L-14 13 L-6 13 L10 1 Z" fill="#b7c4d1" stroke="#8fa0b2" strokeWidth="0.4" />
      <ellipse cx="3" cy="8" rx="5.5" ry="2.6" fill="#8fa0b2" />
      {label ? (
        <text x="-6" y="3.9" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="2.6" fontWeight="700" fill="#ffffff" stroke={tail} strokeWidth="0.9" paintOrder="stroke">
          {label}
        </text>
      ) : null}
      <ellipse cx="8" cy="8" rx="1.2" ry="2.2" fill="#52606d" />
      <rect x="18" y="5" width="1.2" height="4.4" fill="#4a5158" />
      <circle cx="18.6" cy="10" r="1.7" fill="#2b2f34" />
      <rect x="-6" y="5" width="1.2" height="4.4" fill="#4a5158" />
      <circle cx="-5.4" cy="10" r="1.9" fill="#2b2f34" />
    </g>
  );
}

function ServiceVan({ x, y }: { readonly x: number; readonly y: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.8)`}>
      <rect x="0" y="-9" width="16" height="7" rx="1.2" fill="#f2b81c" />
      <rect x="16" y="-7" width="7" height="5" rx="1" fill="#e08a14" />
      <rect x="17.6" y="-6.2" width="3.4" height="2.4" fill="#cfe9ff" />
      <circle cx="5" cy="-1.6" r="2" fill="#2b2f34" />
      <circle cx="18" cy="-1.6" r="2" fill="#2b2f34" />
    </g>
  );
}

function Car({ color }: { readonly color: string }) {
  return (
    <g>
      <ellipse cx="13" cy="0.4" rx="13" ry="1.2" fill="#000000" opacity="0.25" />
      <rect x="0" y="-7" width="26" height="5" rx="1.6" fill={color} />
      <path d="M6 -7 L9 -11.5 H17 L20 -7 Z" fill={color} />
      <path d="M8 -7 L10 -10.6 H16.2 L18.4 -7 Z" fill="#cfe9ff" />
      <rect x="24.6" y="-6" width="1.6" height="1.6" fill="#fff3a0" />
      <circle cx="6" cy="-2" r="2.4" fill="#1d2023" />
      <circle cx="20" cy="-2" r="2.4" fill="#1d2023" />
      <circle cx="6" cy="-2" r="1" fill="#aab2ba" />
      <circle cx="20" cy="-2" r="1" fill="#aab2ba" />
    </g>
  );
}

interface PersonProps {
  readonly shirt: string;
  readonly pants: string;
  readonly skin: string;
}

// Feet at the origin.
function Person({ shirt, pants, skin }: PersonProps) {
  return (
    <g>
      <rect x="-2" y="-5" width="1.8" height="5" fill={pants} />
      <rect x="0.2" y="-5" width="1.8" height="5" fill={pants} />
      <rect x="-2.4" y="-11" width="4.8" height="6.4" rx="1.6" fill={shirt} />
      <circle cx="0" cy="-13.2" r="2.2" fill={skin} />
      <rect x="2.4" y="-8" width="2.6" height="3.6" rx="0.6" fill="#3b3b3b" />
    </g>
  );
}

function TreeBlob({ x, y, small = false }: { readonly x: number; readonly y: number; readonly small?: boolean }) {
  const s = small ? 0.7 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-1.2" y="-6" width="2.4" height="6" fill="#5a3a22" />
      <circle cx="0" cy="-11" r="7" fill="#2f7d32" />
      <circle cx="-3" cy="-13" r="4.5" fill="#4aa44a" />
    </g>
  );
}

const AWNING_STRIPES: ReadonlyArray<number> = Array.from({ length: 12 }, (_, i) => 398 + i * 6.8);

const BULB_COLORS: ReadonlyArray<string> = ['#ffd24a', '#ff6b6b', '#6bd6ff', '#9be36b'];

const CAFE_BULBS: ReadonlyArray<{ readonly x: number; readonly y: number; readonly color: string }> = Array.from(
  { length: 14 },
  (_, i) => {
    const x = 394 + i * 6.3;
    // Strung lights sag between the roof ends.
    const sag = 4 * Math.sin((Math.PI * (x - 394)) / 82);
    return { x, y: 244 + sag, color: BULB_COLORS[i % BULB_COLORS.length] ?? '#ffd24a' };
  },
);

// Open-air restaurant and cafe beside the runway apron, with umbrella tables.
function Cafe() {
  return (
    <g>
      <g filter="url(#ls-shadow)">
        <rect x="392" y="244" width="90" height="22" fill="#fff1d6" />
        <rect x="392" y="244" width="90" height="22" fill="url(#ls-wall)" opacity="0.5" />
        <path d="M388 244 L394 235 H480 L486 244 Z" fill="#b5482a" />
        <path d="M388 244 L394 235 H480 L486 244" fill="none" stroke="#7d2e18" strokeWidth="0.8" />
        <rect x="388" y="243.4" width="98" height="2" rx="1" fill="#8a361d" />
        <rect x="404" y="237" width="66" height="9" rx="2" fill="#2b1a12" stroke="#f1c40f" strokeWidth="0.8" />
        <text
          x="437"
          y="243.6"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="5.4"
          fontWeight="700"
          fill="#ffe9a8"
          textLength="58"
          lengthAdjust="spacingAndGlyphs"
        >
          KAFE &amp; RESTO PRIMA
        </text>
        <rect x="396" y="256" width="82" height="10" fill="url(#ls-glass)" />
        <rect x="428" y="256" width="12" height="10" fill="#7a4a2a" />
        <rect x="430" y="257.5" width="8" height="8.5" fill="url(#ls-glass)" opacity="0.8" />
        <circle cx="437" cy="261.5" r="0.7" fill="#f1c40f" />
        {[410, 418, 452, 460, 468].map((x) => (
          <rect key={x} x={x} y="256" width="0.8" height="10" fill="#e8f4ff" opacity="0.8" />
        ))}
      </g>

      {/* Striped awning with a scalloped edge */}
      <g>
        {AWNING_STRIPES.map((x, i) => (
          <path
            key={x}
            d={`M${x} 249 H${x + 6.8} V253.4 Q${x + 3.4} 256.2 ${x} 253.4 Z`}
            fill={i % 2 === 0 ? '#d63031' : '#ffffff'}
          />
        ))}
      </g>

      {/* String lights */}
      <g>
        {CAFE_BULBS.map((b) => (
          <g key={b.x}>
            <circle cx={b.x} cy={b.y} r="2.6" fill={b.color} opacity="0.25" />
            <circle cx={b.x} cy={b.y} r="0.9" fill={b.color} />
          </g>
        ))}
      </g>

      {/* Potted plants and a chalkboard menu */}
      <g>
        {[390, 484].map((x) => (
          <g key={x}>
            <path d={`M${x - 2.6} 266 L${x - 2} 261.5 H${x + 2} L${x + 2.6} 266 Z`} fill="#c4572a" />
            <circle cx={x} cy="258.5" r="3.6" fill="#2f7d32" />
            <circle cx={x - 1.4} cy="257.6" r="0.9" fill="#ff3b5c" />
            <circle cx={x + 1.6} cy="259" r="0.9" fill="#ffd400" />
          </g>
        ))}
        <path d="M376 266 L378 254 H386 L388 266 Z" fill="#3b2a1c" />
        <rect x="378.6" y="255.4" width="6.8" height="7.2" fill="#2f3b34" />
        <path d="M380 257.4 H384 M380 259.2 H383.4 M380 261 H384" stroke="#e8eef4" strokeWidth="0.5" />
      </g>

      {/* Umbrella tables */}
      {[368, 500].map((x) => {
        const canopy = x === 368 ? '#e17055' : '#00a8a8';
        return (
          <g key={x}>
            <ellipse cx={x} cy="266.4" rx="9" ry="1.4" fill="#000000" opacity="0.2" />
            <line x1={x} y1="266" x2={x} y2="250" stroke="#6b5a4a" strokeWidth="0.9" />
            <path d={`M${x - 11} 251 Q${x} 241 ${x + 11} 251 Z`} fill={canopy} />
            <path d={`M${x - 11} 251 Q${x - 5.5} 253 ${x} 251 Q${x + 5.5} 253 ${x + 11} 251`} fill={canopy} />
            <ellipse cx={x} cy="262" rx="6.5" ry="1.8" fill="#f5e6c8" stroke="#8a6a44" strokeWidth="0.5" />
            <rect x={x - 5} y="263.6" width="1" height="2.4" fill="#8a6a44" />
            <rect x={x + 4} y="263.6" width="1" height="2.4" fill="#8a6a44" />
            <rect x={x - 11} y="260" width="3.2" height="6" rx="0.8" fill="#8a6a44" />
            <rect x={x + 7.8} y="260" width="3.2" height="6" rx="0.8" fill="#8a6a44" />
            <circle cx={x - 2} cy="260.6" r="1.1" fill="#ffffff" />
            <circle cx={x + 2} cy="260.6" r="1.1" fill="#ffd36b" />
          </g>
        );
      })}
      <g transform="translate(386 266)">
        <Person shirt="#e84393" pants="#2d3436" skin="#f1c27d" />
      </g>
      <g transform="translate(476 266)">
        <Person shirt="#0984e3" pants="#2d3436" skin="#c68642" />
      </g>
    </g>
  );
}

// Reversed vehicles are drawn mirrored, so their lettering is flipped back to stay readable.
function textFlip(mirrored: boolean, cx: number): string | undefined {
  return mirrored ? `translate(${2 * cx} 0) scale(-1 1)` : undefined;
}

function Vehicle({ spec, mirrored }: { readonly spec: CarSpec; readonly mirrored: boolean }) {
  if (spec.kind === 'bus') {
    return (
      <Bus
        color={spec.color}
        accent={spec.accent ?? '#f1c40f'}
        operator={spec.operator ?? ''}
        name={spec.label ?? ''}
        mirrored={mirrored}
      />
    );
  }
  if (spec.kind === 'suv') {
    return <Suv color={spec.color} label={spec.label ?? ''} mirrored={mirrored} />;
  }
  return <Car color={spec.color} />;
}

const BUS_WINDOWS: ReadonlyArray<number> = Array.from({ length: 7 }, (_, i) => 12 + i * 7);

interface BusProps {
  readonly color: string;
  readonly accent: string;
  readonly operator: string;
  readonly name: string;
  readonly mirrored: boolean;
}

// Coach seen from the side, nose to the right; 64 units long, baseline at y 0.
function Bus({ color, accent, operator, name, mirrored }: BusProps) {
  const lightBody = color === '#ffffff';
  return (
    <g>
      <ellipse cx="32" cy="0.5" rx="32" ry="1.4" fill="#000000" opacity="0.25" />
      <rect x="0" y="-17" width="64" height="14" rx="3" fill={color} stroke={lightBody ? '#c9d1d8' : 'none'} strokeWidth="0.4" />
      <rect x="0" y="-9" width="64" height="2.2" fill={accent} />
      <rect x="0" y="-6.4" width="64" height="3.4" fill={lightBody ? '#d9dee3' : '#12376b'} opacity="0.9" />
      <rect x="2" y="-16" width="60" height="1.4" rx="0.7" fill="#ffffff" opacity="0.5" />
      <g fill="#cfe9ff" stroke="#6f8ea8" strokeWidth="0.3">
        {BUS_WINDOWS.map((x) => (
          <rect key={x} x={x} y="-15" width="5.6" height="5" rx="0.8" />
        ))}
        <path d="M53 -15 H61 Q63 -15 63 -13 V-10 H53 Z" />
      </g>
      <rect x="4" y="-15" width="5.6" height="5" rx="0.8" fill="#cfe9ff" stroke="#6f8ea8" strokeWidth="0.3" />
      <rect x="49.2" y="-15" width="3" height="11" fill="#9fb4c6" stroke="#6f8ea8" strokeWidth="0.3" />
      {operator ? (
        <text
          transform={textFlip(mirrored, 30)}
          x="30"
          y="-7.8"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="3.4"
          fontWeight="700"
          fill={lightBody ? accent : '#ffffff'}
        >
          {operator} {name}
        </text>
      ) : null}
      <rect x="62.4" y="-6" width="1.6" height="1.8" fill="#fff3a0" />
      <rect x="0" y="-6" width="1" height="1.8" fill="#ff5a4d" />
      {[10, 18, 48].map((x) => (
        <g key={x}>
          <circle cx={x} cy="-2" r="3" fill="#1d2023" />
          <circle cx={x} cy="-2" r="1.2" fill="#aab2ba" />
        </g>
      ))}
    </g>
  );
}

// Compact SUV / MPV; 30 units long, baseline at y 0.
function Suv({ color, label, mirrored }: { readonly color: string; readonly label: string; readonly mirrored: boolean }) {
  const dark = color === '#2d3436';
  return (
    <g>
      <ellipse cx="15" cy="0.4" rx="15" ry="1.2" fill="#000000" opacity="0.25" />
      <rect x="0" y="-8.4" width="30" height="6.4" rx="1.8" fill={color} stroke={dark ? 'none' : '#b4bcc4'} strokeWidth="0.3" />
      <path d="M4.5 -8.4 L7.5 -13.6 H24 L27.5 -8.4 Z" fill={color} stroke={dark ? 'none' : '#b4bcc4'} strokeWidth="0.3" />
      <path d="M7 -8.8 L9.2 -12.8 H15 V-8.8 Z M16 -8.8 V-12.8 H23.2 L25.6 -8.8 Z" fill="#cfe9ff" />
      <rect x="2" y="-13.8" width="26" height="0.9" rx="0.4" fill="#2b2f34" opacity="0.7" />
      <rect x="28.4" y="-7" width="1.6" height="1.8" fill="#fff3a0" />
      <rect x="0" y="-7" width="1" height="1.8" fill="#ff5a4d" />
      <text
        transform={textFlip(mirrored, 14)}
        x="14"
        y="-3.2"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="2.2"
        fontWeight="700"
        fill={dark ? '#e8eef4' : '#2b2f34'}
      >
        {label}
      </text>
      {[6.5, 23.5].map((x) => (
        <g key={x}>
          <circle cx={x} cy="-2.2" r="2.6" fill="#1d2023" />
          <circle cx={x} cy="-2.2" r="1" fill="#aab2ba" />
        </g>
      ))}
    </g>
  );
}
