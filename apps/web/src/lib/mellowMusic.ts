// Original, synthesized mellow piano-style loop (A minor: Am - F - C - G).
// Generated with the Web Audio API so there is no audio file or copyright to carry.

export interface MellowPlayer {
  readonly start: () => void;
  readonly stop: () => void;
}

const BEAT_SECONDS = 0.55;
const STEPS_PER_CHORD = 8;
const LOOKAHEAD_MS = 250;
const SCHEDULE_AHEAD_S = 1.2;

// [bass, then four chord tones] per chord.
const CHORDS: ReadonlyArray<ReadonlyArray<number>> = [
  [110.0, 164.81, 220.0, 261.63, 329.63], // Am
  [87.31, 130.81, 174.61, 220.0, 261.63], // F
  [130.81, 196.0, 261.63, 329.63, 392.0], // C
  [98.0, 146.83, 196.0, 246.94, 293.66], // G
];

// Index into the chord's tones for each eighth-note step of the arpeggio.
const ARPEGGIO: ReadonlyArray<number> = [0, 2, 3, 4, 3, 2, 3, 4];

function playNote(ctx: AudioContext, out: AudioNode, freq: number, when: number, gain: number, length: number): void {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(gain, when + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, when + length);
  env.connect(out);

  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.value = freq;
  body.connect(env);

  const shimmer = ctx.createOscillator();
  shimmer.type = 'sine';
  shimmer.frequency.value = freq * 2;
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.value = 0.25;
  shimmer.connect(shimmerGain).connect(env);

  for (const osc of [body, shimmer]) {
    osc.start(when);
    osc.stop(when + length + 0.05);
  }
}

function playPad(ctx: AudioContext, out: AudioNode, freqs: ReadonlyArray<number>, when: number, length: number): void {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, when);
  env.gain.linearRampToValueAtTime(0.05, when + length * 0.4);
  env.gain.linearRampToValueAtTime(0.0001, when + length);
  env.connect(out);

  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(env);
    osc.start(when);
    osc.stop(when + length + 0.05);
  }
}

export function createMellowPlayer(): MellowPlayer {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let timer: number | null = null;
  let nextStep = 0;
  let nextTime = 0;

  function schedule(): void {
    if (!ctx || !master) return;
    while (nextTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const chordIndex = Math.floor(nextStep / STEPS_PER_CHORD) % CHORDS.length;
      const stepInChord = nextStep % STEPS_PER_CHORD;
      const chord = CHORDS[chordIndex] ?? CHORDS[0] ?? [];
      const tone = chord[ARPEGGIO[stepInChord] ?? 0];

      if (stepInChord === 0) {
        const bass = chord[0];
        if (bass !== undefined) playNote(ctx, master, bass, nextTime, 0.22, 3.6);
        playPad(ctx, master, chord.slice(1, 4), nextTime, STEPS_PER_CHORD * BEAT_SECONDS);
      }
      if (tone !== undefined) {
        playNote(ctx, master, tone, nextTime, stepInChord % 4 === 0 ? 0.16 : 0.1, 2.2);
      }
      // A soft melody note an octave up on the strong beats.
      if (stepInChord === 0 || stepInChord === 4) {
        const top = chord[4];
        if (top !== undefined) playNote(ctx, master, top * 2, nextTime + 0.02, 0.07, 3);
      }

      nextStep += 1;
      nextTime += BEAT_SECONDS;
    }
  }

  function start(): void {
    if (ctx) return;
    const AudioCtor = window.AudioContext;
    ctx = new AudioCtor();
    void ctx.resume();

    master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 3);
    master.connect(ctx.destination);

    // Feedback delay with a darkened tail stands in for room reverb.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.42;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1800;
    master.connect(delay);
    delay.connect(tone).connect(feedback).connect(delay);
    tone.connect(ctx.destination);

    nextStep = 0;
    nextTime = ctx.currentTime + 0.1;
    schedule();
    timer = window.setInterval(schedule, LOOKAHEAD_MS);
  }

  function stop(): void {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    if (ctx && master) {
      const closing = ctx;
      master.gain.cancelScheduledValues(closing.currentTime);
      master.gain.setValueAtTime(master.gain.value, closing.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, closing.currentTime + 0.8);
      window.setTimeout(() => void closing.close(), 1000);
    }
    ctx = null;
    master = null;
  }

  return { start, stop };
}
