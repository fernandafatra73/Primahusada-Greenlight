/** Pilih voice Bahasa Indonesia terbaik dari daftar voice browser, dengan
 * prioritas suara perempuan (mis. "Google Bahasa Indonesia" acapkali female,
 * atau voice Windows bernama "Gadis"/"Damayanti"), supaya pengumuman terdengar
 * lembut dan tidak jatuh ke voice pria default seperti "Microsoft Andika". */
export function pickIndonesianVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const idVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('id'));
  if (idVoices.length === 0) return null;

  const isNaturalSounding = (v: SpeechSynthesisVoice) => /google|natural|online|neural/i.test(v.name);
  const isFemale = (v: SpeechSynthesisVoice) => /female|wanita|perempuan|gadis|damayanti/i.test(v.name);
  const isMale = (v: SpeechSynthesisVoice) => /\bmale\b|\bpria\b|andika|\bardi\b/i.test(v.name);

  const femaleVoices = idVoices.filter(isFemale);
  if (femaleVoices.length > 0) {
    return femaleVoices.find(isNaturalSounding) ?? femaleVoices[0]!;
  }

  const notMaleVoices = idVoices.filter((v) => !isMale(v));
  const pool = notMaleVoices.length > 0 ? notMaleVoices : idVoices;
  return pool.find(isNaturalSounding) ?? pool[0]!;
}

/** Panggil `callback` dengan voice Bahasa Indonesia terbaik (diutamakan
 * perempuan) begitu daftar voice browser sudah termuat — pada beberapa
 * browser getVoices() kosong sampai event "voiceschanged" terpicu. */
export function withIndonesianVoice(callback: (voice: SpeechSynthesisVoice | null) => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callback(null);
    return;
  }
  const synth = window.speechSynthesis;

  const resolveNow = () => callback(pickIndonesianVoice(synth.getVoices()));

  if (synth.getVoices().length > 0) {
    resolveNow();
    return;
  }
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    synth.removeEventListener('voiceschanged', start);
    resolveNow();
  };
  synth.addEventListener('voiceschanged', start);
  setTimeout(start, 300);
}
