import { Person, SidePlane } from './LoginScene.tsx';

// Picture shown after the arrival story and the welcome photo: the Prima Husada
// aircraft parked at its stand beside the jet bridge, with ground crew around it.
// Shares the gradients and filters defined by the main scene's SVG.
export function LoginParkedPlane() {
  return (
    <figure className="login-parked">
      <svg viewBox="0 0 480 270" className="login-parked__svg" role="img" aria-label="Pesawat Prima Husada sedang parkir">
        <defs>
          <linearGradient id="lp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1670d6" />
            <stop offset="70%" stopColor="#8fcaf7" />
            <stop offset="100%" stopColor="#e6f3fc" />
          </linearGradient>
          <linearGradient id="lp-apron" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9d1d8" />
            <stop offset="100%" stopColor="#8f9aa4" />
          </linearGradient>
        </defs>
        <rect width="480" height="270" fill="url(#lp-sky)" />
        <circle cx="410" cy="48" r="38" fill="url(#ls-sun)" />
        <circle cx="410" cy="48" r="9" fill="#fffdf2" />
        <ellipse cx="90" cy="46" rx="40" ry="8" fill="#ffffff" opacity="0.85" />
        <ellipse cx="116" cy="40" rx="22" ry="8" fill="#ffffff" opacity="0.9" />
        <ellipse cx="300" cy="70" rx="34" ry="6" fill="#ffffff" opacity="0.75" />

        {/* Terminal with the jet bridge */}
        <rect x="0" y="118" width="120" height="76" fill="url(#ls-wall)" />
        <rect x="0" y="112" width="120" height="8" fill="#1d4f91" />
        <rect x="0" y="130" width="120" height="44" fill="url(#ls-glass)" />
        {[16, 36, 56, 76, 96].map((x) => (
          <rect key={x} x={x} y="130" width="1.4" height="44" fill="#e8f4ff" opacity="0.85" />
        ))}
        <rect x="14" y="120" width="92" height="9" rx="2" fill="#0e2f63" />
        <text x="60" y="127.4" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="6.4" fontWeight="700" fill="#ffffff">
          PRIMA HUSADA 2050
        </text>
        <rect x="104" y="148" width="68" height="9" rx="3" fill="#9aa5ae" />
        <circle cx="172" cy="152.5" r="6" fill="#7a8794" />

        {/* Apron with the stand markings */}
        <rect x="0" y="190" width="480" height="80" fill="url(#lp-apron)" />
        <path d="M0 206 H480" stroke="#f3c614" strokeWidth="1.6" strokeDasharray="14 8" />
        <path d="M188 190 V270" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />
        <path d="M312 190 V270" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />
        <ellipse cx="238" cy="198" rx="124" ry="6" fill="#000000" opacity="0.28" />

        {/* The parked aircraft, nose to the right */}
        <g transform="translate(236 158) scale(3.3)" filter="url(#ls-shadow)">
          <SidePlane tail="#1d6fc4" label="PRIMA HUSADA" />
        </g>

        {/* Wheel chocks and cones */}
        <polygon points="316,196 324,196 324,191" fill="#f1c40f" />
        <polygon points="206,196 214,196 206,191" fill="#f1c40f" />
        {[150, 328, 346].map((x) => (
          <g key={x}>
            <polygon points={`${x},206 ${x + 6},206 ${x + 3},194`} fill="#ff7a1a" />
            <rect x={x - 0.5} y="205" width="7" height="2" fill="#ffffff" />
          </g>
        ))}

        {/* Ground crew */}
        <g transform="translate(160 214) scale(1.5)">
          <Person shirt="#f1c40f" pants="#2d3436" skin="#c68642" hat="cap" pack="none" />
        </g>
        <g transform="translate(300 220) scale(1.5)">
          <Person shirt="#e67e22" pants="#2d3436" skin="#f1c27d" hat="cap" pack="none" />
        </g>
        <g transform="translate(356 214) scale(1.5)">
          <Person shirt="#1d4f91" pants="#2d3436" skin="#e0ac69" hat="none" pack="none" />
        </g>

        {/* Baggage cart */}
        <g transform="translate(398 222)">
          <rect x="-6" y="-8" width="64" height="5" rx="1" fill="#6b7681" />
          <rect x="0" y="-18" width="12" height="10" rx="1.5" fill="#c0392b" />
          <rect x="14" y="-16" width="14" height="8" rx="1.5" fill="#1d4f91" />
          <rect x="30" y="-19" width="12" height="11" rx="1.5" fill="#2d3436" />
          <circle cx="2" cy="-1.6" r="3" fill="#1d2023" />
          <circle cx="50" cy="-1.6" r="3" fill="#1d2023" />
        </g>
      </svg>
      <figcaption className="login-parked__caption">Pesawat Prima Husada — parkir di apron</figcaption>
    </figure>
  );
}
