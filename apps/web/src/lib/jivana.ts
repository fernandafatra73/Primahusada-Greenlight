// ── Weton (kalender Jawa: hari pasaran) ─────────────────────────────────

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
const NEPTU_HARI = [5, 4, 3, 7, 8, 6, 9] as const;
const PASARAN = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'] as const;
const NEPTU_PASARAN = [5, 9, 7, 4, 8] as const;

const SIFAT_HARI: Record<(typeof HARI)[number], string> = {
  Minggu: 'Energik, percaya diri, dan senang jadi pusat perhatian. Punya jiwa kepemimpinan alami.',
  Senin: 'Perasa dan penuh pertimbangan, setia pada orang-orang terdekat, cenderung berhati-hati mengambil keputusan.',
  Selasa: 'Pekerja keras dan ambisius, punya tekad kuat mengejar tujuan, meski kadang keras kepala.',
  Rabu: 'Cerdas, komunikatif, dan mudah beradaptasi di lingkungan baru — pandai bergaul.',
  Kamis: 'Bijaksana, suka belajar hal baru, dan dikenal dermawan pada sesama.',
  Jumat: 'Penyayang, punya sisi artistik, dan mudah berempati pada perasaan orang lain.',
  Sabtu: 'Disiplin dan tekun, meski sedikit tertutup dan butuh waktu untuk percaya pada orang baru.',
};

const SIFAT_PASARAN: Record<(typeof PASARAN)[number], string> = {
  Legi: 'Ramah, mudah bergaul, murah senyum, dan menurut kepercayaan primbon rezekinya cenderung lancar.',
  Pahing: 'Berani dan berwibawa, gampang naik darah tapi juga cepat reda — jiwa pemimpin yang tegas.',
  Pon: 'Bijaksana dan disegani lingkungannya, suka menolong, tipe penengah saat ada konflik.',
  Wage: 'Pendiam dan banyak pikiran, tapi teguh pendirian dan bisa diandalkan saat sudah berkomitmen.',
  Kliwon: 'Karismatik dan penuh intuisi kuat (dipercaya punya "indra keenam" yang tajam) menurut kepercayaan Jawa.',
};

export interface Weton {
  readonly hari: string;
  readonly pasaran: string;
  readonly neptuHari: number;
  readonly neptuPasaran: number;
  readonly neptuTotal: number;
  readonly sifatHari: string;
  readonly sifatPasaran: string;
}

function toJulianDayNumber(date: Date): number {
  const Y = date.getFullYear();
  const M = date.getMonth() + 1;
  const D = date.getDate();
  const a = Math.floor((14 - M) / 12);
  const y = Y + 4800 - a;
  const m = M + 12 * a - 3;
  return (
    D +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Pasaran dihitung dari siklus 5 harian yang berjalan terus-menerus tanpa
 * putus sejak berabad-abad lalu — dikalibrasi memakai 17 Agustus 1945 yang
 * secara luas dikenal jatuh pada Jumat Legi (JDN 2.431.685, habis dibagi 5). */
export function getWeton(date: Date): Weton {
  const hariIdx = date.getDay();
  const jdn = toJulianDayNumber(date);
  const pasaranIdx = ((jdn % 5) + 5) % 5;
  const hari = HARI[hariIdx]!;
  const pasaran = PASARAN[pasaranIdx]!;
  const neptuHari = NEPTU_HARI[hariIdx]!;
  const neptuPasaran = NEPTU_PASARAN[pasaranIdx]!;
  return {
    hari,
    pasaran,
    neptuHari,
    neptuPasaran,
    neptuTotal: neptuHari + neptuPasaran,
    sifatHari: SIFAT_HARI[hari],
    sifatPasaran: SIFAT_PASARAN[pasaran],
  };
}

// ── Zodiak (astrologi Barat) ─────────────────────────────────────────────

export interface ZodiacSign {
  readonly id: string;
  readonly nama: string;
  readonly namaIndonesia: string;
  readonly simbol: string;
  readonly periode: string;
  readonly sifat: string;
}

const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  {
    id: 'aries',
    nama: 'Aries',
    namaIndonesia: 'Domba',
    simbol: '♈',
    periode: '21 Maret – 19 April',
    sifat: 'Berani, penuh semangat, dan suka tantangan baru — tipe yang cepat bertindak lebih dulu ketimbang banyak pikir.',
  },
  {
    id: 'taurus',
    nama: 'Taurus',
    namaIndonesia: 'Banteng',
    simbol: '♉',
    periode: '20 April – 20 Mei',
    sifat: 'Tekun, suka kenyamanan dan kestabilan, serta setia — tapi keras kepala kalau sudah punya pendirian.',
  },
  {
    id: 'gemini',
    nama: 'Gemini',
    namaIndonesia: 'Kembar',
    simbol: '♊',
    periode: '21 Mei – 20 Juni',
    sifat: 'Cerdas, komunikatif, dan serba ingin tahu — cepat bosan kalau rutinitasnya itu-itu saja.',
  },
  {
    id: 'cancer',
    nama: 'Cancer',
    namaIndonesia: 'Kepiting',
    simbol: '♋',
    periode: '21 Juni – 22 Juli',
    sifat: 'Penyayang, sangat melindungi orang terdekat, dan peka terhadap perasaan orang lain.',
  },
  {
    id: 'leo',
    nama: 'Leo',
    namaIndonesia: 'Singa',
    simbol: '♌',
    periode: '23 Juli – 22 Agustus',
    sifat: 'Percaya diri, punya jiwa pemimpin, dan senang tampil — tapi butuh diakui atas usahanya.',
  },
  {
    id: 'virgo',
    nama: 'Virgo',
    namaIndonesia: 'Perawan',
    simbol: '♍',
    periode: '23 Agustus – 22 September',
    sifat: 'Teliti, perfeksionis, dan analitis — pekerja keras yang detail-oriented.',
  },
  {
    id: 'libra',
    nama: 'Libra',
    namaIndonesia: 'Timbangan',
    simbol: '♎',
    periode: '23 September – 22 Oktober',
    sifat: 'Suka keseimbangan dan keharmonisan, diplomatis, tapi kadang sulit mengambil keputusan.',
  },
  {
    id: 'scorpio',
    nama: 'Scorpio',
    namaIndonesia: 'Kalajengking',
    simbol: '♏',
    periode: '23 Oktober – 21 November',
    sifat: 'Intens, penuh determinasi, dan loyal — tapi tertutup soal perasaannya sendiri.',
  },
  {
    id: 'sagittarius',
    nama: 'Sagittarius',
    namaIndonesia: 'Pemanah',
    simbol: '♐',
    periode: '22 November – 21 Desember',
    sifat: 'Petualang, optimis, dan suka kebebasan — jujur apa adanya, kadang terlalu blak-blakan.',
  },
  {
    id: 'capricorn',
    nama: 'Capricorn',
    namaIndonesia: 'Kambing Laut',
    simbol: '♑',
    periode: '22 Desember – 19 Januari',
    sifat: 'Disiplin, ambisius, dan bertanggung jawab — berorientasi jangka panjang dalam meraih tujuan.',
  },
  {
    id: 'aquarius',
    nama: 'Aquarius',
    namaIndonesia: 'Pembawa Air',
    simbol: '♒',
    periode: '20 Januari – 18 Februari',
    sifat: 'Independen, punya banyak ide orisinal, dan peduli isu sosial — kadang terkesan cuek.',
  },
  {
    id: 'pisces',
    nama: 'Pisces',
    namaIndonesia: 'Ikan',
    simbol: '♓',
    periode: '19 Februari – 20 Maret',
    sifat: 'Imajinatif, penuh empati, dan intuitif — mudah larut dalam perasaan orang lain.',
  },
];

export function getZodiacSign(date: Date): ZodiacSign {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const md = m * 100 + d;
  if (md >= 321 && md <= 419) return ZODIAC_SIGNS[0]!;
  if (md >= 420 && md <= 520) return ZODIAC_SIGNS[1]!;
  if (md >= 521 && md <= 620) return ZODIAC_SIGNS[2]!;
  if (md >= 621 && md <= 722) return ZODIAC_SIGNS[3]!;
  if (md >= 723 && md <= 822) return ZODIAC_SIGNS[4]!;
  if (md >= 823 && md <= 922) return ZODIAC_SIGNS[5]!;
  if (md >= 923 && md <= 1022) return ZODIAC_SIGNS[6]!;
  if (md >= 1023 && md <= 1121) return ZODIAC_SIGNS[7]!;
  if (md >= 1122 && md <= 1221) return ZODIAC_SIGNS[8]!;
  if (md >= 1222 || md <= 119) return ZODIAC_SIGNS[9]!;
  if (md >= 120 && md <= 218) return ZODIAC_SIGNS[10]!;
  return ZODIAC_SIGNS[11]!;
}
