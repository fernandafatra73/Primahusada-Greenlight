const isNaturalSounding = (v: SpeechSynthesisVoice) => /google|natural|online|neural/i.test(v.name);
const isFemale = (v: SpeechSynthesisVoice) =>
  /female|wanita|perempuan|gadis|damayanti|zira|susan|samantha|victoria|karen|moira|tessa|serena/i.test(v.name);
const isMale = (v: SpeechSynthesisVoice) => /\bmale\b|\bpria\b|andika|\bardi\b|\bdavid\b|\bmark\b/i.test(v.name);

/** Pilih voice Bahasa Indonesia terbaik dari daftar voice browser, dengan
 * prioritas suara perempuan (mis. "Google Bahasa Indonesia" acapkali female,
 * atau voice Windows bernama "Gadis"/"Damayanti"), supaya pengumuman terdengar
 * lembut dan tidak jatuh ke voice pria default seperti "Microsoft Andika".
 *
 * Kalau tidak ada voice Bahasa Indonesia sama sekali terpasang di
 * browser/OS (umum terjadi di Windows tanpa paket bahasa Indonesia), tetap
 * dipaksa cari voice PEREMPUAN dari bahasa lain (mis. "Microsoft Zira" di
 * Windows) — supaya sambutan login tidak pernah jatuh ke voice pria default
 * seperti "Microsoft David", meskipun logat/pelafalannya jadi kurang pas. */
export function pickIndonesianVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const idVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('id'));

  if (idVoices.length > 0) {
    const femaleVoices = idVoices.filter(isFemale);
    if (femaleVoices.length > 0) {
      return femaleVoices.find(isNaturalSounding) ?? femaleVoices[0]!;
    }

    const notMaleVoices = idVoices.filter((v) => !isMale(v));
    const pool = notMaleVoices.length > 0 ? notMaleVoices : idVoices;
    return pool.find(isNaturalSounding) ?? pool[0]!;
  }

  // Tidak ada voice id-ID sama sekali — cari voice perempuan dari bahasa apa pun.
  const anyFemale = voices.filter(isFemale);
  if (anyFemale.length > 0) {
    return anyFemale.find(isNaturalSounding) ?? anyFemale[0]!;
  }

  const anyNotMale = voices.filter((v) => !isMale(v));
  if (anyNotMale.length > 0) {
    return anyNotMale.find(isNaturalSounding) ?? anyNotMale[0]!;
  }

  return voices[0] ?? null;
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

/** Sesuaikan ejaan kata-kata tertentu supaya pelafalan voice
 * text-to-speech browser lebih dekat ke aslinya — mis. "Allah" sering
 * diucapkan seperti kata Inggris kalau tidak dieja ulang jadi "Alloh".
 * Cuma dipakai untuk teks yang DIBACAKAN, bukan yang ditampilkan di layar. */
export function toSpeakableText(text: string): string {
  return text.replace(/\bAllah\b/gi, 'Alloh');
}
