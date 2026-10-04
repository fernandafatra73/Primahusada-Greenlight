import { getAudioContext, isCabinSilent } from './cabinSounds.ts';

// Musik latar halaman login yang disintesis dengan Web Audio (tanpa file audio): irama ceria
// 112 bpm dengan bass, kick, hi-hat, aliran akor dan melodi pentatonik yang berubah-ubah.
// Dijadwalkan sedikit ke depan supaya tetap rapat walau tab sempat tersendat.

const BPM = 112;
const STEP_S = 60 / BPM / 2; // satu langkah = not seperdelapan
const LOOKAHEAD_S = 0.4;
const TICK_MS = 120;
const MASTER_GAIN = 0.1;

// C - Am - F - G, satu akor per birama (8 langkah): [bass, nada akor...] dalam Hz.
const CHORDS: ReadonlyArray<readonly [number, number, number, number]> = [
  [130.81, 261.63, 329.63, 392.0],
  [110.0, 261.63, 329.63, 440.0],
  [87.31, 220.0, 261.63, 349.23],
  [98.0, 246.94, 293.66, 392.0],
];
const PENTATONIC: ReadonlyArray<number> = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

let master: GainNode | null = null;
let timer: number | null = null;
let nextTime = 0;
let step = 0;
let noise: AudioBuffer | null = null;

function tone(ctx: AudioContext, freq: number, at: number, len: number, type: OscillatorType, peak: number): void {
  if (!master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain);
  gain.connect(master);
  osc.start(at);
  osc.stop(at + len + 0.05);
}

function kick(ctx: AudioContext, at: number): void {
  if (!master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(150, at);
  osc.frequency.exponentialRampToValueAtTime(45, at + 0.14);
  gain.gain.setValueAtTime(0.9, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
  osc.connect(gain);
  gain.connect(master);
  osc.start(at);
  osc.stop(at + 0.2);
}

function hat(ctx: AudioContext, at: number, open: boolean): void {
  if (!master) return;
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = ctx.createGain();
  const len = open ? 0.12 : 0.04;
  gain.gain.setValueAtTime(0.28, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(at);
  src.stop(at + len + 0.02);
}

function scheduleStep(ctx: AudioContext, index: number, at: number): void {
  const bar = Math.floor(index / 8) % CHORDS.length;
  const pos = index % 8;
  const chord = CHORDS[bar] ?? CHORDS[0];
  if (!chord) return;
  if (pos % 2 === 0) kick(ctx, at);
  hat(ctx, at, pos % 2 === 1);
  if (pos === 0 || pos === 3 || pos === 6) tone(ctx, chord[0], at, STEP_S * 1.6, 'triangle', 0.55);
  // Akor dipetik naik-turun, seperti ukulele.
  const arp = chord[1 + (pos % 3)] ?? chord[1];
  tone(ctx, arp, at, STEP_S * 0.9, 'square', 0.07);
  // Melodi: tidak setiap langkah, nadanya dipilih acak dari pentatonik.
  if (Math.random() < (pos % 2 === 0 ? 0.75 : 0.35)) {
    const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)] ?? 659.25;
    tone(ctx, note, at, STEP_S * 1.4, 'sine', 0.2);
  }
}

function tick(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running' || isCabinSilent()) return;
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + LOOKAHEAD_S) {
    scheduleStep(ctx, step, nextTime);
    step += 1;
    nextTime += STEP_S;
  }
}

/** Mulai memutar musik; aman dipanggil berulang. Baru terdengar setelah audio diizinkan browser. */
export function startLoginMusic(): void {
  if (timer !== null || isCabinSilent()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  nextTime = 0;
  step = 0;
  timer = window.setInterval(tick, TICK_MS);
}

export function stopLoginMusic(): void {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  master?.disconnect();
  master = null;
}
