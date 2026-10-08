import { useEffect, useRef, useState } from 'react';
import { clockAngles, nextSecondTurns, type ClockAngles } from '../lib/clockAngles.ts';

const NUMBERS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const TICKS = Array.from({ length: 60 }, (_, i) => i);

/** Jam dinding analog yang mengikuti waktu komputer; jarum detik berdetak tiap detik. */
export function WallClock() {
  const turnsRef = useRef(0);
  const lastSecondRef = useRef(new Date().getSeconds());
  const [angles, setAngles] = useState<ClockAngles>(() => clockAngles(new Date()));

  useEffect(() => {
    let timer = 0;
    function tick(): void {
      const now = new Date();
      turnsRef.current = nextSecondTurns(lastSecondRef.current, now.getSeconds(), turnsRef.current);
      lastSecondRef.current = now.getSeconds();
      setAngles(clockAngles(now, turnsRef.current));
      // Dijadwalkan tepat di awal detik berikutnya supaya detaknya pas dengan jam komputer.
      timer = window.setTimeout(tick, 1000 - now.getMilliseconds() + 5);
    }
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <svg className="wall-clock" viewBox="0 0 200 200" role="img" aria-label="Jam dinding">
      <defs>
        <radialGradient id="wall-clock-rim" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#5b6475" />
          <stop offset="60%" stopColor="#262b36" />
          <stop offset="100%" stopColor="#0f1218" />
        </radialGradient>
        <radialGradient id="wall-clock-face" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="85%" stopColor="#f3f5f8" />
          <stop offset="100%" stopColor="#dde2ea" />
        </radialGradient>
        <linearGradient id="wall-clock-glass" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="98" fill="url(#wall-clock-rim)" />
      <circle cx="100" cy="100" r="88" fill="url(#wall-clock-face)" />

      {TICKS.map((i) => (
        <line
          key={i}
          x1="100"
          y1={i % 5 === 0 ? 17 : 16}
          x2="100"
          y2={i % 5 === 0 ? 29 : 22}
          stroke={i % 5 === 0 ? '#12223f' : '#6b7486'}
          strokeWidth={i % 5 === 0 ? 3.2 : 1.2}
          strokeLinecap="round"
          transform={`rotate(${i * 6} 100 100)`}
        />
      ))}

      {NUMBERS.map((n, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return (
          <text
            key={n}
            x={100 + Math.sin(a) * 58}
            y={100 - Math.cos(a) * 58}
            className="wall-clock__number"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {n}
          </text>
        );
      })}

      <text x="100" y="72" className="wall-clock__brand" textAnchor="middle">
        PRIMA HUSADA
      </text>

      {/* Jarum jam dan menit: biru tua, tebal, ujung membulat. */}
      <line
        x1="100"
        y1="112"
        x2="100"
        y2="54"
        stroke="#12223f"
        strokeWidth="7"
        strokeLinecap="round"
        className="wall-clock__hand"
        style={{ transform: `rotate(${angles.hour}deg)` }}
      />
      <line
        x1="100"
        y1="116"
        x2="100"
        y2="30"
        stroke="#12223f"
        strokeWidth="4.5"
        strokeLinecap="round"
        className="wall-clock__hand"
        style={{ transform: `rotate(${angles.minute}deg)` }}
      />
      {/* Jarum detik: merah tipis dengan pemberat, berdetak dengan pantulan kecil. */}
      <g className="wall-clock__hand wall-clock__hand--second" style={{ transform: `rotate(${angles.second}deg)` }}>
        <line x1="100" y1="124" x2="100" y2="22" stroke="#d61f2c" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="100" cy="118" r="4" fill="#d61f2c" />
      </g>
      <circle cx="100" cy="100" r="5.5" fill="#d61f2c" />
      <circle cx="100" cy="100" r="2" fill="#12223f" />

      <ellipse cx="78" cy="58" rx="62" ry="40" fill="url(#wall-clock-glass)" transform="rotate(-30 78 58)" />
    </svg>
  );
}
