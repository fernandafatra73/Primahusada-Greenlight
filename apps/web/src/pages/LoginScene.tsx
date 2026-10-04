import { useState, type CSSProperties } from 'react';
import { LoginArrival } from './LoginArrival.tsx';

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

interface FlyerSpec {
  readonly id: string;
  readonly y: number;
  readonly scale: number;
  readonly reverse: boolean;
  readonly tail: string;
  readonly duration: number;
  readonly delay: number;
}

// Two lanes of sky traffic: even ones fly left to right, the others right to left.
const FLYERS: ReadonlyArray<FlyerSpec> = [
  { id: 'f1', y: 24, scale: 0.5, reverse: false, tail: '#d62828', duration: 34, delay: -8 },
  { id: 'f2', y: 50, scale: 0.6, reverse: true, tail: '#1f5fbf', duration: 40, delay: -22 },
  { id: 'f3', y: 80, scale: 0.4, reverse: false, tail: '#1e9e5a', duration: 46, delay: -30 },
  { id: 'f4', y: 104, scale: 0.35, reverse: true, tail: '#c9961a', duration: 52, delay: -12 },
];

function flyTiming(f: FlyerSpec): CSSProperties {
  return { '--ls-dur': `${f.duration}s`, '--ls-delay': `${f.delay}s` } as CSSProperties;
}

const LAMP_XS: ReadonlyArray<number> = [10, 100, 190, 280, 370, 460];

const SUN_RAYS: ReadonlyArray<{ readonly deg: number; readonly x: number; readonly y: number }> = Array.from(
  { length: 12 },
  (_, i) => {
    const rad = (i * 30 * Math.PI) / 180;
    return { deg: i * 30, x: 318 + 90 * Math.cos(rad), y: 56 + 90 * Math.sin(rad) };
  },
);

interface LoginSceneProps {
  /** Swings the view to the side for the passenger-arrival story, then back. */
  readonly arrival: boolean;
  readonly onArrivalEnd: () => void;
}

interface Airline {
  readonly name: string;
  readonly tail: string;
}

// Airlines take it in turns to depart: the one waiting on the left taxiway rolls out and then
// takes off from the runway; the next one moves up when the cycle restarts. (Fictional liveries.)
const DEPARTING_AIRLINES: ReadonlyArray<Airline> = [
  { name: 'NORDIC SKY', tail: '#1f5fbf' },
  { name: 'SAKURA AIR', tail: '#d62828' },
  { name: 'PRIMA HUSADA', tail: '#1d6fc4' },
];

function departingAirline(index: number): Airline {
  const count = DEPARTING_AIRLINES.length;
  return DEPARTING_AIRLINES[((index % count) + count) % count] ?? { name: 'PRIMA HUSADA', tail: '#1d6fc4' };
}

interface Bay {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

// Eight bays on the right apron: the front row fills first (far end first), then the back row,
// so a new arrival never taxis through a parked plane. Keep in step with the keyframes in login.css.
const BAYS: ReadonlyArray<Bay> = [
  { x: 460, y: 216, scale: 0.66 },
  { x: 408, y: 216, scale: 0.66 },
  { x: 356, y: 216, scale: 0.66 },
  { x: 304, y: 216, scale: 0.66 },
  { x: 460, y: 194, scale: 0.6 },
  { x: 408, y: 194, scale: 0.6 },
  { x: 356, y: 194, scale: 0.6 },
  { x: 304, y: 194, scale: 0.6 },
];

// Which landing (cycle number) currently occupies a bay, or null when the bay has never been used.
function bayOccupant(bay: number, cycle: number): number | null {
  for (let back = 1; back <= BAYS.length; back += 1) {
    const landing = cycle - back;
    if (landing >= 0 && landing % BAYS.length === bay) return landing;
  }
  return null;
}

interface ParkedPlane {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly tail: string;
  readonly name: string;
}

// Six planes parked on the left apron; with the Prima Husada one at the jet bridge and the one
// waiting on the taxiway to depart, that makes eight there. (Fictional liveries.)
const LEFT_PLANES: ReadonlyArray<ParkedPlane> = [
  { x: 28, y: 166, scale: 0.8, tail: '#8e44ad', name: 'ORIENT STAR' },
  { x: 96, y: 192, scale: 0.7, tail: '#e67e22', name: 'LION WINGS' },
  { x: 46, y: 192, scale: 0.7, tail: '#16a085', name: 'ALPINE AIR' },
  { x: -2, y: 192, scale: 0.7, tail: '#0984e3', name: 'BLUE ORCA' },
  { x: 72, y: 214, scale: 0.62, tail: '#e84393', name: 'ROSE JET' },
  { x: 26, y: 214, scale: 0.62, tail: '#f39c12', name: 'SUNRISE' },
];

export function LoginScene({ arrival, onArrivalEnd }: LoginSceneProps) {
  // Bumped each time the 30s take-off cycle restarts, i.e. right after one airline has departed.
  const [departures, setDepartures] = useState(0);
  const waiting = departingAirline(departures);
  const leaving = departingAirline(departures - 1);

  return (
    <div className="login-stage" aria-hidden>
    <div
      className={arrival ? 'login-scene login-scene--away' : 'login-scene'}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onArrivalEnd();
      }}
    >
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
          <linearGradient id="ls-contrail" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
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

          {/* Aircraft crossing the sky, left to right and right to left */}
          {FLYERS.map((f) => (
            <g key={f.id} transform={`translate(0 ${f.y})`}>
              <g className={f.reverse ? 'login-scene__flyer-l' : 'login-scene__flyer-r'} style={flyTiming(f)}>
                <g transform={`scale(${f.reverse ? -f.scale : f.scale} ${f.scale})`}>
                  <rect x="-130" y="-1.2" width="96" height="2.4" fill="url(#ls-contrail)" />
                  <SidePlane tail={f.tail} />
                </g>
              </g>
            </g>
          ))}

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

          {/* Passenger terminal with the Prima Husada 2050 sign */}
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
              PRIMA HUSADA 2050
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

          {/* Left taxiway: the aircraft waiting here is next to take off */}
          <path d="M-30 242 L96 242" fill="none" stroke="#3a3f45" strokeWidth="11" strokeLinecap="round" />
          <path d="M-30 242 L92 242" fill="none" stroke="#f3c614" strokeWidth="0.9" strokeDasharray="5 4" />
          <rect x="62" y="236" width="1" height="12" fill="#ffffff" opacity="0.65" />

          {/* Jet bridge and the stand-by aircraft */}
          <path d="M118 150 L112 163" stroke="#9aa5ae" strokeWidth="4.2" strokeLinecap="round" />
          <circle cx="118" cy="150" r="3" fill="#7a8794" />
          <g transform="translate(100 170)" filter="url(#ls-shadow)">
            <SidePlane tail="#1d6fc4" label="PRIMA HUSADA" />
          </g>
          {/* Foreign airlines (fictional liveries) parked on the left */}
          {LEFT_PLANES.map((plane) => (
            <g key={plane.name} transform={`translate(${plane.x} ${plane.y}) scale(${plane.scale})`} filter="url(#ls-shadow)">
              <SidePlane tail={plane.tail} label={plane.name} />
            </g>
          ))}
          <g transform="translate(46 236) scale(0.6)">
            <g className="login-scene__departing">
              <SidePlane tail={waiting.tail} label={waiting.name} />
            </g>
          </g>
          <ServiceVan x={112} y={184} />

          {/* Taxiway branching right off the runway to the parking stand of the landed aircraft */}
          <path d="M272 188 C292 180 320 175 360 175 L494 175" fill="none" stroke="#3a3f45" strokeWidth="11" strokeLinecap="round" />
          <path d="M276 188 C296 180 322 175 360 175 L490 175" fill="none" stroke="#f3c614" strokeWidth="0.8" strokeDasharray="5 4" />
          <rect x="278" y="184" width="214" height="46" rx="3" fill="#3a3f45" />
          {[278, 330, 382, 434, 486].map((x) => (
            <rect key={x} x={x} y="184" width="1" height="46" fill="#f3c614" opacity="0.85" />
          ))}
          <rect x="278" y="205" width="214" height="1" fill="#f3c614" opacity="0.85" />

          {/* Take-off (seen from behind) and landing (seen head-on) follow the centre line */}
          <g
            className="login-scene__takeoff"
            onAnimationIteration={(event) => {
              if (event.target === event.currentTarget) setDepartures((count) => count + 1);
            }}
          >
            <PlaneRear tail={leaving.tail} />
          </g>
          <g className="login-scene__landing">
            <PlaneFront tail="#1d6fc4" />
          </g>
          {/* Planes parked in the bays by earlier landings (the bay being filled now is empty until it arrives) */}
          {BAYS.map((bay, index) => {
            const landing = bayOccupant(index, departures);
            if (landing === null || landing === departures) return null;
            const airline = departingAirline(landing);
            return (
              <g key={`${bay.x}-${bay.y}`} transform={`translate(${bay.x} ${bay.y}) scale(${bay.scale})`}>
                <SidePlane tail={airline.tail} label={airline.name} />
              </g>
            );
          })}
          {/* The aircraft that has just landed turns right, taxis along the back lane and parks in its bay */}
          <g
            key={departures}
            className={`login-scene__landing-side login-scene__landing-side--${departures % BAYS.length}`}
            style={{ animationDelay: departures === 0 ? '-3s' : '0s' }}
          >
            <SidePlane tail={departingAirline(departures).tail} label={departingAirline(departures).name} />
          </g>


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
          {/* DAMRI halte on the pavement, where the pick-up car stops */}
          <g>
            <rect x="238" y="283" width="82" height="2.4" fill="#1d4f91" />
            <rect x="239" y="285" width="1.2" height="15" fill="#8a95a0" />
            <rect x="318" y="285" width="1.2" height="15" fill="#8a95a0" />
            <rect x="240" y="285" width="78" height="13" fill="url(#ls-glass)" opacity="0.22" />
            <rect x="258" y="276.5" width="42" height="6" rx="1.4" fill="#0e2f63" stroke="#f1c40f" strokeWidth="0.5" />
            <text x="279" y="281" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="3.8" fontWeight="700" fill="#ffffff">
              HALTE DAMRI
            </text>
          </g>

          {PEOPLE.map((p, i) => {
            const direction = STROLL_DIRECTION.get(p.id);
            const facing = direction === 'l' ? -1 : direction === 'r' ? 1 : i % 2 === 0 ? 1 : -1;
            return (
              <g key={p.id} transform={`translate(${p.x} ${p.y ?? 298.5}) scale(${p.scale ?? 1})`}>
                <g className={direction ? 'login-scene__stroll' : undefined} style={direction ? strollTiming(p, direction) : undefined}>
                  <Person shirt={p.shirt} pants={p.pants} skin={p.skin} walking={direction !== undefined} facing={facing} />
                </g>
              </g>
            );
          })}

          {/* A car stops at the kerb, six passengers get in, then it drives on */}
          <g transform="translate(0 287)">
            <g className="login-scene__pickup-car">
              <g transform="scale(-1 1) translate(-30 0)">
                <Suv color="#e8ecef" label="XL7" mirrored />
              </g>
            </g>
          </g>
          {PICKUP_START.map((x, i) => (
            <g key={x} className={`login-scene__pickup-p${i}`}>
              <Person
                shirt={PICKUP_LOOK[i]?.shirt ?? '#e74c3c'}
                pants="#2c3e50"
                skin={PICKUP_LOOK[i]?.skin ?? '#f1c27d'}
                pack={i % 2 === 0 ? 'koper' : 'ransel'}
                walking
                facing={i < 3 ? 1 : -1}
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
    {arrival ? <LoginArrival /> : null}
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
    <g>
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
    <g>
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
  readonly y?: number;
  readonly scale?: number;
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
  { id: 'p14', x: 5, shirt: '#00b894', pants: '#34495e', skin: '#f1c27d', walk: true, duration: 14 },
  { id: 'p15', x: 58, shirt: '#fd79a8', pants: '#2d3436', skin: '#e0ac69', walk: false, duration: 0 },
  { id: 'p16', x: 108, shirt: '#0984e3', pants: '#2c3e50', skin: '#8d5524', walk: true, duration: 12 },
  { id: 'p17', x: 190, shirt: '#e17055', pants: '#34495e', skin: '#c68642', walk: false, duration: 0 },
  { id: 'p18', x: 236, shirt: '#fdcb6e', pants: '#2d3436', skin: '#f1c27d', walk: true, duration: 15 },
  { id: 'p19', x: 262, shirt: '#6c5ce7', pants: '#2c3e50', skin: '#e0ac69', walk: false, duration: 0 },
  { id: 'p20', x: 330, shirt: '#55efc4', pants: '#34495e', skin: '#c68642', walk: true, duration: 10 },
  { id: 'p21', x: 396, shirt: '#ff7675', pants: '#2d3436', skin: '#f1c27d', walk: false, duration: 0 },
  { id: 'p22', x: 440, shirt: '#74b9ff', pants: '#2c3e50', skin: '#8d5524', walk: true, duration: 13 },
  { id: 'p23', x: 492, shirt: '#a29bfe', pants: '#34495e', skin: '#e0ac69', walk: false, duration: 0 },
  { id: 'p24', x: 70, y: 158, scale: 0.55, shirt: '#e74c3c', pants: '#2d3436', skin: '#f1c27d', walk: true, duration: 9 },
  { id: 'p25', x: 96, y: 158, scale: 0.55, shirt: '#2980b9', pants: '#2c3e50', skin: '#c68642', walk: false, duration: 0 },
  { id: 'p26', x: 138, y: 159, scale: 0.55, shirt: '#27ae60', pants: '#34495e', skin: '#e0ac69', walk: true, duration: 11 },
  { id: 'p27', x: 156, y: 159, scale: 0.55, shirt: '#f39c12', pants: '#2d3436', skin: '#f1c27d', walk: false, duration: 0 },
];

// Kerb-side walkers cross the whole scene, alternating direction; the apron ones (with a y) stay put.
const STROLL_DIRECTION: ReadonlyMap<string, 'r' | 'l'> = new Map(
  PEOPLE.filter((p) => p.walk && p.y === undefined).map((p, i) => [p.id, i % 2 === 0 ? 'r' : 'l'] as const),
);

const STROLL_FROM = -70;
const STROLL_TO = 560;

// Each walker keeps a steady pace and starts from the x it is listed at, so the crowd is spread out.
function strollTiming(p: PersonSpec, direction: 'r' | 'l'): CSSProperties {
  const pace = 11 + (p.id.length * 7 + p.x) % 8;
  const duration = (STROLL_TO - STROLL_FROM) / pace;
  const progress = direction === 'r' ? (p.x - STROLL_FROM) / (STROLL_TO - STROLL_FROM) : (STROLL_TO - p.x) / (STROLL_TO - STROLL_FROM);
  const from = direction === 'r' ? STROLL_FROM - p.x : STROLL_TO - p.x;
  const to = direction === 'r' ? STROLL_TO - p.x : STROLL_FROM - p.x;
  return {
    '--ls-dur': `${duration.toFixed(1)}s`,
    '--ls-delay': `${(-duration * progress).toFixed(1)}s`,
    '--ls-from': `${from}px`,
    '--ls-to': `${to}px`,
  } as CSSProperties;
}

// Passengers waiting on the pavement for the stopping car, and what they look like.
const PICKUP_START: ReadonlyArray<number> = [246, 256, 266, 276, 286, 296];
const PICKUP_LOOK: ReadonlyArray<{ readonly shirt: string; readonly skin: string }> = [
  { shirt: '#e84393', skin: '#f1c27d' },
  { shirt: '#0984e3', skin: '#c68642' },
  { shirt: '#00b894', skin: '#e0ac69' },
  { shirt: '#fdcb6e', skin: '#8d5524' },
  { shirt: '#6c5ce7', skin: '#f1c27d' },
  { shirt: '#d63031', skin: '#e0ac69' },
];

interface SidePlaneProps {
  readonly tail: string;
  readonly label?: string;
}

// Side-view jet facing right, centred on its fuselage. Wheels sit about 10 units below the origin.
export function SidePlane({ tail, label }: SidePlaneProps) {
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

type HatKind = 'cap' | 'hat' | 'none';
type PackKind = 'ransel' | 'koper' | 'none';

interface PersonProps {
  readonly shirt: string;
  readonly pants: string;
  readonly skin: string;
  readonly hair?: string;
  readonly hat?: HatKind;
  readonly hatColor?: string;
  readonly pack?: PackKind;
  readonly packColor?: string;
  /** Swing legs and arms (login.css); the swing angle comes from the --swing CSS variable. */
  readonly walking?: boolean;
  /** 1 faces right (default), -1 faces left. */
  readonly facing?: 1 | -1;
}

const HAIR_COLORS: ReadonlyArray<string> = ['#1b1b1b', '#3b2a1c', '#6b4a2b', '#c9a25a', '#8a8a8a'];
const HAT_COLORS: ReadonlyArray<string> = ['#d63031', '#0984e3', '#2d3436', '#f1c40f', '#00b894'];
const PACK_COLORS: ReadonlyArray<string> = ['#c0392b', '#1d4f91', '#2d3436', '#6c5ce7', '#d35400'];

function colourHash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) % 9973;
  return h;
}

// A human hand, five fingers fanned downward from the palm.
function Hand({ x, y, skin }: { readonly x: number; readonly y: number; readonly skin: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g stroke={skin} strokeWidth="0.32" strokeLinecap="round" fill="none">
        <path d="M-0.7 0.4 L-1.5 1.5" />
        <path d="M-0.4 0.7 L-0.7 2" />
        <path d="M0 0.8 L0 2.2" />
        <path d="M0.4 0.7 L0.7 2" />
        <path d="M0.7 0.4 L1.4 1.4" />
      </g>
      <ellipse cx="0" cy="0" rx="0.95" ry="0.8" fill={skin} />
    </g>
  );
}

interface SuitcaseProps {
  readonly color: string;
  /** Sleeve colour and skin: draws the arm that pulls the suitcase by its handle. */
  readonly arm?: string;
  readonly skin?: string;
}

// Rolling suitcase pulled along behind a person who faces right.
export function Suitcase({ color, arm, skin }: SuitcaseProps) {
  return (
    <g>
      {arm ? <path d="M-0.3 -11.4 L-4.8 -9.6" stroke={arm} strokeWidth="1.5" strokeLinecap="round" /> : null}
      <path d="M-5.6 -8 V-9.6" stroke="#1d2023" strokeWidth="0.5" />
      <rect x="-9.6" y="-8" width="5.2" height="7.2" rx="0.9" fill={color} stroke="#1d2023" strokeWidth="0.25" />
      <rect x="-9.6" y="-5.6" width="5.2" height="0.6" fill="#ffffff" opacity="0.5" />
      <circle cx="-8.6" cy="-0.5" r="0.6" fill="#1d2023" />
      <circle cx="-5.4" cy="-0.5" r="0.6" fill="#1d2023" />
      {arm && skin ? <ellipse cx="-5.2" cy="-9.4" rx="0.9" ry="0.8" fill={skin} /> : null}
    </g>
  );
}

// Person seen from the side, with eyes, a nose, optional cap or hat, five-finger hands and
// optionally a backpack or rolling suitcase. Variety (hair, hat, bag) is derived from the clothes
// unless set explicitly. Feet at the origin, about 20 units tall; faces right unless `facing` is -1.
export function Person({ shirt, pants, skin, hair, hat, hatColor, pack, packColor, walking = false, facing = 1 }: PersonProps) {
  const h = colourHash(`${shirt}${pants}`);
  const hairColor = hair ?? HAIR_COLORS[h % HAIR_COLORS.length] ?? '#1b1b1b';
  const hatKind: HatKind = hat ?? (h % 4 === 0 ? 'cap' : h % 7 === 0 ? 'hat' : 'none');
  const hatTint = hatColor ?? HAT_COLORS[(h >> 2) % HAT_COLORS.length] ?? '#2d3436';
  const packKind: PackKind = pack ?? (h % 5 === 1 ? 'ransel' : h % 5 === 2 ? 'koper' : 'none');
  const packTint = packColor ?? PACK_COLORS[(h >> 1) % PACK_COLORS.length] ?? '#1d4f91';
  const pullsSuitcase = packKind === 'koper';

  return (
    <g className={walking ? 'person person--walking' : 'person'} transform={facing === -1 ? 'scale(-1 1)' : undefined}>
      {packKind === 'ransel' ? <rect x="-5.6" y="-12.6" width="4.4" height="7.4" rx="1.7" fill={packTint} /> : null}
      {pullsSuitcase ? <Suitcase color={packTint} arm={shirt} skin={skin} /> : null}

      {/* Far arm and leg */}
      <g className="person__arm-b">
        <rect x="-0.8" y="-12" width="1.5" height="5.6" rx="0.7" fill={shirt} opacity="0.8" />
        <Hand x={0} y={-5.7} skin={skin} />
      </g>
      <g className="person__leg-b">
        <rect x="-1.1" y="-6.6" width="2.2" height="5.6" fill={pants} opacity="0.85" />
        <rect x="-1.1" y="-1" width="3.6" height="1" rx="0.4" fill="#2b2f34" />
      </g>

      {/* Near leg, torso and near arm */}
      <g className="person__leg-a">
        <rect x="-1.1" y="-6.6" width="2.2" height="5.6" fill={pants} />
        <rect x="-1.1" y="-1" width="3.6" height="1" rx="0.4" fill="#2b2f34" />
      </g>
      <rect x="-2.6" y="-12.4" width="5.2" height="6.4" rx="1.8" fill={shirt} />
      {packKind === 'ransel' ? <rect x="-2.4" y="-12.2" width="0.9" height="5.6" fill={packTint} /> : null}
      {pullsSuitcase ? null : (
        <g className="person__arm-a">
          <rect x="-0.8" y="-12" width="1.6" height="5.8" rx="0.7" fill={shirt} />
          <Hand x={0} y={-5.7} skin={skin} />
        </g>
      )}

      {/* Head in profile: ear, nose, one eye, mouth, hair and any hat */}
      <rect x="-0.6" y="-13.4" width="1.6" height="1.4" fill={skin} />
      <circle cx="0.5" cy="-16.4" r="3" fill={skin} />
      <path d="M3.3 -16.6 L4.6 -15.4 L3.3 -15 Z" fill={skin} stroke="#00000022" strokeWidth="0.2" />
      <path d="M-2.6 -15.4 Q-3 -19.6 0.6 -19.6 Q3.5 -19.4 3.4 -17.2 Q1.2 -18.5 -0.6 -17.6 Q-1.6 -16.8 -1.8 -15 Z" fill={hairColor} />
      <circle cx="-0.7" cy="-16" r="0.75" fill={skin} stroke="#00000033" strokeWidth="0.2" />
      <ellipse cx="1.9" cy="-16.5" rx="0.8" ry="0.85" fill="#ffffff" />
      <circle cx="2.2" cy="-16.5" r="0.43" fill="#1b1b1b" />
      <path d="M1.2 -17.5 L2.7 -17.7" stroke={hairColor} strokeWidth="0.3" strokeLinecap="round" />
      <path d="M2.2 -14.6 L3.3 -14.7" stroke="#7a3b2e" strokeWidth="0.3" strokeLinecap="round" />
      {hatKind === 'cap' ? (
        <g>
          <path d="M-2.9 -18.2 Q0.7 -22.8 3.7 -18.4 Z" fill={hatTint} />
          <rect x="2.6" y="-18.7" width="3.6" height="0.9" rx="0.4" fill={hatTint} stroke="#00000033" strokeWidth="0.2" />
        </g>
      ) : null}
      {hatKind === 'hat' ? (
        <g>
          <rect x="-2.2" y="-21.5" width="5.4" height="3" rx="1.2" fill={hatTint} />
          <ellipse cx="0.5" cy="-18.6" rx="5" ry="1" fill={hatTint} stroke="#00000033" strokeWidth="0.2" />
        </g>
      ) : null}
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
export function Bus({ color, accent, operator, name, mirrored }: BusProps) {
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
export function Suv({ color, label, mirrored }: { readonly color: string; readonly label: string; readonly mirrored: boolean }) {
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
