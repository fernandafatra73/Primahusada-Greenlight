// Suara kabin pesawat yang disintesis dengan Web Audio (tanpa file audio):
// bel "ding-dong" pengumuman dan deru mesin jet. Browser menahan audio sampai
// pengguna berinteraksi, jadi semua pemutaran dilewati diam-diam bila konteks
// audio belum "running".

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  context ??= new AudioContext();
  return context;
}

/** Panggil dari interaksi pengguna (klik/tombol) supaya audio diizinkan browser. */
export async function unlockCabinAudio(): Promise<void> {
  const ctx = getContext();
  if (!ctx || ctx.state !== 'suspended') return;
  try {
    await ctx.resume();
  } catch {
    // Tetap diam bila browser menolak; pemutaran berikutnya akan dilewati.
  }
}

/** Jeda / lanjutkan semua suara kabin yang sedang berjalan. */
export function setCabinAudioPaused(paused: boolean): void {
  if (!context) return;
  void (paused ? context.suspend() : context.resume()).catch(() => undefined);
}

/** Bel "ding-dong" khas pengumuman kabin; selesai setelah nada terakhir hilang. */
export function playCabinChime(): Promise<void> {
  return new Promise((resolve) => {
    const ctx = getContext();
    if (!ctx || ctx.state !== 'running') {
      resolve();
      return;
    }
    const notes: ReadonlyArray<readonly [freq: number, offsetMs: number, durationMs: number]> = [
      [880, 0, 450],
      [659.25, 480, 700],
    ];
    for (const [freq, offsetMs, durationMs] of notes) {
      const start = ctx.currentTime + offsetMs / 1000;
      const duration = durationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    }
    const totalMs = Math.max(...notes.map(([, offsetMs, durationMs]) => offsetMs + durationMs));
    window.setTimeout(resolve, totalMs + 150);
  });
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Deru mesin jet yang membesar lalu mereda (derau tersaring + dengung rendah + desing turbin). */
export function playJetSound(durationMs = 10000): void {
  const ctx = getContext();
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;
  const dur = durationMs / 1000;
  const end = t0 + dur;

  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  // Deru udara: derau dengan low-pass yang menyapu naik-turun.
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx);
  noise.loop = true;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 0.8;
  lowpass.frequency.setValueAtTime(300, t0);
  lowpass.frequency.linearRampToValueAtTime(1600, t0 + dur * 0.35);
  lowpass.frequency.linearRampToValueAtTime(900, t0 + dur * 0.7);
  lowpass.frequency.linearRampToValueAtTime(250, end);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t0);
  noiseGain.gain.linearRampToValueAtTime(0.35, t0 + dur * 0.25);
  noiseGain.gain.setValueAtTime(0.35, t0 + dur * 0.7);
  noiseGain.gain.linearRampToValueAtTime(0.0001, end);
  noise.connect(lowpass);
  lowpass.connect(noiseGain);
  noiseGain.connect(master);

  // Dengung mesin rendah.
  const rumble = ctx.createOscillator();
  rumble.type = 'sawtooth';
  rumble.frequency.setValueAtTime(60, t0);
  rumble.frequency.linearRampToValueAtTime(95, t0 + dur * 0.4);
  rumble.frequency.linearRampToValueAtTime(55, end);
  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = 'lowpass';
  rumbleFilter.frequency.value = 220;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.setValueAtTime(0.0001, t0);
  rumbleGain.gain.linearRampToValueAtTime(0.18, t0 + dur * 0.3);
  rumbleGain.gain.linearRampToValueAtTime(0.0001, end);
  rumble.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(master);

  // Desing turbin yang naik lalu turun nadanya.
  const whine = ctx.createOscillator();
  whine.type = 'sine';
  whine.frequency.setValueAtTime(700, t0);
  whine.frequency.linearRampToValueAtTime(1400, t0 + dur * 0.4);
  whine.frequency.linearRampToValueAtTime(600, end);
  const whineGain = ctx.createGain();
  whineGain.gain.setValueAtTime(0.0001, t0);
  whineGain.gain.linearRampToValueAtTime(0.03, t0 + dur * 0.3);
  whineGain.gain.linearRampToValueAtTime(0.0001, end);
  whine.connect(whineGain);
  whineGain.connect(master);

  for (const source of [noise, rumble, whine]) {
    source.start(t0);
    source.stop(end + 0.1);
  }
}
