import type { CSSProperties } from 'react';

// Decorative, animated international-airport scene shown beside the login form.
// Purely visual, so it is hidden from assistive tech and pauses under
// reduced-motion. Depth comes from gradients, haze on distant layers and a
// perspective runway rather than from bitmap images.
//
// Key content stays inside x 60..340 because the SVG is cropped ("slice") to
// whatever shape the frame takes.

const HORIZON = 152;
const RUNWAY_BOTTOM = 258;
const RUNWAY_CX = 210;
const RUNWAY_HALF_TOP = 14;
const RUNWAY_HALF_BOTTOM = 150;

function runwayHalf(t: number): number {
  return RUNWAY_HALF_TOP + (RUNWAY_HALF_BOTTOM - RUNWAY_HALF_TOP) * t;
}

function runwayY(t: number): number {
  return HORIZON + (RUNWAY_BOTTOM - HORIZON) * t;
}

interface Dash {
  readonly points: string;
}

// Centre-line dashes shrink toward the horizon so the runway reads in perspective.
const CENTER_DASHES: ReadonlyArray<Dash> = Array.from({ length: 11 }, (_, i) => {
  const t0 = (i / 11) ** 1.8;
  const t1 = t0 + (((i + 1) / 11) ** 1.8 - t0) * 0.55;
  const w0 = 0.5 + 2.6 * t0;
  const w1 = 0.5 + 2.6 * t1;
  const y0 = runwayY(t0);
  const y1 = runwayY(t1);
  return {
    points: `${RUNWAY_CX - w0},${y0} ${RUNWAY_CX + w0},${y0} ${RUNWAY_CX + w1},${y1} ${RUNWAY_CX - w1},${y1}`,
  };
});

// Edge lights along both sides of the runway.
const EDGE_LIGHTS: ReadonlyArray<{ readonly x: number; readonly y: number; readonly r: number }> = Array.from(
  { length: 9 },
  (_, i) => {
    const t = ((i + 0.5) / 9) ** 1.6;
    const half = runwayHalf(t) * 1.02;
    return { x: RUNWAY_CX - half, y: runwayY(t), r: 0.5 + 1.1 * t };
  },
).flatMap((l) => [l, { ...l, x: 2 * RUNWAY_CX - l.x }]);

const TERMINAL_WINDOWS: ReadonlyArray<number> = Array.from({ length: 13 }, (_, i) => 52 + i * 10.6);

const PLANE_WINDOWS: ReadonlyArray<number> = Array.from({ length: 9 }, (_, i) => -22 + i * 4.3);

export function LoginScene() {
  return (
    <div className="login-scene" aria-hidden>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="login-scene__svg">
        <defs>
          <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d7fe0" />
            <stop offset="55%" stopColor="#62b4f5" />
            <stop offset="100%" stopColor="#d6efff" />
          </linearGradient>
          <radialGradient id="ls-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fffbe8" />
            <stop offset="35%" stopColor="#fff2b8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff2b8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ls-hills" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6f9fc4" />
            <stop offset="100%" stopColor="#a9cbe0" />
          </linearGradient>
          <linearGradient id="ls-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7fbf5a" />
            <stop offset="100%" stopColor="#3f8a3a" />
          </linearGradient>
          <linearGradient id="ls-apron" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9d1d8" />
            <stop offset="100%" stopColor="#9aa4ad" />
          </linearGradient>
          <linearGradient id="ls-asphalt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b6168" />
            <stop offset="100%" stopColor="#2b2f34" />
          </linearGradient>
          <linearGradient id="ls-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bfe3ff" />
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
          <linearGradient id="ls-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a5057" />
            <stop offset="100%" stopColor="#30353b" />
          </linearGradient>
          <filter id="ls-blur-soft" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id="ls-shadow" x="-10%" y="-10%" width="120%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.1" floodColor="#0b1d12" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Clear sky and sun */}
        <rect width="400" height="300" fill="url(#ls-sky)" />
        <circle cx="318" cy="56" r="46" fill="url(#ls-sun)" />
        <circle cx="318" cy="56" r="12" fill="#fffdf2" />

        <g className="login-scene__clouds" filter="url(#ls-blur-soft)">
          <ellipse cx="90" cy="48" rx="36" ry="8" fill="#ffffff" opacity="0.9" />
          <ellipse cx="112" cy="42" rx="20" ry="8" fill="#ffffff" opacity="0.95" />
          <ellipse cx="230" cy="74" rx="32" ry="6" fill="#f2f7fc" opacity="0.8" />
          <ellipse cx="170" cy="28" rx="24" ry="5" fill="#eaf3fb" opacity="0.7" />
          <ellipse cx="345" cy="104" rx="28" ry="5" fill="#ffffff" opacity="0.7" />
        </g>

        {/* Distant hills fade into haze */}
        <path d="M0 150 Q60 128 130 142 T260 138 T400 144 V160 H0 Z" fill="url(#ls-hills)" />
        <rect x="0" y="140" width="400" height="14" fill="#dff0fb" opacity="0.35" />

        {/* Ground: grass, then concrete aprons either side of the runway */}
        <rect x="0" y={HORIZON} width="400" height={RUNWAY_BOTTOM + 8 - HORIZON} fill="url(#ls-grass)" />
        <polygon points={`0,${HORIZON} ${RUNWAY_CX - RUNWAY_HALF_TOP},${HORIZON} ${RUNWAY_CX - RUNWAY_HALF_BOTTOM},${RUNWAY_BOTTOM} 0,${RUNWAY_BOTTOM}`} fill="url(#ls-apron)" />
        <polygon points={`400,${HORIZON} ${RUNWAY_CX + RUNWAY_HALF_TOP},${HORIZON} ${RUNWAY_CX + RUNWAY_HALF_BOTTOM},${RUNWAY_BOTTOM} 400,${RUNWAY_BOTTOM}`} fill="url(#ls-apron)" />
        <path d="M150 168 Q170 190 120 258" fill="none" stroke="#f3c614" strokeWidth="1.4" opacity="0.9" />

        {/* Runway: asphalt, white edge lines and a white centre line */}
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
        {CENTER_DASHES.map((d) => (
          <polygon key={d.points} points={d.points} fill="#ffffff" />
        ))}
        {EDGE_LIGHTS.map((l) => (
          <circle key={`${l.x}-${l.y}`} cx={l.x} cy={l.y} r={l.r} fill="#ffe27a" />
        ))}

        {/* Right-hand hangar */}
        <g>
          <path d="M262 152 V138 Q306 118 350 138 V152 Z" fill="#aebccb" />
          <path d="M262 138 Q306 118 350 138" fill="none" stroke="#e8eef4" strokeWidth="1.6" />
          <g stroke="#8fa0b2" strokeWidth="0.6">
            {[274, 286, 298, 310, 322, 334].map((x) => (
              <line key={x} x1={x} y1="152" x2={x} y2="130" />
            ))}
          </g>
          <rect x="296" y="142" width="22" height="10" fill="#51606f" />
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
          <rect x="46" y="118" width="148" height="34" fill="url(#ls-wall)" />
          <path d="M96 118 V106 Q120 96 144 106 V118 Z" fill="url(#ls-glass)" />
          <path d="M96 106 Q120 96 144 106" fill="none" stroke="#e8eef4" strokeWidth="1.8" />
          <rect x="42" y="113" width="156" height="6" rx="2" fill="#1d4f91" />
          <rect x="42" y="113" width="156" height="1.8" fill="#6fb3ee" />
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
        </g>

        {/* Jet bridge and the stand-by aircraft */}
        <path d="M118 150 L112 163" stroke="#9aa5ae" strokeWidth="4.2" strokeLinecap="round" />
        <circle cx="118" cy="150" r="3" fill="#7a8794" />
        <g transform="translate(100 170)" filter="url(#ls-shadow)">
          <Plane tail="#1d6fc4" label />
        </g>
        <g transform="translate(300 170) scale(0.78)" filter="url(#ls-shadow)">
          <Plane tail="#f39c34" />
        </g>
        <ServiceVan x={142} y={182} />

        {/* Take-off and landing aircraft */}
        <g className="login-scene__takeoff" filter="url(#ls-shadow)">
          <Plane tail="#1d6fc4" label />
        </g>
        <g className="login-scene__landing" filter="url(#ls-shadow)">
          <g transform="scale(-1 1)">
            <Plane tail="#1d6fc4" />
          </g>
        </g>

        {/* Forecourt: planting, road with moving cars and the pavement with people */}
        <rect x="0" y={RUNWAY_BOTTOM} width="400" height="10" fill="url(#ls-grass)" />
        <g>
          {[48, 128, 208, 288, 364].map((x) => (
            <ellipse key={x} cx={x} cy="262" rx="9" ry="4.5" fill="#2f7d32" />
          ))}
          {[48, 128, 208, 288, 364].map((x) => (
            <g key={x}>
              <circle cx={x - 3} cy="261" r="1" fill="#ff3b5c" />
              <circle cx={x + 3} cy="262.5" r="1" fill="#ffd400" />
            </g>
          ))}
        </g>
        <rect x="0" y="266" width="400" height="22" fill="url(#ls-road)" />
        <rect x="0" y="265" width="400" height="1.6" fill="#e8eef4" />
        <g fill="#f4f6f8">
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={i * 32 + 4} y="276.5" width="16" height="1.3" />
          ))}
        </g>
        {CARS.map((c) => (
          <g key={c.id} transform={`translate(0 ${c.y})`}>
            <g className={c.reverse ? 'login-scene__car login-scene__car--rev' : 'login-scene__car'} style={carTiming(c)}>
              <g transform={c.reverse ? 'scale(-1 1) translate(-26 0)' : undefined}>
                <Car color={c.color} />
              </g>
            </g>
          </g>
        ))}
        <rect x="0" y="288" width="400" height="12" fill="#d9dee3" />
        <rect x="0" y="288" width="400" height="1.6" fill="#b4bcc4" />
        {PEOPLE.map((p) => (
          <g key={p.id} transform={`translate(${p.x} 298.5)`}>
            <g className={p.walk ? 'login-scene__walker' : undefined} style={walkTiming(p)}>
              <Person shirt={p.shirt} pants={p.pants} skin={p.skin} />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

interface CarSpec {
  readonly id: string;
  readonly color: string;
  readonly y: number;
  readonly reverse: boolean;
  readonly duration: number;
  readonly delay: number;
  readonly x: number;
}

// Lane at y 275 drives right, lane at y 286 drives left; timings differ so cars never bunch.
const CARS: ReadonlyArray<CarSpec> = [
  { id: 'red', color: '#d63031', y: 275, reverse: false, duration: 14, delay: -2, x: 60 },
  { id: 'white', color: '#f1f3f5', y: 275, reverse: false, duration: 18, delay: -11, x: 250 },
  { id: 'blue', color: '#1d6fc4', y: 286, reverse: true, duration: 16, delay: -5, x: 150 },
  { id: 'yellow', color: '#f2b81c', y: 286, reverse: true, duration: 20, delay: -14, x: 320 },
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
];

function walkTiming(p: PersonSpec): CSSProperties {
  return { '--ls-dur': `${p.duration}s` } as CSSProperties;
}

interface PlaneProps {
  readonly tail: string;
  readonly label?: boolean;
}

// Side-view jet facing right, centred on its fuselage. Wheels sit about 10 units below the origin.
function Plane({ tail, label = false }: PlaneProps) {
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
      {label ? (
        <text x="-6" y="3.9" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="2.6" fontWeight="700" fill="#ffffff">
          PRIMA HUSADA
        </text>
      ) : null}
      <path d="M-2 1 L-14 13 L-6 13 L10 1 Z" fill="#b7c4d1" stroke="#8fa0b2" strokeWidth="0.4" />
      <ellipse cx="3" cy="8" rx="5.5" ry="2.6" fill="#8fa0b2" />
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
