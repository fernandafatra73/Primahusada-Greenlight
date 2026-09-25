import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import '../components/ui/ui.css';

interface Section {
  readonly title: string;
  readonly body: readonly string[];
}

const SECTIONS: readonly Section[] = [
  {
    title: '1. Pengantar',
    body: [
      'Mazhab Hanafi adalah salah satu dari empat mazhab fikih utama Ahlus Sunnah wal Jamaah (bersama Maliki, Syafi\'i, dan Hanbali). Mazhab ini adalah yang tertua di antara keempatnya dan hingga kini dianut oleh jumlah Muslim terbesar di dunia, terutama di Asia Selatan, Asia Tengah, Turki, dan kawasan bekas Kesultanan Utsmaniyah.',
    ],
  },
  {
    title: '2. Pendiri',
    body: [
      'Didirikan oleh Imam Abu Hanifah, Nu\'man bin Tsabit (lahir ± 80 H/699 M di Kufah, Irak — wafat 150 H/767 M di Baghdad). Beliau seorang pedagang sekaligus ulama yang belajar fikih terutama dari Hammad bin Abi Sulaiman, dan dikenal karena ketajaman nalar (ra\'yu) serta kehati-hatiannya dalam berfatwa.',
      'Abu Hanifah sendiri tidak banyak menulis kitab fikih secara langsung — mazhab ini kemudian disusun dan dibukukan secara sistematis oleh murid-muridnya, terutama Abu Yusuf dan Muhammad bin Hasan asy-Syaibani.',
    ],
  },
  {
    title: '3. Dasar Pengambilan Hukum (Ushul Fikih)',
    body: [
      'Urutan sumber hukum yang dipakai: Al-Qur\'an, As-Sunnah (dengan syarat periwayatan yang ketat), Ijma\' (kesepakatan ulama), Qiyas (analogi), lalu Istihsan (preferensi hukum demi kemaslahatan bila qiyas terasa janggal), dan mempertimbangkan \'Urf (adat/kebiasaan setempat) selama tidak bertentangan syariat.',
      'Ciri khasnya adalah penekanan yang relatif besar pada ra\'yu (penalaran/analogi) dibanding mazhab lain — salah satu sebabnya karena Kufah, tempat mazhab ini lahir, memiliki hadis yang tersebar lebih sedikit dibanding Madinah, sehingga ulamanya lebih banyak menyusun kaidah lewat qiyas dan istihsan.',
    ],
  },
  {
    title: '4. Tokoh-Tokoh Penting',
    body: [
      '• Imam Abu Hanifah — pendiri.',
      '• Abu Yusuf (Ya\'qub bin Ibrahim) — murid utama, menjadi Qadhi al-Qudhah (hakim agung) pertama di era Abbasiyah, berperan besar menyebarkan mazhab ini lewat lembaga peradilan negara.',
      '• Muhammad bin Hasan asy-Syaibani — membukukan pendapat-pendapat mazhab dalam karya-karya "Zahir ar-Riwayah" yang jadi rujukan inti.',
      '• Generasi belakangan: Ath-Thahawi, As-Sarakhsi, Al-Marghinani (penulis Al-Hidayah), dan Ibnu Abidin (penulis Radd al-Muhtar, rujukan fatwa Hanafi paling berpengaruh di era Utsmaniyah).',
    ],
  },
  {
    title: '5. Kitab-Kitab Rujukan Utama',
    body: [
      '• Al-Mabsuth — Imam As-Sarakhsi',
      '• Al-Hidayah — Imam Al-Marghinani (salah satu kitab fikih paling banyak disyarah dalam sejarah Islam)',
      '• Fath al-Qadir — Ibnu al-Humam (syarah atas Al-Hidayah)',
      '• Radd al-Muhtar \'ala ad-Durr al-Mukhtar (Hasyiah Ibnu Abidin) — rujukan fatwa paling otoritatif di akhir masa mazhab klasik',
      "• Al-Fatawa al-Hindiyyah (al-'Alamgiriyyah) — kumpulan fatwa yang disusun atas perintah Kaisar Mughal Aurangzeb",
    ],
  },
  {
    title: '6. Penyebaran & Pengaruh Sejarah',
    body: [
      'Karena Abu Yusuf menjabat sebagai hakim agung Dinasti Abbasiyah, mazhab Hanafi menjadi mazhab resmi negara sejak awal, lalu diteruskan sebagai mazhab resmi Kesultanan Utsmaniyah dan Kesultanan Mughal di India. Warisan ini membuat mazhab Hanafi kini dominan di: Turki, Balkan, Kaukasus, Asia Tengah (Uzbekistan, Tajikistan, dll.), Afghanistan, serta Asia Selatan (Pakistan, India, Bangladesh) — termasuk mayoritas Muslim di Indonesia bagian yang berlatar tarekat/ulama asal Asia Selatan, meski mayoritas Muslim Indonesia sendiri umumnya bermazhab Syafi\'i.',
    ],
  },
  {
    title: '7. Beberapa Contoh Ciri Pandangan Fikih (Ilustrasi, Bukan Daftar Lengkap)',
    body: [
      'Catatan: poin-poin di bawah ini sekadar contoh populer untuk menggambarkan corak pemikiran mazhab, bukan rujukan fatwa — untuk keputusan hukum praktis, tetap perlu merujuk ke ustadz/kitab mazhab langsung.',
      '• Relatif fleksibel/rasional dalam menyikapi kasus-kasus baru lewat qiyas & istihsan.',
      '• Dalam banyak bab (mis. jual-beli, muamalah, hukum non-Muslim di negeri Muslim/ahl adz-dzimmah), mazhab ini historisnya dikenal cukup akomodatif dan pragmatis karena berkembang di Kufah yang kosmopolitan dan pusat perdagangan.',
      '• Memberi ruang cukup besar pada \'urf (kebiasaan setempat) selama tidak melanggar nash syariat — memudahkan penyebarannya lintas budaya (Turki, Persia, Asia Selatan) tanpa banyak gesekan adat lokal.',
    ],
  },
  {
    title: '8. Penutup',
    body: [
      'Halaman ini adalah ringkasan umum untuk pengetahuan dasar, disusun dari sumber-sumber sejarah fikih yang umum dikenal. Untuk kajian mendalam atau keputusan hukum (fatwa) praktis, disarankan merujuk langsung ke kitab-kitab mazhab di atas atau berkonsultasi dengan ustadz/ulama yang berkompeten di bidang fikih Hanafi.',
    ],
  },
];

export function MazhabHanafiPage() {
  return (
    <ListPageShell title="HN — Mazhab Hanafi" subtitle="Ringkasan umum tentang mazhab fikih Hanafi">
      <div style={{ padding: '1rem', maxWidth: '860px', margin: '0 auto' }}>
        {SECTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>{section.title}</h3>
            {section.body.map((p, i) => (
              <p key={i} style={{ color: '#334155', lineHeight: 1.7, margin: '0 0 0.6rem' }}>
                {p}
              </p>
            ))}
          </div>
        ))}
      </div>
    </ListPageShell>
  );
}
