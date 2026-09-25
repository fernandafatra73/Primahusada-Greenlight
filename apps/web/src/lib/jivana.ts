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

/** Menurut kepercayaan primbon Jawa — rezeki dikaitkan dengan pasaran
 * kelahiran, bukan dari neptu total (yang lebih sering dipakai untuk
 * petung jodoh/hari baik). */
const REJEKI_PASARAN: Record<(typeof PASARAN)[number], string> = {
  Legi: 'Rezekinya cenderung lancar dan mengalir lewat pergaulan luas — banyak dipercaya datang dari relasi & jejaring pertemanan.',
  Pahing: 'Rezekinya naik-turun tapi biasanya besar saat datang — cocok merintis usaha sendiri atau posisi yang butuh pengambilan risiko.',
  Pon: 'Rezekinya cenderung stabil, sering datang lewat kerja keras dan bantuan orang lain yang dipercaya membawa berkah.',
  Wage: 'Rezekinya butuh usaha & kesabaran ekstra di awal, tapi menurut kepercayaan Jawa hasilnya lebih tahan lama saat sudah didapat.',
  Kliwon: 'Rezekinya dipercaya sering datang dari jalan tak terduga — insting bisnis/intuisinya dipercaya cukup tajam untuk melihat peluang.',
};

export interface Weton {
  readonly hari: string;
  readonly pasaran: string;
  readonly neptuHari: number;
  readonly neptuPasaran: number;
  readonly neptuTotal: number;
  readonly sifatHari: string;
  readonly sifatPasaran: string;
  readonly rejeki: string;
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
    rejeki: REJEKI_PASARAN[pasaran],
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
  readonly karier: string;
  readonly pasangan: string;
}

const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  {
    id: 'aries',
    nama: 'Aries',
    namaIndonesia: 'Domba',
    simbol: '♈',
    periode: '21 Maret – 19 April',
    sifat: 'Berani, penuh semangat, dan suka tantangan baru — tipe yang cepat bertindak lebih dulu ketimbang banyak pikir.',
    karier: 'Cocok di peran yang butuh inisiatif cepat & kepemimpinan: wirausahawan, sales, manajer proyek, atlet, atau militer.',
    pasangan: 'Paling nyambung dengan Leo dan Sagittarius (sesama elemen api), atau Gemini yang bisa mengimbangi energinya.',
  },
  {
    id: 'taurus',
    nama: 'Taurus',
    namaIndonesia: 'Banteng',
    simbol: '♉',
    periode: '20 April – 20 Mei',
    sifat: 'Tekun, suka kenyamanan dan kestabilan, serta setia — tapi keras kepala kalau sudah punya pendirian.',
    karier: 'Cocok di bidang yang butuh ketekunan & rasa: keuangan/perbankan, kuliner, seni, atau desain.',
    pasangan: 'Paling nyambung dengan Virgo dan Capricorn (sesama elemen tanah), atau Cancer yang sama-sama mendambakan kestabilan.',
  },
  {
    id: 'gemini',
    nama: 'Gemini',
    namaIndonesia: 'Kembar',
    simbol: '♊',
    periode: '21 Mei – 20 Juni',
    sifat: 'Cerdas, komunikatif, dan serba ingin tahu — cepat bosan kalau rutinitasnya itu-itu saja.',
    karier: 'Cocok di bidang komunikasi: jurnalis, penulis, marketing, guru, atau presenter.',
    pasangan: 'Paling nyambung dengan Libra dan Aquarius (sesama elemen udara), atau Aries yang sama-sama energik.',
  },
  {
    id: 'cancer',
    nama: 'Cancer',
    namaIndonesia: 'Kepiting',
    simbol: '♋',
    periode: '21 Juni – 22 Juli',
    sifat: 'Penyayang, sangat melindungi orang terdekat, dan peka terhadap perasaan orang lain.',
    karier: 'Cocok di bidang perawatan & kepedulian: kesehatan, pendidikan anak, hospitality, atau pekerjaan sosial.',
    pasangan: 'Paling nyambung dengan Scorpio dan Pisces (sesama elemen air), atau Taurus yang sama-sama mendambakan rumah yang hangat.',
  },
  {
    id: 'leo',
    nama: 'Leo',
    namaIndonesia: 'Singa',
    simbol: '♌',
    periode: '23 Juli – 22 Agustus',
    sifat: 'Percaya diri, punya jiwa pemimpin, dan senang tampil — tapi butuh diakui atas usahanya.',
    karier: 'Cocok jadi pemimpin/manajer, entertainer, public speaker, atau posisi yang menempatkannya di depan.',
    pasangan: 'Paling nyambung dengan Aries dan Sagittarius (sesama elemen api), atau Libra yang mengagumi karismanya.',
  },
  {
    id: 'virgo',
    nama: 'Virgo',
    namaIndonesia: 'Perawan',
    simbol: '♍',
    periode: '23 Agustus – 22 September',
    sifat: 'Teliti, perfeksionis, dan analitis — pekerja keras yang detail-oriented.',
    karier: 'Cocok di bidang analisis: akuntansi, riset, kesehatan, quality control, atau administrasi.',
    pasangan: 'Paling nyambung dengan Taurus dan Capricorn (sesama elemen tanah), atau Cancer yang sama-sama perhatian pada detail.',
  },
  {
    id: 'libra',
    nama: 'Libra',
    namaIndonesia: 'Timbangan',
    simbol: '♎',
    periode: '23 September – 22 Oktober',
    sifat: 'Suka keseimbangan dan keharmonisan, diplomatis, tapi kadang sulit mengambil keputusan.',
    karier: 'Cocok di bidang hukum, diplomasi, HR, desain, atau sebagai mediator/penengah.',
    pasangan: 'Paling nyambung dengan Gemini dan Aquarius (sesama elemen udara), atau Leo yang melengkapi sisi sosialnya.',
  },
  {
    id: 'scorpio',
    nama: 'Scorpio',
    namaIndonesia: 'Kalajengking',
    simbol: '♏',
    periode: '23 Oktober – 21 November',
    sifat: 'Intens, penuh determinasi, dan loyal — tapi tertutup soal perasaannya sendiri.',
    karier: 'Cocok di bidang investigasi & riset mendalam: kedokteran, psikologi, intelijen, atau peneliti.',
    pasangan: 'Paling nyambung dengan Cancer dan Pisces (sesama elemen air), atau Virgo yang menghargai kedalamannya.',
  },
  {
    id: 'sagittarius',
    nama: 'Sagittarius',
    namaIndonesia: 'Pemanah',
    simbol: '♐',
    periode: '22 November – 21 Desember',
    sifat: 'Petualang, optimis, dan suka kebebasan — jujur apa adanya, kadang terlalu blak-blakan.',
    karier: 'Cocok di bidang yang melibatkan perjalanan/eksplorasi: pariwisata, pendidikan tinggi, jurnalistik internasional, atau wirausaha lintas negara.',
    pasangan: 'Paling nyambung dengan Aries dan Leo (sesama elemen api), atau Aquarius yang sama-sama menghargai kebebasan.',
  },
  {
    id: 'capricorn',
    nama: 'Capricorn',
    namaIndonesia: 'Kambing Laut',
    simbol: '♑',
    periode: '22 Desember – 19 Januari',
    sifat: 'Disiplin, ambisius, dan bertanggung jawab — berorientasi jangka panjang dalam meraih tujuan.',
    karier: 'Cocok di posisi struktural jangka panjang: manajemen, teknik, pemerintahan, atau kewirausahaan yang butuh perencanaan matang.',
    pasangan: 'Paling nyambung dengan Taurus dan Virgo (sesama elemen tanah), atau Scorpio yang menghargai keseriusannya.',
  },
  {
    id: 'aquarius',
    nama: 'Aquarius',
    namaIndonesia: 'Pembawa Air',
    simbol: '♒',
    periode: '20 Januari – 18 Februari',
    sifat: 'Independen, punya banyak ide orisinal, dan peduli isu sosial — kadang terkesan cuek.',
    karier: 'Cocok di bidang teknologi, riset & inovasi, aktivisme sosial, atau merintis start-up.',
    pasangan: 'Paling nyambung dengan Gemini dan Libra (sesama elemen udara), atau Sagittarius yang sama-sama independen.',
  },
  {
    id: 'pisces',
    nama: 'Pisces',
    namaIndonesia: 'Ikan',
    simbol: '♓',
    periode: '19 Februari – 20 Maret',
    sifat: 'Imajinatif, penuh empati, dan intuitif — mudah larut dalam perasaan orang lain.',
    karier: 'Cocok di bidang seni & empati: seni rupa, musik, konseling/terapi, atau pekerjaan sosial-kemanusiaan.',
    pasangan: 'Paling nyambung dengan Cancer dan Scorpio (sesama elemen air), atau Taurus yang menenangkan sisi sensitifnya.',
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
