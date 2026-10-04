import type { CSSProperties } from 'react';
import { Bus, Person, SidePlane, Suitcase } from './LoginScene.tsx';
import './loginArrival.css';

// Side view shown after the welcome voice: the landed aircraft is met by a DAMRI
// "Prima Husada" bus, passengers walk down the stairs and ride to the waiting
// lounge, walk the baggage corridor to collect their suitcases, climb the stairs
// to the footbridge and cross it to a second DAMRI bus. All story motion is CSS
// (loginArrival.css, one timeline generated from the same numbers used here) so
// it can be paused with the scene.
//
// LoginScene imports this component and this file imports shapes back from
// LoginScene; that cycle is safe because nothing is used at module load time.

interface Passenger {
  readonly shirt: string;
  readonly pants: string;
  readonly skin: string;
  readonly bag: string;
}

const PASSENGERS: ReadonlyArray<Passenger> = [
  { shirt: '#e74c3c', pants: '#2c3e50', skin: '#f1c27d', bag: '#2d3436' },
  { shirt: '#2980b9', pants: '#34495e', skin: '#c68642', bag: '#c0392b' },
  { shirt: '#27ae60', pants: '#1f2d3a', skin: '#e0ac69', bag: '#1d4f91' },
  { shirt: '#f39c12', pants: '#3b3b3b', skin: '#8d5524', bag: '#6c5ce7' },
  { shirt: '#8e44ad', pants: '#2c3e50', skin: '#f1c27d', bag: '#16a085' },
  { shirt: '#16a085', pants: '#2d3436', skin: '#c68642', bag: '#d35400' },
  { shirt: '#e84393', pants: '#2c3e50', skin: '#e0ac69', bag: '#34495e' },
  { shirt: '#0984e3', pants: '#3b3b3b', skin: '#f1c27d', bag: '#b33939' },
];

interface Stander {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly shirt: string;
  readonly pants: string;
  readonly skin: string;
}

// People who are simply there: ground crew, lounge staff and waiting travellers.
const STANDERS: ReadonlyArray<Stander> = [
  { x: 118, y: 338, scale: 1.2, shirt: '#f1c40f', pants: '#2d3436', skin: '#c68642' },
  { x: 300, y: 338, scale: 1.2, shirt: '#e67e22', pants: '#2d3436', skin: '#f1c27d' },
  { x: 283, y: 262, scale: 0.95, shirt: '#1d4f91', pants: '#1f2d3a', skin: '#e0ac69' },
  { x: 372, y: 264, scale: 0.95, shirt: '#e17055', pants: '#2d3436', skin: '#8d5524' },
  { x: 378, y: 264, scale: 0.95, shirt: '#74b9ff', pants: '#2c3e50', skin: '#f1c27d' },
  { x: 492, y: 229, scale: 0.95, shirt: '#a29bfe', pants: '#2d3436', skin: '#c68642' },
  { x: 504, y: 229, scale: 0.95, shirt: '#fab1a0', pants: '#2c3e50', skin: '#f1c27d' },
];

interface Stroller {
  readonly id: string;
  readonly reverse: boolean;
  readonly duration: number;
  readonly delay: number;
  readonly shirt: string;
  readonly pants: string;
  readonly skin: string;
}

// Pavement strollers; the CSS loops them across the scene at different speeds.
const STROLLERS: ReadonlyArray<Stroller> = [
  { id: 's1', reverse: false, duration: 46, delay: -6, shirt: '#00b894', pants: '#34495e', skin: '#f1c27d' },
  { id: 's2', reverse: false, duration: 58, delay: -30, shirt: '#fd79a8', pants: '#2d3436', skin: '#e0ac69' },
  { id: 's3', reverse: false, duration: 50, delay: -44, shirt: '#6c5ce7', pants: '#2c3e50', skin: '#8d5524' },
  { id: 's4', reverse: true, duration: 52, delay: -12, shirt: '#fdcb6e', pants: '#2d3436', skin: '#c68642' },
  { id: 's5', reverse: true, duration: 44, delay: -26, shirt: '#e17055', pants: '#34495e', skin: '#f1c27d' },
  { id: 's6', reverse: true, duration: 60, delay: -40, shirt: '#55efc4', pants: '#2c3e50', skin: '#e0ac69' },
];

function strollTiming(s: Stroller): CSSProperties {
  return { '--ls-dur': `${s.duration}s`, '--ls-delay': `${s.delay}s` } as CSSProperties;
}

const BELT_BAGS: ReadonlyArray<{ readonly x: number; readonly color: string }> = [
  { x: 278, color: '#6c5ce7' },
  { x: 296, color: '#c0392b' },
  { x: 314, color: '#2d3436' },
  { x: 332, color: '#1d4f91' },
  { x: 350, color: '#d35400' },
];

const ZEBRA_STRIPES: ReadonlyArray<number> = Array.from({ length: 8 }, (_, i) => 268 + i * 7.6);
const RAIL_POSTS: ReadonlyArray<number> = Array.from({ length: 12 }, (_, i) => 152 + i * 18);

const STAIR_STEPS: ReadonlyArray<number> = Array.from({ length: 6 }, (_, i) => i);
const HILL_TREES: ReadonlyArray<number> = Array.from({ length: 24 }, (_, i) => i * 28 - 10);
const LAMPS: ReadonlyArray<number> = [60, 220, 380, 540];
const CORRIDOR_LIGHTS: ReadonlyArray<number> = [284, 304, 324, 344, 364, 384];
const BRIDGE_STEPS: ReadonlyArray<number> = Array.from({ length: 7 }, (_, i) => i);
const HALL_STEPS: ReadonlyArray<number> = Array.from({ length: 8 }, (_, i) => i);

export function LoginArrival() {
  return (
    <div className="login-arrival" aria-hidden>
      <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMax slice" className="login-scene__svg">
        <defs>
          <linearGradient id="la-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1670d6" />
            <stop offset="55%" stopColor="#62b4f5" />
            <stop offset="100%" stopColor="#d6efff" />
          </linearGradient>
          <linearGradient id="la-asphalt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a6067" />
            <stop offset="100%" stopColor="#2d3135" />
          </linearGradient>
        </defs>

        {/* Sky, sun, hills and trees */}
        <rect x="-20" y="0" width="680" height="270" fill="url(#la-sky)" />
        <circle cx="520" cy="62" r="52" fill="url(#ls-sun)" />
        <circle cx="520" cy="62" r="12" fill="#fffdf2" />
        <g className="login-scene__clouds" filter="url(#ls-blur-soft)">
          <ellipse cx="90" cy="60" rx="40" ry="9" fill="#ffffff" opacity="0.9" />
          <ellipse cx="116" cy="52" rx="22" ry="9" fill="#ffffff" opacity="0.95" />
          <ellipse cx="300" cy="90" rx="36" ry="6" fill="#f2f7fc" opacity="0.8" />
          <ellipse cx="420" cy="40" rx="30" ry="6" fill="#ffffff" opacity="0.8" />
        </g>
        <path d="M-20 214 L40 190 L110 208 L190 184 L270 206 L360 186 L450 208 L540 188 L660 210 V240 H-20 Z" fill="url(#ls-hills-far)" />
        <path d="M-20 222 Q80 200 180 216 T380 214 T660 218 V250 H-20 Z" fill="url(#ls-hills)" />
        <rect x="-20" y="236" width="680" height="30" fill="url(#ls-grass)" />
        <g fill="#24562c">
          {HILL_TREES.map((x) => (
            <ellipse key={x} cx={x} cy={238 - ((x * 7) % 5)} rx="9" ry="11" />
          ))}
        </g>

        <g transform="translate(18 0)">
          {/* Waiting lounge: a cut-away so the baggage corridor and its passengers show */}
          <g filter="url(#ls-shadow)">
            <rect x="268" y="172" width="142" height="92" fill="#eaf3fb" />
            <rect x="268" y="172" width="142" height="10" fill="#cfe2f2" />
            <path d="M262 176 L268 166 H410 L416 176 Z" fill="#1d4f91" />
            <rect x="262" y="174" width="154" height="4" rx="1.5" fill="#143d73" />
            <rect x="268" y="178" width="5" height="86" fill="#cfd9e3" />
            <rect x="405" y="178" width="5" height="86" fill="#cfd9e3" />
            {[282, 316].map((x) => (
              <rect key={x} x={x} y="186" width="28" height="28" fill="url(#ls-glass)" opacity="0.85" />
            ))}
            <rect x="272" y="226" width="102" height="2" fill="#b9c7d4" opacity="0.7" />
            <rect x="328" y="217" width="30" height="11" rx="1.5" fill="#12202e" />
            <path d="M332 221 H354 M332 225 H348" stroke="#7bff9a" strokeWidth="0.9" />
            {CORRIDOR_LIGHTS.map((x) => (
              <rect key={x} x={x} y="183" width="10" height="2" rx="1" fill="#fff8d6" />
            ))}
            <text x="316" y="246" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="4.6" fontWeight="700" fill="#1d4f91">
              LORONG BAGASI
            </text>
            <rect x="268" y="262" width="142" height="3" fill="#8a95a0" />
            {/* Arrival door with its sign */}
            <rect x="358" y="236" width="20" height="2" fill="#143d73" />
            <rect x="354" y="228" width="28" height="7" rx="1.5" fill="#0e2f63" />
            <text x="368" y="233.2" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="3.4" fontWeight="700" fill="#ffffff">
              PINTU KEDATANGAN
            </text>
            {/* Staircase up to the footbridge */}
            <polygon points="384,262 408,230 408,262" fill="#d8e0e8" stroke="#8895a1" strokeWidth="0.5" />
            {HALL_STEPS.map((i) => (
              <line key={i} x1={386 + i * 3} y1={259 - i * 3.9} x2={408} y2={259 - i * 3.9} stroke="#8895a1" strokeWidth="0.5" />
            ))}
            <line x1="384" y1="257" x2="408" y2="225" stroke="#e8eef4" strokeWidth="1" />
          </g>

          {/* Lounge staff behind the information counter */}
          <g transform="translate(283 262) scale(0.95)">
            <Person shirt="#1d4f91" pants="#1f2d3a" skin="#e0ac69" />
          </g>
          <rect x="272" y="249" width="24" height="13" rx="1.5" fill="#8a6a44" />
          <rect x="272" y="248" width="24" height="2.4" rx="1" fill="#c9a574" />

          {/* Carousel belt with suitcases cycling along it */}
          <clipPath id="la-belt-clip">
            <rect x="292" y="244" width="66" height="18" />
          </clipPath>
          <rect x="292" y="256" width="66" height="6" rx="3" fill="#3a444d" />
          <rect x="292" y="253.5" width="66" height="3.5" rx="1.5" fill="#6b7681" />
          <g clipPath="url(#la-belt-clip)">
            <g className="arr-belt">
              {BELT_BAGS.map((b) => (
                <g key={b.x} transform={`translate(${b.x} 0)`}>
                  <rect x="0" y="248.6" width="8" height="5" rx="1" fill={b.color} />
                  <path d="M2.4 248.6 V247.2 H5.6 V248.6" fill="none" stroke="#1d2023" strokeWidth="0.6" />
                </g>
              ))}
            </g>
          </g>
          <rect x="280" y="150" width="118" height="16" rx="3" fill="#0e2f63" stroke="#f1c40f" strokeWidth="0.9" />
          <text
            x="339"
            y="161"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="6.6"
            fontWeight="700"
            fill="#ffffff"
            textLength="108"
            lengthAdjust="spacingAndGlyphs"
          >
            RUANG TUNGGU PRIMA HUSADA
          </text>
          <rect x="290" y="165" width="2" height="4" fill="#7a8794" />
          <rect x="386" y="165" width="2" height="4" fill="#7a8794" />

          {/* Footbridge from the lounge to the elevated bus stop (halte); the stairs down to the bus are at the halte */}
          <g filter="url(#ls-shadow)">
            <rect x="438" y="232" width="5" height="68" fill="#8a95a0" />
            <rect x="468" y="232" width="5" height="68" fill="#8a95a0" />
            <rect x="518" y="232" width="5" height="68" fill="#8a95a0" />
            <rect x="410" y="209" width="66" height="3" fill="#1d4f91" />
            <rect x="410" y="212" width="66" height="19" fill="url(#ls-glass)" opacity="0.55" />
            {[426, 442, 458].map((x) => (
              <rect key={x} x={x} y="212" width="0.9" height="19" fill="#e8f4ff" opacity="0.9" />
            ))}
            <rect x="414" y="214" width="56" height="7" rx="1.5" fill="#0e2f63" />
            <text x="442" y="219.3" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="4.2" fontWeight="700" fill="#ffffff">
              JEMBATAN PENUMPANG
            </text>
            {/* Halte platform with its shelter, sign and bench */}
            <rect x="410" y="230" width="116" height="3" fill="#6b7681" />
            <rect x="476" y="205" width="54" height="3" rx="1" fill="#1d4f91" />
            <rect x="476" y="208" width="1.6" height="22" fill="#8a95a0" />
            <rect x="528" y="208" width="1.6" height="22" fill="#8a95a0" />
            <rect x="478" y="208" width="50" height="22" fill="url(#ls-glass)" opacity="0.28" />
            <rect x="482" y="211" width="42" height="7" rx="1.5" fill="#0e2f63" stroke="#f1c40f" strokeWidth="0.5" />
            <text x="503" y="216.4" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="4.6" fontWeight="700" fill="#ffffff">
              HALTE DAMRI
            </text>
            <rect x="480" y="224" width="20" height="2" rx="0.8" fill="#8a6a44" />
            <rect x="482" y="226" width="1.2" height="4" fill="#8a6a44" />
            <rect x="497" y="226" width="1.2" height="4" fill="#8a6a44" />
            {/* Covered stairway from the halte down to the bus */}
            <polygon points="526,230 538,230 552,298 540,298" fill="#d8e0e8" opacity="0.92" stroke="#8895a1" strokeWidth="0.5" />
            {BRIDGE_STEPS.map((i) => (
              <line key={i} x1={528 + i * 2} y1={236 + i * 9.5} x2={539 + i * 2} y2={236 + i * 9.5} stroke="#8895a1" strokeWidth="0.5" />
            ))}
            <line x1="526" y1="224" x2="545" y2="291" stroke="#e8eef4" strokeWidth="0.9" />
          </g>
        </g>

        {/* Apron / taxiway with white edge lines and a dashed centre line */}
        <rect x="-20" y="262" width="680" height="76" fill="url(#la-asphalt)" opacity="0.92" />
        <rect x="-20" y="265.6" width="680" height="1.8" fill="#ffffff" />
        <rect x="-20" y="333" width="680" height="1.8" fill="#ffffff" />
        <line x1="-20" y1="300" x2="660" y2="300" stroke="#ffffff" strokeWidth="1.8" strokeDasharray="16 12" />

        {/* Pavement, lamps and planting in front */}
        <rect x="-20" y="338" width="680" height="30" fill="#d9dee3" />
        <rect x="-20" y="338" width="680" height="2" fill="#b4bcc4" />
        {LAMPS.map((x) => (
          <g key={x}>
            <line x1={x} y1="356" x2={x} y2="326" stroke="#56626e" strokeWidth="1.2" />
            <circle cx={x} cy="325" r="7" fill="url(#ls-glow)" opacity="0.6" />
            <circle cx={x} cy="325.5" r="1.8" fill="#fff3a0" />
          </g>
        ))}
        {[20, 150, 470, 610].map((x) => (
          <g key={x}>
            <rect x={x - 1.4} y="338" width="2.8" height="10" fill="#5a3a22" />
            <circle cx={x} cy="334" r="8" fill="#2f7d32" />
            <circle cx={x - 3} cy="332" r="5" fill="#4aa44a" />
          </g>
        ))}

        {/* Marked safe route for passengers: stair foot, fenced walkway, then a zebra crossing to the lounge */}
        <g transform="translate(18 0)">
          <rect x="150" y="289" width="24" height="33" fill="#2e9e5b" opacity="0.9" />
          <rect x="150" y="289" width="1.6" height="33" fill="#f1c40f" />
          <rect x="172.4" y="289" width="1.6" height="33" fill="#f1c40f" />
          <rect x="150" y="320" width="236" height="13" rx="2" fill="#2e9e5b" opacity="0.9" />
          <rect x="150" y="320" width="236" height="1.6" fill="#f1c40f" />
          <rect x="150" y="331.4" width="236" height="1.6" fill="#f1c40f" />
          {ZEBRA_STRIPES.map((y) => (
            <rect key={y} x="358" y={y} width="20" height="3.6" fill="#ffffff" />
          ))}
          <line x1="150" y1="318" x2="356" y2="318" stroke="#ffffff" strokeWidth="0.9" />
          {RAIL_POSTS.map((x) => (
            <rect key={x} x={x} y="314.5" width="1.2" height="5" fill="#ffffff" />
          ))}
          {[152, 172, 380].map((x) => (
            <g key={x}>
              <polygon points={`${x},333 ${x + 3},333 ${x + 1.5},327`} fill="#ff7a1a" />
              <rect x={x - 0.4} y="332.4" width="3.8" height="1" fill="#ffffff" />
            </g>
          ))}
          <line x1="192" y1="346" x2="192" y2="337" stroke="#56626e" strokeWidth="1" />
          <rect x="166" y="337" width="52" height="8" rx="1.6" fill="#1b7f4a" stroke="#ffffff" strokeWidth="0.6" />
          <text x="192" y="342.8" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="4.2" fontWeight="700" fill="#ffffff">
            JALUR PENUMPANG AMAN
          </text>
        </g>

        <g transform="translate(18 0)">
          {/* The landed aircraft and its airstair */}
          <ellipse cx="95" cy="290" rx="82" ry="4" fill="#000000" opacity="0.3" />
          <g transform="translate(95 268) scale(2.1)" filter="url(#ls-shadow)">
            <SidePlane tail="#1d6fc4" label="PRIMA HUSADA" />
          </g>
          <rect x="127" y="258" width="9" height="7" rx="1.2" fill="#43586b" />
          <g>
            <rect x="126" y="265" width="12" height="2.4" fill="#cfd6dd" stroke="#8895a1" strokeWidth="0.4" />
            <polygon points="131,266.4 137,266.4 168,289.6 162,289.6" fill="#cfd6dd" stroke="#8895a1" strokeWidth="0.5" />
            {STAIR_STEPS.map((i) => (
              <line key={i} x1={133 + i * 5} y1={268 + i * 4} x2={139 + i * 5} y2={268 + i * 4} stroke="#8895a1" strokeWidth="0.5" />
            ))}
            <line x1="127" y1="259" x2="162" y2="285" stroke="#e8eef4" strokeWidth="0.9" />
            <rect x="157" y="284" width="14" height="6" rx="1" fill="#e0e6eb" stroke="#8895a1" strokeWidth="0.4" />
            <circle cx="160" cy="291" r="1.8" fill="#2b2f34" />
            <circle cx="168" cy="291" r="1.8" fill="#2b2f34" />
          </g>

          {/* DAMRI bus 1 meets the aircraft, then carries passengers to the lounge */}
          <g className="arr-bus1">
            <g transform="translate(116 314) scale(1.25)">
              <Bus color="#1d5fb0" accent="#f1c40f" operator="DAMRI" name="PRIMA HUSADA" mirrored={false} />
            </g>
          </g>

          {/* Boarding zone at the foot of the halte stairs, marked in the same green as the safe route */}
          <rect x="530" y="296" width="34" height="12" rx="2" fill="#2e9e5b" opacity="0.9" />
          <rect x="530" y="296" width="34" height="1.6" fill="#f1c40f" />
          <rect x="530" y="306.4" width="34" height="1.6" fill="#f1c40f" />

          {/* DAMRI bus 2 waits right at the halte stairs */}
          <g className="arr-bus2">
            <g transform="translate(528 306) scale(1.3)">
              <g transform="scale(-1 1) translate(-64 0)">
                <Bus color="#1d5fb0" accent="#f1c40f" operator="DAMRI" name="PRIMA HUSADA" mirrored />
              </g>
            </g>
          </g>

          {/* People who are just there: ground crew, lounge staff and waiting travellers */}
          {STANDERS.map((p, i) => (
            <g key={`${p.x}-${p.y}`} transform={`translate(${p.x} ${p.y}) scale(${p.scale})`}>
              <Person shirt={p.shirt} pants={p.pants} skin={p.skin} facing={i % 2 === 0 ? 1 : -1} />
            </g>
          ))}

          {/* Passengers: aircraft to bus, bus to lounge, baggage corridor, footbridge to bus 2 */}
          {PASSENGERS.map((p, i) => (
            <g key={p.shirt} className={`arr-p${i}`}>
              <Person shirt={p.shirt} pants={p.pants} skin={p.skin} hat={i % 3 === 0 ? 'cap' : i % 4 === 1 ? 'hat' : 'none'} pack={i % 2 === 0 ? 'ransel' : 'none'} packColor={p.bag} walking />
              <g className={`arr-bag${i}`}>
                <Suitcase color={p.bag} arm={p.shirt} skin={p.skin} />
              </g>
            </g>
          ))}
        </g>

        {/* Strollers on the pavement, walking across for as long as the scene shows */}
        {STROLLERS.map((s) => (
          <g key={s.id} transform="translate(0 354) scale(1.2)">
            <g className={s.reverse ? 'arr-walk-l' : 'arr-walk-r'} style={strollTiming(s)}>
              <Person shirt={s.shirt} pants={s.pants} skin={s.skin} walking facing={s.reverse ? -1 : 1} />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
