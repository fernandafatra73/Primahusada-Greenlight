/** Jumlah rakaat fardhu per waktu sholat — Subuh 2 rakaat (bukan 3; ini
 * jumlah baku di semua mazhab), Dzuhur/Ashar/Isya 4, Maghrib 3. */
export const RAKAAT_PER_SHOLAT: Record<string, number> = {
  Subuh: 2,
  Dzuhur: 4,
  Ashar: 4,
  Maghrib: 3,
  Isya: 4,
};

const NIAT: Record<string, string> = {
  Subuh: 'Ushallii fardhash shubhi rak\'ataini mustaqbilal qiblati adaa\'an (ma\'muuman/imaaman) lillaahi ta\'aalaa.',
  Dzuhur: 'Ushallii fardhazh zhuhri arba\'a raka\'aatin mustaqbilal qiblati adaa\'an (ma\'muuman/imaaman) lillaahi ta\'aalaa.',
  Ashar: 'Ushallii fardhal \'ashri arba\'a raka\'aatin mustaqbilal qiblati adaa\'an (ma\'muuman/imaaman) lillaahi ta\'aalaa.',
  Maghrib: 'Ushallii fardhal maghribi tsalaatsa raka\'aatin mustaqbilal qiblati adaa\'an (ma\'muuman/imaaman) lillaahi ta\'aalaa.',
  Isya: 'Ushallii fardhal \'isyaa\'i arba\'a raka\'aatin mustaqbilal qiblati adaa\'an (ma\'muuman/imaaman) lillaahi ta\'aalaa.',
};

/** Surah pendek yang dibaca di rakaat 1 & 2 — dipilih dari surah-surah
 * pendek populer supaya ringkas; bukan aturan baku, boleh diganti surah
 * lain saat sholat sungguhan. */
const SURAH_PENDEK = [
  { nomor: 112, nama: 'Al-Ikhlas', juz: 30 },
  { nomor: 113, nama: 'Al-Falaq', juz: 30 },
  { nomor: 114, nama: 'An-Nas', juz: 30 },
];

export interface SholatStep {
  readonly id: string;
  readonly judul: string;
  readonly arab: string;
  readonly latin: string;
  readonly arti: string;
  readonly durasiDetik: number;
  /** Kalau diisi, langkah ini membacakan surah Qur'an sungguhan (Al-Fatihah
   * atau surah pendek) — teks & audionya diambil lewat Juz yang sama dengan
   * yang dipakai halaman Dirimu, bukan endpoint/teks terpisah. `juz` adalah
   * juz tempat surah itu berada (Al-Fatihah di Juz 1, Al-Ikhlas/Al-Falaq/
   * An-Nas di Juz 30). */
  readonly bacaSurah?: { readonly nomor: number; readonly nama: string; readonly juz: number };
}

const TAKBIRATUL_IHRAM: SholatStep = {
  id: 'takbir',
  judul: 'Takbiratul Ihram',
  arab: 'اَللهُ أَكْبَرُ',
  latin: 'Allaahu Akbar',
  arti: 'Allah Maha Besar — mengangkat kedua tangan, memulai sholat.',
  durasiDetik: 5,
};

const DOA_IFTITAH: SholatStep = {
  id: 'iftitah',
  judul: 'Doa Iftitah',
  arab: 'اَللهُ أَكْبَرُ كَبِيرًا وَالْحَمْدُ لِلَّهِ كَثِيرًا وَسُبْحَانَ اللهِ بُكْرَةً وَأَصِيلًا',
  latin: 'Allaahu akbaru kabiiraa, walhamdu lillaahi katsiiraa, wa subhaanallaahi bukratan wa ashiilaa',
  arti: 'Allah Maha Besar dengan sebenar-benarnya, segala puji bagi Allah sebanyak-banyaknya, dan Maha Suci Allah sepanjang pagi dan petang. Dibaca sekali di rakaat pertama, sebelum Al-Fatihah.',
  durasiDetik: 8,
};

const RUKU: SholatStep = {
  id: 'ruku',
  judul: "Ruku'",
  arab: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ وَبِحَمْدِهِ',
  latin: "Subhaana rabbiyal 'azhiimi wa bihamdih (3x)",
  arti: 'Maha Suci Tuhanku Yang Maha Agung, dan segala puji bagi-Nya.',
  durasiDetik: 10,
};

const ITIDAL: SholatStep = {
  id: 'itidal',
  judul: "I'tidal",
  arab: 'سَمِعَ اللهُ لِمَنْ حَمِدَهُ، رَبَّنَا وَلَكَ الْحَمْدُ',
  latin: "Sami'allaahu liman hamidah, rabbanaa wa lakal hamd",
  arti: 'Allah mendengar orang yang memuji-Nya. Ya Tuhan kami, bagi-Mu segala puji.',
  durasiDetik: 6,
};

function sujud(ke: 1 | 2): SholatStep {
  return {
    id: `sujud-${ke}`,
    judul: `Sujud ${ke === 1 ? 'Pertama' : 'Kedua'}`,
    arab: 'سُبْحَانَ رَبِّيَ الْأَعْلَى وَبِحَمْدِهِ',
    latin: "Subhaana rabbiyal a'laa wa bihamdih (3x)",
    arti: 'Maha Suci Tuhanku Yang Maha Tinggi, dan segala puji bagi-Nya.',
    durasiDetik: 10,
  };
}

const DUDUK_ANTARA_SUJUD: SholatStep = {
  id: 'duduk-antara-sujud',
  judul: 'Duduk di Antara Dua Sujud',
  arab: 'رَبِّ اغْفِرْ لِي وَارْحَمْنِي وَاجْبُرْنِي وَارْفَعْنِي وَارْزُقْنِي وَاهْدِنِي وَعَافِنِي وَاعْفُ عَنِّي',
  latin: "Rabbighfirlii warhamnii wajburnii warfa'nii warzuqnii wahdinii wa'aafinii wa'fu 'annii",
  arti: 'Ya Tuhanku, ampunilah aku, sayangilah aku, cukupkanlah kekuranganku, angkatlah derajatku, berilah aku rezeki, berilah aku petunjuk, berilah aku kesehatan, dan maafkanlah aku.',
  durasiDetik: 8,
};

const TAHIYYAT =
  'اَلتَّحِيَّاتُ الْمُبَارَكَاتُ الصَّلَوَاتُ الطَّيِّبَاتُ لِلَّهِ، اَلسَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ، اَلسَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللهِ';
const TAHIYYAT_LATIN =
  "Attahiyyaatul mubaarakaatush shalawaatuth thayyibaatu lillaah, assalaamu 'alaika ayyuhan nabiyyu wa rahmatullaahi wa barakaatuh, assalaamu 'alainaa wa 'alaa 'ibaadillaahish shaalihiin, asyhadu allaa ilaaha illallaah wa asyhadu anna muhammadar rasuulullaah";
const TAHIYYAT_ARTI =
  'Segala penghormatan, keberkahan, doa, dan kebaikan hanya milik Allah. Semoga kesejahteraan, rahmat, dan berkah Allah tercurah kepadamu wahai Nabi. Semoga kesejahteraan tercurah pada kami dan hamba-hamba Allah yang saleh. Aku bersaksi tiada tuhan selain Allah dan Muhammad adalah utusan Allah.';

const TASYAHUD_AWAL: SholatStep = {
  id: 'tasyahud-awal',
  judul: 'Tasyahud Awal',
  arab: `${TAHIYYAT} اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ`,
  latin: `${TAHIYYAT_LATIN}. Allaahumma shalli 'alaa Muhammad`,
  arti: `${TAHIYYAT_ARTI} Dilanjutkan shalawat pendek: Ya Allah, limpahkanlah rahmat kepada Nabi Muhammad.`,
  durasiDetik: 16,
};

const TASYAHUD_AKHIR: SholatStep = {
  id: 'tasyahud-akhir',
  judul: 'Tasyahud Akhir',
  arab: `${TAHIYYAT} اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ. وَبَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ`,
  latin: `${TAHIYYAT_LATIN}. Allaahumma shalli 'alaa Muhammad wa 'alaa aali Muhammad, kamaa shallaita 'alaa Ibraahiim wa 'alaa aali Ibraahiim, innaka hamiidum majiid. Wa baarik 'alaa Muhammad wa 'alaa aali Muhammad, kamaa baarakta 'alaa Ibraahiim wa 'alaa aali Ibraahiim, innaka hamiidum majiid`,
  arti: `${TAHIYYAT_ARTI} Dilanjutkan Sholawat Ibrahimiyah: Ya Allah, limpahkanlah rahmat dan berkah kepada Nabi Muhammad dan keluarganya, sebagaimana Engkau limpahkan kepada Nabi Ibrahim dan keluarganya. Sesungguhnya Engkau Maha Terpuji lagi Maha Mulia.`,
  durasiDetik: 24,
};

const SALAM: SholatStep = {
  id: 'salam',
  judul: 'Salam',
  arab: 'اَلسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ',
  latin: "Assalaamu 'alaikum wa rahmatullaah",
  arti: 'Semoga keselamatan dan rahmat Allah terlimpah atas kalian — menoleh ke kanan lalu ke kiri, menutup sholat.',
  durasiDetik: 6,
};

function niatStep(namaSholat: string, jumlahRakaat: number): SholatStep {
  return {
    id: 'niat',
    judul: `Niat Sholat ${namaSholat}`,
    arab: '',
    latin: NIAT[namaSholat] ?? '',
    arti: `Aku berniat sholat fardhu ${namaSholat} ${jumlahRakaat} rakaat menghadap kiblat karena Allah Ta'ala.`,
    durasiDetik: 6,
  };
}

/** Menyusun urutan lengkap gerakan & bacaan sholat untuk satu waktu sholat,
 * sesuai jumlah rakaat fardhu-nya masing-masing. Bacaan Al-Fatihah & surah
 * pendek ditandai `bacaSurah` supaya komponen pemutar bisa mengambil
 * teks+audio Qur'an sungguhan dari API, bukan teks statis. */
export function buildSholatSteps(namaSholat: string): readonly SholatStep[] {
  const jumlahRakaat = RAKAAT_PER_SHOLAT[namaSholat] ?? 2;
  const steps: SholatStep[] = [niatStep(namaSholat, jumlahRakaat), TAKBIRATUL_IHRAM, DOA_IFTITAH];

  for (let rakaat = 1; rakaat <= jumlahRakaat; rakaat++) {
    if (rakaat > 1) {
      steps.push({
        id: `berdiri-${rakaat}`,
        judul: `Berdiri — Rakaat ke-${rakaat}`,
        arab: '',
        latin: '',
        arti: `Bangkit berdiri untuk memulai rakaat ke-${rakaat}.`,
        durasiDetik: 4,
      });
    }
    steps.push({
      id: `fatihah-${rakaat}`,
      judul: `Al-Fatihah — Rakaat ke-${rakaat}`,
      arab: '',
      latin: '',
      arti: 'Membaca Surah Al-Fatihah.',
      durasiDetik: 25,
      bacaSurah: { nomor: 1, nama: 'Al-Fatihah', juz: 1 },
    });
    if (rakaat <= 2) {
      const surah = SURAH_PENDEK[rakaat - 1]!;
      steps.push({
        id: `surah-${rakaat}`,
        judul: `Surah Pendek — Rakaat ke-${rakaat}`,
        arab: '',
        latin: '',
        arti: `Membaca ${surah.nama} (contoh surah pendek — boleh diganti surah lain saat sholat sungguhan).`,
        durasiDetik: 15,
        bacaSurah: { nomor: surah.nomor, nama: surah.nama, juz: surah.juz },
      });
    }
    steps.push(RUKU, ITIDAL, sujud(1), DUDUK_ANTARA_SUJUD, sujud(2));

    const isRakaatTerakhir = rakaat === jumlahRakaat;
    if (isRakaatTerakhir) {
      steps.push(TASYAHUD_AKHIR, SALAM);
    } else if (rakaat === 2 && jumlahRakaat > 2) {
      steps.push(TASYAHUD_AWAL);
    }
  }

  return steps;
}
