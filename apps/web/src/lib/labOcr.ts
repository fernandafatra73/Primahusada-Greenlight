import Tesseract from 'tesseract.js';

/// Jalankan OCR di browser (tanpa AI/network ke server) atas foto hasil
/// pemeriksaan lab, dan kembalikan teks mentah yang terbaca. File engine
/// OCR (worker, WASM core, data bahasa) dilayani dari aplikasi sendiri
/// (public/tesseract/), bukan diunduh dari CDN eksternal saat dipakai —
/// supaya tetap jalan di klinik dengan internet lambat/terbatas.
export async function runOcr(imageDataUrl: string): Promise<string> {
  const result = await Tesseract.recognize(imageDataUrl, 'eng', {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/tesseract-core.wasm.js',
    langPath: '/tesseract',
  });
  return result.data.text;
}

/// Nama pemeriksaan di katalog klinik ini umumnya nama lengkap tanpa
/// singkatan (mis. "Hemoglobine", "Leukosit", "SGOT"), sementara print out
/// alat analyzer/hasil manual biasanya pakai singkatan standar (Hb, WBC,
/// AST, dst). Daftar ini memetakan kata kunci yang mungkin muncul di nama
/// pemeriksaan ke singkatan yang mungkin muncul di foto, supaya keduanya
/// tetap bisa dicocokkan tanpa AI.
const PARAMETER_ALIASES: ReadonlyArray<{ readonly keyword: string; readonly aliases: readonly string[] }> = [
  { keyword: 'hemoglobin', aliases: ['hb', 'hgb'] },
  { keyword: 'hemoglobine', aliases: ['hb', 'hgb'] },
  { keyword: 'leukosit', aliases: ['wbc', 'leu'] },
  { keyword: 'eritrosit', aliases: ['rbc'] },
  { keyword: 'erytrosit', aliases: ['rbc'] },
  { keyword: 'hematokrit', aliases: ['hct', 'ht'] },
  { keyword: 'trombosit', aliases: ['plt'] },
  { keyword: 'sgot', aliases: ['ast'] },
  { keyword: 'sgpt', aliases: ['alt'] },
  { keyword: 'gamma gt', aliases: ['ggt'] },
  { keyword: 'alkali fosfatase', aliases: ['alp'] },
  { keyword: 'bilirubin total', aliases: ['tbil'] },
  { keyword: 'bilirubin direct', aliases: ['dbil'] },
  { keyword: 'bilirubin indirect', aliases: ['ibil'] },
  { keyword: 'protein total', aliases: ['tp'] },
  { keyword: 'albumin', aliases: ['alb'] },
  { keyword: 'globulin', aliases: ['glob'] },
  { keyword: 'cholesterol', aliases: ['kolesterol', 'chol'] },
  { keyword: 'kolesterol', aliases: ['cholesterol', 'chol'] },
  { keyword: 'hdl', aliases: ['hdl kolesterol', 'hdl cholesterol'] },
  { keyword: 'ldl', aliases: ['ldl kolesterol', 'ldl cholesterol'] },
  { keyword: 'trigliserida', aliases: ['tg'] },
  { keyword: 'ureum', aliases: ['bun', 'urea'] },
  { keyword: 'kreatinin', aliases: ['creatinine', 'cr'] },
  { keyword: 'asam urat', aliases: ['uric acid', 'ua'] },
  { keyword: 'glukosa puasa', aliases: ['gdp'] },
  { keyword: 'glukosa 2 jam', aliases: ['gd2pp', 'g2pp', 'gdpp'] },
  { keyword: 'glukosa sewaktu', aliases: ['gds'] },
  { keyword: 'hba1c', aliases: ['a1c'] },
  { keyword: 'typhi o', aliases: ['to'] },
  { keyword: 'typhi h', aliases: ['th'] },
  { keyword: 'paratyphi a', aliases: ['pa'] },
  { keyword: 'paratyphi b', aliases: ['pb'] },
  { keyword: 'eosinofil', aliases: ['eos'] },
  { keyword: 'basofil', aliases: ['baso'] },
  { keyword: 'netrofil', aliases: ['neutrofil', 'neut'] },
  { keyword: 'limposit', aliases: ['limfosit', 'lymph', 'ly'] },
  { keyword: 'monosit', aliases: ['mono'] },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const VALUE_PATTERN = /\d+\s*\/\s*\d+|\(\s*[+-]\s*\)|negatif|positif|[-+]?\d[\d.,]*\s*%?/i;

/// Cari nilai hasil untuk satu parameter di dalam teks hasil OCR. Mencari
/// baris yang menyebut nama parameter (nama lengkap, singkatan dalam
/// kurung kalau ada, atau alias dari PARAMETER_ALIASES), lalu ambil token
/// bernilai (angka, rasio titer "1/320", atau tanda +/-/negatif/positif)
/// pertama setelah nama itu di baris yang sama. Mengembalikan string
/// kosong kalau tidak ketemu — tidak menebak-nebak.
export function extractValueForParameter(ocrText: string, parameterName: string): string {
  const normalizedName = parameterName.toLowerCase();
  const abbrevMatch = /\(([^)]+)\)/.exec(parameterName);
  const mainName = parameterName.replace(/\([^)]*\)/, '').trim();

  const aliasTerms = PARAMETER_ALIASES.filter((entry) => normalizedName.includes(entry.keyword)).flatMap(
    (entry) => entry.aliases,
  );
  // Nama gabungan (mis. "GDS / GDP") atau nama dengan kata tambahan (mis.
  // "Cholesterol Total") sering ditulis di foto sebagai salah satu bagiannya
  // saja — coba juga tiap bagian/kata sebagai fallback, terpisah dari nama
  // lengkap yang tetap dicoba lebih dulu (lebih spesifik, lebih diprioritaskan).
  const nameParts = mainName
    .split(/[/,]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  const nameWords = mainName.split(/\s+/).filter((word) => word.length >= 4);
  const substringTerms = [mainName, abbrevMatch?.[1]?.trim(), ...nameParts, ...nameWords].filter(
    (term): term is string => term !== undefined && term.length >= 2,
  );
  if (substringTerms.length === 0 && aliasTerms.length === 0) return '';

  const lines = ocrText.split(/\r?\n/);

  for (const line of lines) {
    for (const term of substringTerms) {
      const idx = line.toLowerCase().indexOf(term.toLowerCase());
      if (idx === -1) continue;
      const match = VALUE_PATTERN.exec(line.slice(idx + term.length));
      if (match) return match[0].trim();
    }
  }

  // Alias (singkatan) sering pendek (mis. "hb", "pa") dan berisiko cocok di
  // tengah kata lain yang tidak berhubungan — wajib batas kata (\b) di sini,
  // beda dari nama lengkap di atas yang aman dicocokkan sebagai substring.
  for (const line of lines) {
    for (const term of aliasTerms) {
      const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
      const found = regex.exec(line);
      if (!found) continue;
      const match = VALUE_PATTERN.exec(line.slice(found.index + found[0].length));
      if (match) return match[0].trim();
    }
  }
  return '';
}
