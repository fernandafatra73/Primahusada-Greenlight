import Tesseract from 'tesseract.js';

/// Jalankan OCR di browser (tanpa AI/network ke server) atas foto hasil
/// pemeriksaan lab, dan kembalikan teks mentah yang terbaca.
export async function runOcr(imageDataUrl: string): Promise<string> {
  const result = await Tesseract.recognize(imageDataUrl, 'eng');
  return result.data.text;
}

const VALUE_PATTERN = /\d+\s*\/\s*\d+|\(\s*[+-]\s*\)|negatif|positif|[-+]?\d[\d.,]*\s*%?/i;

/// Cari nilai hasil untuk satu parameter di dalam teks hasil OCR. Mencari
/// baris yang menyebut nama parameter (nama lengkap atau singkatan dalam
/// kurung, mis. "Hb" dari "Hemoglobin (Hb)"), lalu ambil token bernilai
/// (angka, rasio titer "1/320", atau tanda +/-/negatif/positif) pertama
/// setelah nama itu di baris yang sama. Mengembalikan string kosong kalau
/// tidak ketemu — tidak menebak-nebak.
export function extractValueForParameter(ocrText: string, parameterName: string): string {
  const abbrevMatch = /\(([^)]+)\)/.exec(parameterName);
  const mainName = parameterName.replace(/\([^)]*\)/, '').trim();
  const searchTerms = [mainName, abbrevMatch?.[1]?.trim()].filter(
    (term): term is string => term !== undefined && term.length >= 2,
  );
  if (searchTerms.length === 0) return '';

  for (const line of ocrText.split(/\r?\n/)) {
    for (const term of searchTerms) {
      const idx = line.toLowerCase().indexOf(term.toLowerCase());
      if (idx === -1) continue;
      const match = VALUE_PATTERN.exec(line.slice(idx + term.length));
      if (match) return match[0].trim();
    }
  }
  return '';
}
