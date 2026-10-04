import { useEffect, useRef, useState, type CSSProperties } from 'react';
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

const HORIZON = 124;
const RUNWAY_BOTTOM = 266;
const RUNWAY_CX = 210;
const RUNWAY_HALF_TOP = 9;
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
const CENTER_DASHES: ReadonlyArray<string> = Array.from({ length: 15 }, (_, i) => {
  const t0 = (i / 15) ** 1.8;
  const t1 = t0 + (((i + 1) / 15) ** 1.8 - t0) * 0.55;
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
  { length: 14 },
  (_, i) => {
    const t = ((i + 0.5) / 14) ** 1.6;
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
  /** Called once the last aircraft on the left apron has taken off. */
  readonly onLeftApronEmpty: () => void;
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
  return bay < Math.min(cycle, BAYS.length) ? bay : null;
}

// Landing number 8 (the Prima Husada aircraft, the last to land) does not take a bay: it parks on
// the taxi lane above the eight bays and stays there. Keep in step with login-landing-side-8.
const LAST_LANDING = BAYS.length;
const LAST_PARKING = { x: 382, y: 169, scale: 0.62 };

interface ParkedPlane {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly tail: string;
  readonly name: string;
}

// The left apron starts with eight aircraft: seven parked ones, listed in the order they move up and
// leave, plus the one already waiting on the taxiway. Every take-off removes one, so the apron is
// empty once the right-hand bays are full. (Fictional liveries.)
const LEFT_FLEET: ReadonlyArray<ParkedPlane> = [
  { x: 72, y: 214, scale: 0.62, tail: '#d62828', name: 'SAKURA AIR' },
  { x: 26, y: 214, scale: 0.62, tail: '#f39c12', name: 'SUNRISE' },
  { x: 96, y: 192, scale: 0.7, tail: '#e67e22', name: 'LION WINGS' },
  { x: 46, y: 192, scale: 0.7, tail: '#16a085', name: 'ALPINE AIR' },
  { x: -2, y: 192, scale: 0.7, tail: '#0984e3', name: 'BLUE ORCA' },
  { x: 28, y: 166, scale: 0.8, tail: '#8e44ad', name: 'ORIENT STAR' },
  { x: 100, y: 170, scale: 1, tail: '#1d6fc4', name: 'PRIMA HUSADA' },
];

const WAITING_AT_START: Airline = { name: 'NORDIC SKY', tail: '#1f5fbf' };

// Aircraft waiting on the left taxiway during take-off cycle `cycle` (the first is Nordic Sky;
// after that each cycle the next parked aircraft moves up). Null once the apron is empty.
function waitingAirline(cycle: number): Airline | null {
  if (cycle < 0 || cycle > LEFT_FLEET.length) return null;
  if (cycle === 0) return WAITING_AT_START;
  const plane = LEFT_FLEET[cycle - 1];
  return plane ? { name: plane.name, tail: plane.tail } : null;
}

export function LoginScene({ arrival, onArrivalEnd, onLeftApronEmpty }: LoginSceneProps) {
  // Bumped each time the 30s take-off cycle restarts, i.e. right after one airline has departed.
  const [departures, setDepartures] = useState(0);
  const apronEmptyRef = useRef(onLeftApronEmpty);
  apronEmptyRef.current = onLeftApronEmpty;
  // The waiting plane plus the whole fleet have left once the final take-off has finished.
  const apronEmpty = departures >= LEFT_FLEET.length + 2;
  useEffect(() => {
    if (apronEmpty) apronEmptyRef.current();
  }, [apronEmpty]);
  const waiting = waitingAirline(departures);
  const leaving = waitingAirline(departures - 1);
  // The aircraft that waited in the previous cycle takes off now; none before the first or after the last.
  const takeoffVisible = leaving !== null && departures >= 1;

  return (
    <div className="login-stage" aria-hidden>
    <div
      className={arrival ? 'login-scene login-scene--away' : 'login-scene'}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onArrivalEnd();
      }}
    >
      <svg viewBox="0 0 640 413" preserveAspectRatio="xMidYMax slice" className="login-scene__svg">
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
            <stop offset="0%" stopColor="#5fa56a" />
            <stop offset="100%" stopColor="#a9d6a0" />
          </linearGradient>
          <linearGradient id="ls-hills" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3f8f4c" />
            <stop offset="100%" stopColor="#7cc276" />
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

          {/* Green mountains fade into haze */}
          <path d="M-60 128 L-20 96 L10 108 L60 70 L110 104 L150 90 L200 112 L260 84 L300 100 L360 78 L420 100 L470 80 L540 104 V130 H-60 Z" fill="url(#ls-hills-far)" />
          <path d="M-60 128 L6 64 L34 84 L58 70 L112 128 Z" fill="#3a8a48" />
          <path d="M6 64 L34 84 L24 100 L8 90 Z" fill="#2f7a3e" opacity="0.7" />
          <path d="M296 128 L372 50 L394 70 L418 56 L500 128 Z" fill="#3a8a48" />
          <path d="M372 50 L394 70 L384 92 L366 78 Z" fill="#2f7a3e" opacity="0.7" />
          <path d="M418 56 L450 86 L430 110 L412 84 Z" fill="#56a85c" opacity="0.7" />
          <g fill="#276b35" opacity="0.55">
            {[[380, 96], [392, 104], [402, 92], [426, 104], [440, 112], [356, 108], [344, 116], [20, 98], [34, 106], [50, 112], [8, 108]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" />
            ))}
          </g>
          <path d="M-60 132 Q0 110 70 122 T210 120 T350 122 T540 118 V132 H-60 Z" fill="url(#ls-hills)" />
          <rect x={WIDE_L} y="118" width={WIDE_W} height="14" fill="#e6f5e8" opacity="0.35" />

          {/* Ground: grass, then concrete aprons either side of the runway */}
          <rect x={WIDE_L} y={HORIZON} width={WIDE_W} height={310 - HORIZON} fill="url(#ls-grass)" />
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
            <line x1="120" y1="99" x2="120" y2="81" stroke="#7a8794" strokeWidth="0.8" />
            <g className="login-scene__flag">
              <rect x="120" y="81.5" width="15" height="4.5" fill="#e5222b" />
              <rect x="120" y="86" width="15" height="4.5" fill="#ffffff" stroke="#c9d1d8" strokeWidth="0.25" />
            </g>
            <g transform="translate(120 109) scale(0.2)">
              <GarudaEmblem />
            </g>
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
          {/* Aircraft parked on the left; one leaves each cycle until none are left */}
          {LEFT_FLEET.slice(Math.min(departures, LEFT_FLEET.length)).map((plane) => (
            <g key={plane.name} transform={`translate(${plane.x} ${plane.y}) scale(${plane.scale})`} filter="url(#ls-shadow)">
              <SidePlane tail={plane.tail} label={plane.name} />
            </g>
          ))}
          {waiting ? (
            <g transform="translate(46 236) scale(0.6)">
              <g className="login-scene__departing">
                <SidePlane tail={waiting.tail} label={waiting.name} />
              </g>
            </g>
          ) : null}
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
            style={{ visibility: takeoffVisible ? 'visible' : 'hidden' }}
            onAnimationIteration={(event) => {
              if (event.target === event.currentTarget) setDepartures((count) => count + 1);
            }}
          >
            <PlaneRear tail={leaving?.tail ?? '#1d6fc4'} />
          </g>
          <g className="login-scene__landing" style={{ visibility: departures > LAST_LANDING ? 'hidden' : 'visible' }}>
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
          {departures <= LAST_LANDING ? (
            <g
              key={departures}
              className={`login-scene__landing-side login-scene__landing-side--${departures}`}
              style={{ animationDelay: departures === 0 ? '-3s' : '0s' }}
            >
              <SidePlane tail={departingAirline(departures).tail} label={departingAirline(departures).name} />
            </g>
          ) : (
            <g transform={`translate(${LAST_PARKING.x} ${LAST_PARKING.y}) scale(${LAST_PARKING.scale})`}>
              <SidePlane tail={departingAirline(LAST_LANDING).tail} label={departingAirline(LAST_LANDING).name} />
            </g>
          )}

          {/* Row of buildings across the road from the pavement walkers, with coconut palms in front */}
          <CityRow />

          {/* Forecourt (moved down to make room for the buildings): planting, lamps, road with cars, pavement with people */}
          <g transform="translate(0 44)">
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
                  <Person shirt={p.shirt} pants={p.pants} skin={p.skin} outfit={OUTFITS[i % OUTFITS.length]} walking={direction !== undefined} facing={facing} />
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
                outfit={OUTFITS[(i + 1) % OUTFITS.length]}
                pack={i % 2 === 0 ? 'koper' : 'ransel'}
                walking
                facing={i < 3 ? 1 : -1}
              />
            </g>
          ))}
          </g>
        </g>
      </svg>
    </div>
    {arrival ? <LoginArrival /> : null}
    </div>
  );
}

interface WingsProps {
  readonly dark?: boolean;
  /** Shows the red and green wing-tip lights; the value is the side (1 right, -1 left on screen) that carries the red one. */
  readonly nav?: 1 | -1;
}

// Swept wings and engines seen head-on or from behind; wingspan is 100 units.
function Wings({ dark = false, nav }: WingsProps) {
  return (
    <g>
      {nav
        ? ([1, -1] as const).map((side) => {
            const colour = side === nav ? '#ff2b2b' : '#27e06a';
            return (
              <g key={`nav${side}`} className="login-scene__nav">
                <circle cx={side * 50} cy="-16" r="5" fill={colour} opacity="0.45" />
                <circle cx={side * 50} cy="-16" r="1.4" fill={colour} />
              </g>
            );
          })
        : null}
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
      <Wings nav={-1} />
      <path d="M-20 -19.5 L0 -21.5 L20 -19.5 L0 -16.5 Z" fill="#d3dce5" stroke="#9fb0c0" strokeWidth="0.3" />
      <ellipse cx="0" cy="-12" rx="7.6" ry="8.6" fill="url(#ls-fuselage-h)" stroke="#9fb0c0" strokeWidth="0.4" />
      <path d="M-2.6 -18 L-1.6 -45 L1.6 -45 L2.6 -18 Z" fill={tail} />
      <rect x="-1.9" y="-45.8" width="3.8" height="1.6" rx="0.6" fill="#f1c40f" />
      <circle cx="0" cy="-9" r="1.6" fill="#59636d" />
      {/* Engine fire seen from behind: a flickering orange cone, a white-hot core and flying sparks */}
      {[-17, 17].map((x, i) => (
        <g key={x}>
          <circle className="login-scene__thrust" cx={x} cy="-6" r="9" fill="url(#ls-thrust)" />
          <ellipse className="login-scene__flame" cx={x} cy="-6" rx="4.4" ry="5.2" fill="#ff7a1a" />
          <ellipse className="login-scene__flame login-scene__flame--core" cx={x} cy="-6" rx="2.6" ry="3.2" fill="#ffd34d" />
          <circle className="login-scene__flame login-scene__flame--hot" cx={x} cy="-6" r="1.3" fill="#fffbe6" />
          {[0, 1, 2].map((k) => (
            <circle
              key={k}
              className="login-scene__spark"
              cx={x + (k - 1) * 3.2}
              cy={-6 + (k % 2 === 0 ? -3.6 : 3.4)}
              r="0.7"
              fill="#ffe08a"
              style={{ animationDelay: `${(i * 3 + k) * 0.13}s` }}
            />
          ))}
        </g>
      ))}
      <circle cx="0" cy="-46" r="5" fill="url(#ls-glow)" />
      <circle className="login-scene__strobe" cx="0" cy="-46" r="1.6" fill="#ffffff" />
      <circle cx="0" cy="-17" r="1.1" fill="#ff3b3b" className="login-scene__nav" />
    </g>
  );
}

// Jet seen head-on (landing). Origin sits at the wheels.
function PlaneFront({ tail }: TailProps) {
  return (
    <g>
      <path d="M-2.4 -19 L-1.5 -36 L1.5 -36 L2.4 -19 Z" fill={tail} />
      <Gear />
      <Wings dark nav={1} />
      <ellipse cx="0" cy="-12" rx="7.6" ry="8.6" fill="url(#ls-fuselage-h)" stroke="#9fb0c0" strokeWidth="0.4" />
      <path d="M-5 -15.5 Q0 -19.5 5 -15.5 L3.6 -12.4 Q0 -13.8 -3.6 -12.4 Z" fill="#8cc4ea" />
      {[-2.1, 2.1].map((px) => (
        <g key={px}>
          <path d={`M${px - 1.7} -12.9 Q${px} -14.2 ${px + 1.7} -12.9 L${px + 1.5} -12.5 H${px - 1.5} Z`} fill="#ffffff" />
          <circle cx={px} cy="-14.5" r="1.2" fill="#e0ac69" />
          <path d={`M${px - 1.4} -15.1 Q${px} -17.3 ${px + 1.4} -15.1 Z`} fill="#1d2a44" />
          <circle cx={px - 0.55} cy="-14.6" r="0.46" fill="none" stroke="#111111" strokeWidth="0.2" />
          <circle cx={px + 0.55} cy="-14.6" r="0.46" fill="none" stroke="#111111" strokeWidth="0.2" />
          <path d={`M${px - 0.1} -14.6 h0.2`} stroke="#111111" strokeWidth="0.2" />
        </g>
      ))}
      <path d="M0 -17.6 V-13" stroke="#5d7488" strokeWidth="0.4" />
      {[-9, 9].map((x) => (
        <g key={x}>
          <circle className="login-scene__landing-light" cx={x} cy="-8" r="8" fill="url(#ls-glow)" />
          <circle cx={x} cy="-8" r="1.4" fill="#fffbe0" />
        </g>
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
      <path d="M22 -6 Q29 -5 31 -1 H22 Z" fill="#8cc4ea" />
      {[24, 27.2].map((hx, i) => (
        <g key={hx} opacity={i === 0 ? 0.8 : 1}>
          <circle cx={hx} cy="-2.8" r="1.25" fill="#e0ac69" />
          <path d={`M${hx - 1.4} -3.4 Q${hx} -5.2 ${hx + 1.5} -3.4 Z`} fill="#1d2a44" />
          <circle cx={hx + 0.75} cy="-2.9" r="0.5" fill="none" stroke="#111111" strokeWidth="0.22" />
          <path d={`M${hx + 0.25} -2.9 h-1.2`} stroke="#111111" strokeWidth="0.2" />
        </g>
      ))}
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
type Outfit = 'plain' | 'colorful' | 'jersey' | 'casual';

const OUTFITS: ReadonlyArray<Outfit> = ['colorful', 'jersey', 'casual', 'plain'];
const ACCENTS: ReadonlyArray<string> = ['#ff5a5f', '#ffd23f', '#3bceac', '#5b8def', '#ff8c42', '#b36bff'];
const JEANS = '#3b5b92';

interface PersonProps {
  readonly shirt: string;
  readonly pants: string;
  readonly skin: string;
  readonly hair?: string;
  /** Clothes: colourful batik-style, football jersey, casual tee and jeans, or a plain shirt. */
  readonly outfit?: Outfit;
  /** 'f' draws long hair and a dress, 'm' short hair and trousers; derived from the clothes when omitted. */
  readonly gender?: 'm' | 'f';
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

interface LegProps {
  readonly kind: Outfit;
  readonly fill: string;
  readonly skin: string;
  readonly sock: string;
  readonly opacity: number;
}

// One leg and shoe; the jersey outfit has white shorts, bare knees and socks in the shirt colour.
function Leg({ kind, fill, skin, sock, opacity }: LegProps) {
  return (
    <g opacity={opacity}>
      {kind === 'jersey' ? (
        <g>
          <rect x="-1.2" y="-6.6" width="2.4" height="2.8" fill="#f4f4f4" />
          <rect x="-1.1" y="-3.8" width="2.2" height="2" fill={skin} />
          <rect x="-1.1" y="-1.8" width="2.2" height="0.9" fill={sock} />
        </g>
      ) : (
        <rect x="-1.1" y="-6.6" width="2.2" height="5.6" fill={fill} />
      )}
      <rect x="-1.1" y="-1" width="3.6" height="1" rx="0.4" fill={kind === 'casual' ? '#ffffff' : '#2b2f34'} />
    </g>
  );
}

// Garuda Pancasila, painted gold on a red disc with a white ring (flattened by the caller to lie on the ground).
function GarudaEmblem() {
  const wing = 'M-7 -6 L-26 -22 L-22 -12 L-30 -10 L-24 -4 L-32 0 L-24 4 L-30 10 L-20 12 L-9 12 Z';
  return (
    <g>
      <circle r="44" fill="#ffffff" />
      <circle r="40" fill="#b3121b" />
      <g fill="#f2c230" stroke="#b8860b" strokeWidth="0.8" strokeLinejoin="round">
        <path d={wing} />
        <path d={wing} transform="scale(-1 1)" />
        <path d="M-9 14 L-12 34 L-4 30 L0 36 L4 30 L12 34 L9 14 Z" />
        <ellipse cx="0" cy="2" rx="9" ry="17" />
        <circle cx="2" cy="-19" r="6" />
        <path d="M6 -21 L14 -17 L6 -14 Z" />
        <path d="M-2 -25 L1 -30 L4 -25 Z" />
        <path d="M-8 18 L-14 30 M8 18 L14 30" fill="none" strokeWidth="2" />
      </g>
      <path d="M-7 -5 H7 V8 Q0 17 -7 8 Z" fill="#c0161b" stroke="#ffffff" strokeWidth="1" />
      <path d="M0 -2 L1.2 1 L4.4 1 L1.8 3 L2.8 6 L0 4 L-2.8 6 L-1.8 3 L-4.4 1 L-1.2 1 Z" fill="#f2c230" />
      <path d="M-26 22 Q0 32 26 22 L26 27 Q0 37 -26 27 Z" fill="#ffffff" stroke="#b8860b" strokeWidth="0.6" />
    </g>
  );
}

// Coconut palm: leaning trunk, a crown of swaying fronds and a few coconuts.
function Palm({ x, y, scale = 1, lean = 5 }: { readonly x: number; readonly y: number; readonly scale?: number; readonly lean?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={`M0 0 Q${lean * 0.2} -24 ${lean} -46`} fill="none" stroke="#8b6b3d" strokeWidth="2.4" strokeLinecap="round" />
      <g transform={`translate(${lean} -46)`} className="login-scene__frond">
        {[-150, -115, -75, -35, -5, 25, 70, 110].map((deg) => (
          <path
            key={deg}
            d="M0 0 Q11 -8 22 4 Q11 -1 0 1.4 Z"
            fill={deg % 2 === 0 ? '#2f8f3a' : '#43a948'}
            transform={`rotate(${deg})`}
          />
        ))}
        <circle cx="-1.2" cy="1.4" r="1.5" fill="#6b4a22" />
        <circle cx="1.4" cy="1.6" r="1.5" fill="#7a5527" />
      </g>
    </g>
  );
}

const BASE = 306;

function Mosque({ x }: { readonly x: number }) {
  return (
    <g transform={`translate(${x} ${BASE})`}>
      <rect x="0" y="-22" width="44" height="22" fill="#f6efe0" />
      <rect x="0" y="-23.5" width="44" height="2" fill="#c9a24a" />
      <path d="M8 -23 Q22 -52 36 -23 Z" fill="#2f9e6e" />
      <path d="M21.3 -44 V-52" stroke="#c9a24a" strokeWidth="1.2" />
      <circle cx="22" cy="-53" r="1.3" fill="#f1c40f" />
      {[-8, 46].map((mx) => (
        <g key={mx}>
          <rect x={mx} y="-46" width="6" height="46" fill="#f6efe0" />
          <rect x={mx - 1} y="-47" width="8" height="2" fill="#c9a24a" />
          <path d={`M${mx - 0.5} -47 L${mx + 3} -58 L${mx + 6.5} -47 Z`} fill="#2f9e6e" />
        </g>
      ))}
      {[5, 17, 29].map((wx) => (
        <path key={wx} d={`M${wx} -1 V-11 Q${wx + 4.5} -17 ${wx + 9} -11 V-1 Z`} fill="#4b8fcf" stroke="#c9a24a" strokeWidth="0.5" />
      ))}
    </g>
  );
}

function Joglo({ x }: { readonly x: number }) {
  return (
    <g transform={`translate(${x} ${BASE})`}>
      <rect x="0" y="-14" width="46" height="14" fill="#e8d3a8" />
      {[4, 14, 24, 34].map((cx) => (
        <rect key={cx} x={cx} y="-14" width="2.4" height="14" fill="#7a4a2a" />
      ))}
      <rect x="19" y="-10" width="9" height="10" fill="#5a3418" />
      <path d="M-5 -14 L10 -27 H36 L51 -14 Z" fill="#b24a2e" />
      <path d="M12 -27 L18 -38 H28 L34 -27 Z" fill="#8f3a26" />
      <path d="M17 -38 L23 -43 L29 -38 Z" fill="#6f2c1c" />
    </g>
  );
}

function Hotel({ x }: { readonly x: number }) {
  return (
    <g transform={`translate(${x} ${BASE})`}>
      <rect x="0" y="-48" width="40" height="48" fill="#dfe7ef" />
      <rect x="0" y="-52" width="40" height="5" fill="#1d4f91" />
      <text x="20" y="-48" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="4" fontWeight="700" fill="#ffffff">HOTEL NUSANTARA</text>
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect key={`${row}-${col}`} x={4 + col * 9} y={-43 + row * 8} width="6" height="5" fill={(row + col) % 3 === 0 ? '#ffe9a6' : '#4b8fcf'} />
        )),
      )}
      <rect x="15" y="-6" width="10" height="6" fill="#3a444d" />
    </g>
  );
}

function Shophouses({ x }: { readonly x: number }) {
  const colours: ReadonlyArray<string> = ['#f2c6a0', '#bfe0c4', '#f6e08a'];
  return (
    <g transform={`translate(${x} ${BASE})`}>
      {colours.map((c, i) => (
        <g key={c} transform={`translate(${i * 26} 0)`}>
          <rect x="0" y="-32" width="26" height="32" fill={c} stroke="#00000022" strokeWidth="0.4" />
          <rect x="-1" y="-34" width="28" height="3" fill="#8a6a4a" />
          {[3, 15].map((wx) => (
            <rect key={wx} x={wx} y="-27" width="8" height="8" fill="#4b8fcf" stroke="#ffffff" strokeWidth="0.6" />
          ))}
          <path d="M0 -14 H26 L24 -10 H2 Z" fill={i % 2 === 0 ? '#d63031' : '#0984e3'} />
          <rect x="3" y="-10" width="20" height="10" fill="#3a444d" opacity="0.85" />
        </g>
      ))}
    </g>
  );
}

function RumahGadang({ x }: { readonly x: number }) {
  return (
    <g transform={`translate(${x} ${BASE})`}>
      <rect x="6" y="-12" width="46" height="12" fill="#6b3f26" />
      {[10, 20, 30, 40].map((cx) => (
        <rect key={cx} x={cx} y="-12" width="2" height="12" fill="#d9a441" />
      ))}
      <path d="M-2 -12 Q4 -22 8 -28 Q12 -34 12 -42 Q19 -31 29 -31 Q39 -31 46 -42 Q46 -34 50 -28 Q54 -22 60 -12 Z" fill="#7a3b24" stroke="#d9a441" strokeWidth="0.8" />
      <path d="M12 -42 Q15 -46 17 -40 M46 -42 Q43 -46 41 -40" fill="none" stroke="#d9a441" strokeWidth="0.8" />
    </g>
  );
}

function GlassTower({ x }: { readonly x: number }) {
  return (
    <g transform={`translate(${x} ${BASE})`}>
      <rect x="0" y="-54" width="30" height="54" fill="url(#ls-glass)" stroke="#8fa0b2" strokeWidth="0.5" />
      {[1, 2, 3, 4, 5, 6, 7, 8].map((r) => (
        <rect key={r} x="0" y={-54 + r * 6} width="30" height="0.6" fill="#e8f4ff" opacity="0.8" />
      ))}
      {[10, 20].map((c) => (
        <rect key={c} x={c} y="-54" width="0.6" height="54" fill="#e8f4ff" opacity="0.6" />
      ))}
      <path d="M15 -54 V-64" stroke="#8a97a3" strokeWidth="0.8" />
      <circle className="login-scene__beacon" cx="15" cy="-64.5" r="1.1" fill="#ff4d4d" />
    </g>
  );
}

function Colonial({ x }: { readonly x: number }) {
  return (
    <g transform={`translate(${x} ${BASE})`}>
      <rect x="0" y="-26" width="60" height="26" fill="#f3e9d2" />
      <path d="M14 -26 L30 -38 L46 -26 Z" fill="#f8f1e0" stroke="#c9a24a" strokeWidth="0.6" />
      <rect x="0" y="-27.5" width="60" height="2" fill="#b24a2e" />
      {[16, 22, 28, 34, 40].map((cx) => (
        <rect key={cx} x={cx} y="-24" width="2.2" height="24" fill="#ffffff" stroke="#d6cbb0" strokeWidth="0.3" />
      ))}
      {[3, 48].map((wx) => (
        <rect key={wx} x={wx} y="-18" width="8" height="10" fill="#4b8fcf" stroke="#ffffff" strokeWidth="0.7" />
      ))}
    </g>
  );
}

// The street frontage opposite the pavement, from left to right, with coconut palms in front.
function CityRow() {
  return (
    <g>
      <Mosque x={-32} />
      <Joglo x={80} />
      <Hotel x={140} />
      <Shophouses x={188} />
      <RumahGadang x={276} />
      <GlassTower x={346} />
      <Colonial x={390} />
      <Shophouses x={456} />
      {[-42, 66, 134, 184, 268, 338, 384, 452, 540].map((px, i) => (
        <Palm key={px} x={px} y={309 + (i % 2)} scale={0.9 + (i % 3) * 0.12} lean={i % 2 === 0 ? 5 : -5} />
      ))}
    </g>
  );
}

// Person seen from the side, with eyes, a nose, optional cap or hat, five-finger hands and
// optionally a backpack or rolling suitcase. Variety (hair, hat, bag) is derived from the clothes
// unless set explicitly. Feet at the origin, about 20 units tall; faces right unless `facing` is -1.
export function Person({ shirt, pants, skin, hair, outfit, gender, hat, hatColor, pack, packColor, walking = false, facing = 1 }: PersonProps) {
  const h = colourHash(`${shirt}${pants}`);
  const hairColor = hair ?? HAIR_COLORS[h % HAIR_COLORS.length] ?? '#1b1b1b';
  const hatKind: HatKind = hat ?? (h % 4 === 0 ? 'cap' : h % 7 === 0 ? 'hat' : 'none');
  const hatTint = hatColor ?? HAT_COLORS[(h >> 2) % HAT_COLORS.length] ?? '#2d3436';
  const packKind: PackKind = pack ?? (h % 5 === 1 ? 'ransel' : h % 5 === 2 ? 'koper' : 'none');
  const packTint = packColor ?? PACK_COLORS[(h >> 1) % PACK_COLORS.length] ?? '#1d4f91';
  const pullsSuitcase = packKind === 'koper';
  const female = (gender ?? (h % 2 === 0 ? 'm' : 'f')) === 'f';
  // Long hair comes in different lengths: to the shoulder, mid-back or the waist.
  const hairEnd = -10.4 + ((h >> 3) % 3) * 2.4;
  const outfitKind: Outfit = outfit ?? OUTFITS[(h >> 5) % OUTFITS.length] ?? 'plain';
  const accentA = ACCENTS[(h >> 1) % ACCENTS.length] ?? '#ff5a5f';
  const accentB = ACCENTS[((h >> 1) + 2) % ACCENTS.length] ?? '#ffd23f';
  const shortSleeve = outfitKind === 'jersey' || outfitKind === 'casual';
  // Women wear a dress with the plain and colourful outfits, and shorts or jeans with jersey and casual.
  const skirt = female && (outfitKind === 'plain' || outfitKind === 'colorful');
  const legColor = skirt ? skin : outfitKind === 'casual' ? JEANS : pants;
  const skirtColor = outfitKind === 'colorful' ? accentB : pants;

  return (
    <g className={walking ? 'person person--walking' : 'person'} transform={facing === -1 ? 'scale(-1 1)' : undefined}>
      {packKind === 'ransel' ? <rect x="-5.6" y="-12.6" width="4.4" height="7.4" rx="1.7" fill={packTint} /> : null}
      {pullsSuitcase ? <Suitcase color={packTint} arm={shortSleeve ? skin : shirt} skin={skin} /> : null}

      {/* Far arm and leg */}
      <g className="person__arm-b">
        <rect x="-0.8" y="-12" width="1.5" height="5.6" rx="0.7" fill={shortSleeve ? skin : shirt} opacity="0.8" />
        {shortSleeve ? <rect x="-0.8" y="-12" width="1.5" height="2.6" rx="0.7" fill={shirt} opacity="0.8" /> : null}
        <Hand x={0} y={-5.7} skin={skin} />
      </g>
      <g className="person__leg-b">
        <Leg kind={outfitKind} fill={legColor} skin={skin} sock={shirt} opacity={0.85} />
        <rect x="-1.1" y="-1" width="3.6" height="1" rx="0.4" fill="#2b2f34" />
      </g>

      {/* Near leg, torso and near arm */}
      <g className="person__leg-a">
        <Leg kind={outfitKind} fill={legColor} skin={skin} sock={shirt} opacity={1} />
        <rect x="-1.1" y="-1" width="3.6" height="1" rx="0.4" fill="#2b2f34" />
      </g>
      <rect x="-2.6" y="-12.4" width="5.2" height="6.4" rx="1.8" fill={shirt} />
      {outfitKind === 'colorful' ? (
        <g>
          <rect x="-2.5" y="-11.4" width="5" height="0.9" fill={accentA} />
          <rect x="-2.5" y="-9.6" width="5" height="0.9" fill={accentB} />
          <rect x="-2.5" y="-7.8" width="5" height="0.9" fill={accentA} />
          <circle cx="-1.1" cy="-10.3" r="0.35" fill="#ffffff" />
          <circle cx="1.2" cy="-8.6" r="0.35" fill="#ffffff" />
        </g>
      ) : null}
      {outfitKind === 'jersey' ? (
        <g>
          {[-1.9, -0.3, 1.3].map((sx) => (
            <rect key={sx} x={sx} y="-12.2" width="0.8" height="5.8" fill="#ffffff" opacity="0.85" />
          ))}
          <path d="M-1.2 -12.4 L0 -10.9 L1.2 -12.4 Z" fill="#ffffff" />
          <circle cx="1.5" cy="-9.8" r="0.5" fill="#ffd23f" />
        </g>
      ) : null}
      {outfitKind === 'casual' ? (
        <g>
          <circle cx="0" cy="-12.4" r="1.1" fill={skin} />
          <rect x="-1.4" y="-10.4" width="2.8" height="2" rx="0.4" fill="#ffffff" opacity="0.85" />
        </g>
      ) : null}
      {skirt ? (
        <g>
          <path d="M-2.4 -8.4 L-3.9 -3.4 L3.9 -3.4 L2.4 -8.4 Z" fill={skirtColor} />
          <rect x="-2.5" y="-8.7" width="5" height="0.7" fill="#ffffff" opacity="0.55" />
        </g>
      ) : null}
      {!skirt && (outfitKind === 'plain' || outfitKind === 'colorful') ? (
        <g>
          <path d="M-1 -12.4 L0 -10.8 L1 -12.4 Z" fill="#ffffff" opacity="0.85" />
          <rect x="-2.6" y="-6.7" width="5.2" height="0.7" fill="#2b2f34" />
        </g>
      ) : null}
      {packKind === 'ransel' ? <rect x="-2.4" y="-12.2" width="0.9" height="5.6" fill={packTint} /> : null}
      {pullsSuitcase ? null : (
        <g className="person__arm-a">
          <rect x="-0.8" y="-12" width="1.6" height="5.8" rx="0.7" fill={shortSleeve ? skin : shirt} />
          {shortSleeve ? <rect x="-0.8" y="-12" width="1.6" height="2.8" rx="0.7" fill={shirt} /> : null}
          <Hand x={0} y={-5.7} skin={skin} />
        </g>
      )}

      {/* Head in profile: ear, nose, one eye, mouth, hair and any hat */}
      <rect x="-0.6" y="-13.4" width="1.6" height="1.4" fill={skin} />
      <circle cx="0.5" cy="-16.4" r="3" fill={skin} />
      <path d="M3.3 -16.6 L4.6 -15.4 L3.3 -15 Z" fill={skin} stroke="#00000022" strokeWidth="0.2" />
      <path d="M-2.6 -15.4 Q-3 -19.6 0.6 -19.6 Q3.5 -19.4 3.4 -17.2 Q1.2 -18.5 -0.6 -17.6 Q-1.6 -16.8 -1.8 -15 Z" fill={hairColor} />
      {female ? (
        <path
          d={`M-2.7 -17.6 Q-4.3 ${(-12.5 + hairEnd) / 2 - 1} -2.2 ${hairEnd} L0.2 ${hairEnd - 0.4} Q-0.9 -13.5 -1.6 -15.4 Z`}
          fill={hairColor}
        />
      ) : null}
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
