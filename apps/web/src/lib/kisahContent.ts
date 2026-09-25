export interface KisahEntry {
  readonly judul: string;
  readonly isi: string;
}

/** Ringkasan umum, disusun dari riwayat sejarah Islam yang luas dikenal —
 * bukan rujukan akademis/fikih, untuk gambaran awal saja. */
export const SIRAH_NABAWIYAH: readonly KisahEntry[] = [
  {
    judul: '1. Kelahiran & Masa Kecil',
    isi: 'Nabi Muhammad ﷺ lahir di Mekah pada Tahun Gajah (± 570 M), dari pasangan Abdullah dan Aminah. Beliau menjadi yatim sejak sebelum lahir (ayahnya wafat) dan ditinggal ibunya saat berusia 6 tahun, lalu diasuh kakeknya Abdul Muthalib dan kemudian pamannya Abu Thalib. Masa kecilnya sempat disusukan di pedalaman oleh Halimah Sa\'diyah, sesuai tradisi bangsawan Quraisy saat itu.',
  },
  {
    judul: '2. Sebelum Kenabian',
    isi: 'Beliau tumbuh dikenal jujur dan amanah, mendapat julukan "Al-Amin" (yang tepercaya) dari masyarakat Quraisy. Pada usia 25 tahun beliau menikahi Khadijah binti Khuwailid, saudagar terpandang yang lebih tua darinya. Menjelang usia 40 tahun, beliau sering menyendiri untuk merenung di Gua Hira di Jabal Nur, dekat Mekah.',
  },
  {
    judul: '3. Wahyu Pertama & Dakwah Sembunyi-sembunyi',
    isi: 'Pada 17 Ramadan (± 610 M), Malaikat Jibril menyampaikan wahyu pertama, surah Al-\'Alaq ayat 1-5 ("Iqra\'..."), menandai awal kenabian. Tiga tahun pertama, dakwah dilakukan secara sembunyi-sembunyi di kalangan terdekat — di antara yang pertama masuk Islam adalah Khadijah, Abu Bakar, Ali bin Abi Thalib, dan Zaid bin Haritsah.',
  },
  {
    judul: '4. Dakwah Terang-terangan & Penyiksaan',
    isi: 'Dakwah kemudian dilakukan terbuka dan mendapat penolakan keras kaum Quraisy, termasuk penyiksaan terhadap pengikut Nabi dari kalangan lemah (mis. keluarga Yasir) dan boikot ekonomi-sosial terhadap Bani Hasyim selama sekitar 3 tahun. Tahun ke-10 kenabian disebut "Tahun Kesedihan" (Aam al-Huzn) karena wafatnya Khadijah dan Abu Thalib, dua pendukung utama Nabi.',
  },
  {
    judul: '5. Isra Mi\'raj',
    isi: 'Sekitar setahun sebelum hijrah, Nabi ﷺ melakukan perjalanan malam dari Masjidil Haram (Mekah) ke Masjidil Aqsa (Yerusalem) lalu naik ke langit (Isra Mi\'raj), peristiwa yang menjadi asal-usul perintah sholat lima waktu.',
  },
  {
    judul: '6. Hijrah ke Madinah',
    isi: 'Tahun 622 M, menghadapi ancaman pembunuhan di Mekah, Nabi ﷺ dan Abu Bakar hijrah ke Yatsrib (kemudian disebut Madinah) — peristiwa ini menjadi titik awal penanggalan Hijriyah. Di Madinah, Nabi mempersaudarakan kaum Muhajirin (pendatang dari Mekah) dan Anshar (penduduk asli Madinah), serta menyusun Piagam Madinah yang mengatur hidup berdampingan berbagai kelompok termasuk komunitas Yahudi setempat.',
  },
  {
    judul: '7. Periode Madinah & Peperangan',
    isi: 'Sepuluh tahun di Madinah diwarnai sejumlah peperangan mempertahankan komunitas Muslim yang baru terbentuk — di antaranya Badar, Uhud, Khandaq, hingga akhirnya Fathu Makkah (lihat bagian "Kisah Perang Rasulullah" untuk ringkasan masing-masing).',
  },
  {
    judul: '8. Fathu Makkah (Pembebasan Mekah)',
    isi: 'Tahun 8 H (630 M), Mekah dibebaskan hampir tanpa pertumpahan darah. Nabi ﷺ memaafkan penduduk Mekah yang dulu memusuhinya, termasuk membersihkan Ka\'bah dari berhala-berhala.',
  },
  {
    judul: '9. Haji Wada\' & Wafatnya Rasulullah',
    isi: 'Tahun 10 H (632 M), Nabi ﷺ melaksanakan haji terakhirnya (Haji Wada\') dan menyampaikan Khutbah Perpisahan yang berisi pesan-pesan pokok ajaran Islam. Beliau wafat pada 12 Rabiul Awal 11 H (632 M) di Madinah, dan dimakamkan di rumah istrinya Aisyah, yang kini menjadi bagian dari Masjid Nabawi.',
  },
];

export const KISAH_25_NABI: readonly KisahEntry[] = [
  { judul: '1. Adam AS', isi: 'Manusia dan nabi pertama, diciptakan langsung oleh Allah dan ditempatkan di surga bersama Hawa, lalu diturunkan ke bumi setelah tergoda memakan buah terlarang. Kisahnya menjadi awal mula kehidupan manusia di bumi.' },
  { judul: '2. Idris AS', isi: 'Dikenal sebagai nabi yang tekun beribadah dan berilmu, disebut dalam Al-Qur\'an sebagai pribadi yang jujur dan diangkat ke kedudukan tinggi.' },
  { judul: '3. Nuh AS', isi: 'Berdakwah selama ratusan tahun kepada kaumnya yang menyembah berhala, namun hanya sedikit yang beriman. Allah menyelamatkannya bersama pengikutnya lewat bahtera besar saat banjir bandang melanda kaumnya yang durhaka.' },
  { judul: '4. Hud AS', isi: 'Diutus kepada kaum \'Ad yang dikenal kuat secara fisik namun sombong dan menyembah berhala. Kaum yang mengingkarinya dibinasakan dengan angin topan dahsyat.' },
  { judul: '5. Saleh AS', isi: 'Diutus kepada kaum Tsamud, dikenal lewat mukjizat unta betina yang keluar dari batu. Kaumnya yang membunuh unta tersebut dibinasakan dengan petir dan gempa.' },
  { judul: '6. Ibrahim AS', isi: 'Dikenal sebagai "Bapak para Nabi" (Abul Anbiya), menentang penyembahan berhala termasuk berhala buatan ayahnya sendiri, selamat dari dibakar hidup-hidup, dan membangun ulang Ka\'bah bersama putranya Ismail.' },
  { judul: '7. Luth AS', isi: 'Diutus kepada kaum Sodom yang dikenal karena perilaku menyimpang; kaum yang tidak beriman dibinasakan, sementara Luth dan keluarganya yang beriman diselamatkan (kecuali istrinya).' },
  { judul: '8. Ismail AS', isi: 'Putra Nabi Ibrahim, terkenal lewat kisah kesediaannya disembelih sebagai ujian ketaatan kepada Allah, yang kemudian diganti dengan seekor domba — menjadi asal-usul ibadah kurban.' },
  { judul: '9. Ishaq AS', isi: 'Putra Nabi Ibrahim dari Sarah, menjadi kakek moyang para nabi Bani Israil setelahnya, termasuk keturunan langsung Nabi Ya\'qub.' },
  { judul: '10. Ya\'qub AS', isi: 'Putra Nabi Ishaq, ayah dari 12 keturunan yang menjadi cikal bakal Bani Israil, termasuk Nabi Yusuf.' },
  { judul: '11. Yusuf AS', isi: 'Dikenal lewat kisah panjang penuh ujian — dibuang saudara-saudaranya ke sumur, dijual sebagai budak, difitnah, dipenjara, hingga akhirnya diangkat menjadi pejabat tinggi Mesir dan mempertemukan kembali keluarganya.' },
  { judul: '12. Ayyub AS', isi: 'Dikenal sebagai teladan kesabaran menghadapi ujian berat — kehilangan harta, keluarga, dan kesehatan — namun tetap teguh bersyukur hingga akhirnya dipulihkan Allah.' },
  { judul: '13. Syu\'aib AS', isi: 'Diutus kepada penduduk Madyan yang curang dalam berdagang (mengurangi takaran timbangan); kaum yang mengingkarinya dibinasakan dengan gempa dan suara keras.' },
  { judul: '14. Musa AS', isi: 'Diutus kepada Fir\'aun dan Bani Israil, dikenal lewat mukjizat tongkat yang berubah jadi ular dan membelah Laut Merah saat membebaskan Bani Israil dari perbudakan Mesir.' },
  { judul: '15. Harun AS', isi: 'Saudara Nabi Musa yang diutus mendampinginya berdakwah kepada Fir\'aun karena kefasihannya berbicara, membantu memimpin Bani Israil.' },
  { judul: '16. Zulkifli AS', isi: 'Dikenal karena kesabaran dan keteguhannya dalam menjalankan amanah serta ibadah, disebut dalam Al-Qur\'an bersama nabi-nabi yang sabar lainnya.' },
  { judul: '17. Daud AS', isi: 'Dikenal lewat kisah mengalahkan raksasa Jalut (Goliath) semasa muda, kemudian diangkat menjadi raja sekaligus nabi, dikaruniai suara merdu saat membaca Zabur dan kemampuan melunakkan besi.' },
  { judul: '18. Sulaiman AS', isi: 'Putra Nabi Daud, dikaruniai kerajaan besar serta kemampuan berbicara dengan hewan dan mengendalikan jin serta angin — termasuk kisah pertemuannya dengan Ratu Balqis dari Saba.' },
  { judul: '19. Ilyas AS', isi: 'Diutus kepada Bani Israil yang menyembah berhala Ba\'al, mengajak mereka kembali menyembah Allah semata.' },
  { judul: '20. Ilyasa AS', isi: 'Meneruskan dakwah Nabi Ilyas kepada Bani Israil, dikenal sebagai pribadi yang sabar dan istiqamah dalam berdakwah.' },
  { judul: '21. Yunus AS', isi: 'Dikenal lewat kisah ditelan ikan besar setelah meninggalkan kaumnya tanpa izin Allah karena putus asa; ia bertaubat di dalam perut ikan dan akhirnya diselamatkan, sementara kaumnya di Ninawa justru beriman secara keseluruhan.' },
  { judul: '22. Zakaria AS', isi: 'Berdoa memohon keturunan di usia senja, dikaruniai putra bernama Yahya sebagai jawaban doanya yang tulus.' },
  { judul: '23. Yahya AS', isi: 'Putra Nabi Zakaria, dikenal sebagai pribadi yang suci, tekun beribadah sejak kecil, dan berdakwah kepada Bani Israil hingga akhir hayatnya sebagai syahid.' },
  { judul: '24. Isa AS', isi: 'Lahir dari Maryam tanpa ayah sebagai mukjizat, diutus kepada Bani Israil dengan mukjizat menyembuhkan orang sakit dan menghidupkan yang mati atas izin Allah; dalam akidah Islam beliau tidak disalib melainkan diangkat oleh Allah.' },
  { judul: '25. Muhammad ﷺ', isi: 'Nabi dan Rasul terakhir, diutus untuk seluruh umat manusia, membawa Al-Qur\'an sebagai wahyu penutup — kisah lengkap perjalanan hidupnya ada di bagian "Sirah Nabawiyah".' },
];

export const PERANG_RASULULLAH: readonly KisahEntry[] = [
  {
    judul: 'Perang Badar (2 H / 624 M)',
    isi: 'Pertempuran besar pertama, antara ± 313 pasukan Muslim melawan ± 1.000 pasukan Quraisy Mekah. Meski kalah jumlah jauh, pasukan Muslim menang telak — dianggap kemenangan yang menegaskan berdirinya komunitas Muslim Madinah.',
  },
  {
    judul: 'Perang Uhud (3 H / 625 M)',
    isi: 'Quraisy membalas kekalahan Badar. Pasukan Muslim sempat unggul, namun sebagian pasukan pemanah meninggalkan pos demi mengejar harta rampasan sebelum perang usai, membuka celah serangan balik yang menyebabkan kekalahan dan banyak korban, termasuk paman Nabi, Hamzah bin Abdul Muthalib. Menjadi pelajaran penting soal disiplin dan ketaatan pada komando.',
  },
  {
    judul: 'Perang Khandaq / Ahzab (5 H / 627 M)',
    isi: 'Koalisi besar suku-suku Arab dan Yahudi mengepung Madinah. Atas usulan sahabat Persia, Salman Al-Farisi, kaum Muslim menggali parit (khandaq) mengelilingi kota — strategi yang belum dikenal bangsa Arab saat itu — sehingga pengepungan gagal total tanpa pertempuran besar.',
  },
  {
    judul: 'Perjanjian Hudaibiyah (6 H / 628 M)',
    isi: 'Bukan peperangan, melainkan perjanjian damai dengan Quraisy Mekah saat Nabi dan pengikutnya hendak melaksanakan umrah namun dihalangi. Meski sejumlah pasalnya awalnya terasa merugikan pihak Muslim, perjanjian ini justru membuka jalan dakwah lebih luas dan damai.',
  },
  {
    judul: 'Perang Khaibar (7 H / 628 M)',
    isi: 'Penaklukan benteng-benteng Yahudi di Khaibar yang sebelumnya kerap bersekongkol menyerang Madinah, mengakhiri ancaman dari wilayah tersebut.',
  },
  {
    judul: 'Fathu Makkah (8 H / 630 M)',
    isi: 'Pembebasan kota Mekah setelah pihak Quraisy melanggar Perjanjian Hudaibiyah. Nabi ﷺ memasuki Mekah nyaris tanpa perlawanan dan memberi amnesti umum kepada penduduknya, termasuk mereka yang dulu memusuhinya.',
  },
  {
    judul: 'Perang Hunain (8 H / 630 M)',
    isi: 'Terjadi tak lama setelah Fathu Makkah, melawan suku Hawazin dan Tsaqif. Pasukan Muslim sempat terdesak di awal karena serangan mendadak, namun akhirnya meraih kemenangan.',
  },
  {
    judul: 'Perang Tabuk (9 H / 630 M)',
    isi: 'Ekspedisi militer terakhir yang dipimpin langsung Nabi ﷺ, menghadapi ancaman dari arah Romawi (Byzantium) di utara. Pertempuran besar tidak terjadi karena pasukan Romawi mundur, namun ekspedisi ini memperkuat posisi Madinah di kawasan utara Jazirah Arab.',
  },
];

export const KISAH_KARBALA: readonly KisahEntry[] = [
  {
    judul: 'Latar Belakang',
    isi: 'Setelah wafatnya Muawiyah bin Abi Sufyan (60 H/680 M), putranya Yazid bin Muawiyah naik menjadi khalifah Bani Umayyah. Husain bin Ali (cucu Nabi Muhammad ﷺ dari putrinya Fatimah) menolak membaiat Yazid, memandang pengangkatannya secara turun-temurun menyimpang dari prinsip musyawarah kepemimpinan umat.',
  },
  {
    judul: 'Perjalanan ke Kufah',
    isi: 'Menerima banyak surat dukungan dari penduduk Kufah (Irak) yang mengajaknya memimpin, Husain berangkat bersama rombongan kecil keluarga dan pengikutnya. Di tengah perjalanan, dukungan di Kufah keburu dipatahkan oleh gubernur setempat, Ubaidillah bin Ziyad, dan rombongan Husain dicegat serta dikepung di padang Karbala, dekat Sungai Efrat.',
  },
  {
    judul: 'Peristiwa 10 Muharram (Hari Asyura)',
    isi: 'Setelah dikepung beberapa hari dan diputus aksesnya ke air, rombongan Husain — diperkirakan sekitar 70-an orang termasuk anggota keluarganya — dihadapkan pasukan Umayyah yang jauh lebih besar pada 10 Muharram 61 H (680 M). Husain dan hampir seluruh pengikut laki-lakinya gugur dalam pertempuran tak seimbang tersebut; anggota keluarga yang selamat (termasuk putranya, Ali Zainal Abidin, yang sedang sakit) ditawan.',
  },
  {
    judul: 'Makna & Peringatannya',
    isi: 'Peristiwa Karbala menjadi salah satu tragedi paling diperingati dalam sejarah Islam. Dalam tradisi Syiah, Hari Asyura diperingati sebagai hari berkabung besar mengenang pengorbanan Husain. Banyak kalangan Sunni juga menghormati Husain sebagai cucu Nabi yang mulia dan memandang peristiwa ini sebagai tragedi besar dalam sejarah umat, meski tata cara peringatannya berbeda antar tradisi.',
  },
];
