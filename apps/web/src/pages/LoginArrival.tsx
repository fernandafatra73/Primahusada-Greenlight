import { Bus, Person, SidePlane } from './LoginScene.tsx';
import './loginArrival.css';

// Side view shown after the welcome voice: the landed aircraft is met by a DAMRI
// "Prima Husada" bus, passengers walk down the stairs and ride to the waiting
// lounge, collect their suitcases and leave on a second DAMRI bus. All motion is
// CSS (loginArrival.css, one 60s timeline) so it can be paused with the scene.
//
// LoginScene imports this component and this file imports shapes back from
// LoginScene; that cycle is safe because nothing is used at module load time.

const PASSENGERS: ReadonlyArray<{ readonly shirt: string; readonly pants: string; readonly skin: string; readonly bag: string }> = [
  { shirt: '#e74c3c', pants: '#2c3e50', skin: '#f1c27d', bag: '#2d3436' },
  { shirt: '#2980b9', pants: '#34495e', skin: '#c68642', bag: '#c0392b' },
  { shirt: '#27ae60', pants: '#1f2d3a', skin: '#e0ac69', bag: '#1d4f91' },
  { shirt: '#f39c12', pants: '#3b3b3b', skin: '#8d5524', bag: '#6c5ce7' },
  { shirt: '#8e44ad', pants: '#2c3e50', skin: '#f1c27d', bag: '#16a085' },
  { shirt: '#16a085', pants: '#2d3436', skin: '#c68642', bag: '#d35400' },
];

const BELT_BAGS: ReadonlyArray<{ readonly x: number; readonly color: string }> = [
  { x: 296, color: '#c0392b' },
  { x: 314, color: '#2d3436' },
  { x: 332, color: '#1d4f91' },
  { x: 350, color: '#d35400' },
  { x: 278, color: '#6c5ce7' },
];

const STAIR_STEPS: ReadonlyArray<number> = Array.from({ length: 6 }, (_, i) => i);

const HILL_TREES: ReadonlyArray<number> = Array.from({ length: 24 }, (_, i) => i * 28 - 10);

const LAMPS: ReadonlyArray<number> = [60, 220, 380, 540];

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

        {/* Waiting lounge: a cut-away so the suitcase carousel and passengers show */}
        <g filter="url(#ls-shadow)">
          <rect x="268" y="172" width="142" height="92" fill="#eaf3fb" />
          <rect x="268" y="172" width="142" height="10" fill="#cfe2f2" />
          <path d="M262 176 L268 166 H410 L416 176 Z" fill="#1d4f91" />
          <rect x="262" y="174" width="154" height="4" rx="1.5" fill="#143d73" />
          <rect x="268" y="178" width="5" height="86" fill="#cfd9e3" />
          <rect x="405" y="178" width="5" height="86" fill="#cfd9e3" />
          {[282, 318, 354].map((x) => (
            <rect key={x} x={x} y="188" width="30" height="34" fill="url(#ls-glass)" opacity="0.85" />
          ))}
          <rect x="372" y="226" width="30" height="13" rx="1.5" fill="#12202e" />
          <path d="M376 230 H398 M376 234 H392" stroke="#7bff9a" strokeWidth="0.9" />
          <text x="318" y="246" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="4.6" fontWeight="700" fill="#1d4f91">
            AMBIL BAGASI
          </text>
          <rect x="268" y="262" width="142" height="3" fill="#8a95a0" />
          {[372, 388].map((x) => (
            <g key={x}>
              <rect x={x} y="252" width="13" height="5" rx="1.2" fill="#1d6fc4" />
              <rect x={x} y="248" width="13" height="4" rx="1.2" fill="#3b86d6" />
              <rect x={x + 1} y="257" width="1.2" height="5" fill="#4a5158" />
              <rect x={x + 10.8} y="257" width="1.2" height="5" fill="#4a5158" />
            </g>
          ))}
        </g>
        {/* Carousel belt with suitcases cycling along it */}
        <clipPath id="la-belt-clip">
          <rect x="292" y="244" width="66" height="18" />
        </clipPath>
        <rect x="292" y="256" width="66" height="6" rx="3" fill="#3a444d" />
        <rect x="292" y="253.5" width="66" height="3.5" rx="1.5" fill="#6b7681" />
        <g clipPath="url(#la-belt-clip)">
          <g className="arr-belt">
            {BELT_BAGS.map((b) => (
              <g key={b.x} transform={`translate(${b.x - 296 + 296} 0)`}>
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

        {/* Apron / taxiway with white edge lines and a dashed centre line */}
        <rect x="-20" y="262" width="680" height="76" fill="url(#la-asphalt)" />
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
          <g transform="translate(190 292) scale(1.25)" filter="url(#ls-shadow)">
            <Bus color="#1d5fb0" accent="#f1c40f" operator="DAMRI" name="PRIMA HUSADA" mirrored={false} />
          </g>
        </g>

        {/* DAMRI bus 2 waits in front of the lounge to take them on */}
        <g className="arr-bus2">
          <g transform="translate(328 336) scale(1.3)" filter="url(#ls-shadow)">
            <g transform="scale(-1 1) translate(-64 0)">
              <Bus color="#1d5fb0" accent="#f1c40f" operator="DAMRI" name="PRIMA HUSADA" mirrored />
            </g>
          </g>
        </g>

        {/* Passengers: aircraft to bus, bus to lounge, suitcase pick-up, lounge to bus 2 */}
        {PASSENGERS.map((p, i) => (
          <g key={p.shirt} className={`arr-p${i}`}>
            <Person shirt={p.shirt} pants={p.pants} skin={p.skin} />
            <g className={`arr-bag${i}`}>
              <rect x="2.4" y="-7.4" width="6" height="4.8" rx="0.9" fill={p.bag} />
              <path d="M4.2 -7.4 V-8.6 H6.6 V-7.4" fill="none" stroke="#1d2023" strokeWidth="0.6" />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
