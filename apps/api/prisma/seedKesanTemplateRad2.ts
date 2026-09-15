import { parseKesanTemplateTsv } from '../src/lib/kesanTemplateImport.js';
import { prisma } from '../src/lib/prisma.js';

/** Daftar kesan dari klinik (PEMERIKSAAN, BACAAN1, BACAAN2, BACAAN3), disalin apa adanya. */
const KESAN_ROWS: ReadonlyArray<readonly string[]> = [
  ['PEMERIKSAAN', 'BACAAN1', 'BACAAN2', 'BACAAN3'],
  ['Cruris R', 'Tampak fraktur os cruris dextra', '', ''],
  ['Kepala', 'Lesi daerah fronto temporo parietal dextra', 'Susp SOL daerah fronto temporo parietal dextra', 'Saran: CT-Scan Kepala'],
  ['Thorak', 'Post Kp, tidak tampak aktifitas', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'Tb paru aktif paru kanan dan kiri', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'Tb paru aktif paru kanan dan kiri, dd/BP', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'Tb paru aktif paru kanan dan kiri, Bronchitis', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'BP Kanan dan kiri', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'BP Kanan dan kiri, dd/TB', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'BP Kanan dan kiri, dd/bronchitis', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'Bronchitis', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'Bronchitis, dd/TB', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'Bronchitis, dd/BP', 'Tidak tampak cardiomegali', ''],
  ['Genu R+L', '0steoarthrosis os genu bilateral grade II', '', ''],
  ['Genu R', '0steoarthrosis os genu dextra grade II', '', ''],
  ['Genu L', '0steoarthrosis os genu sinistra grade II', '', ''],
  ['BNO', 'Tidak tampak urolitisis opak sepanjang Tract Urinarius', 'Tidak tampak distensi/penebalan dinding usus', ''],
  ['BNO+Susp ileus', 'Tampak Bayangan distensi usus di colon ascenden', 'dd/Ileus Lokal', ''],
  ['SPN bilateral', 'Sinusitis Maxilaris bilateral', '', ''],
  ['SPN kanan', 'Sinusitis masilaris dextra', '', ''],
  ['SPN kiri', 'Sinusitis maxilaris sinistra', '', ''],
  ['Lumbo-Sacral Ap/lat', 'Spondiloarthrosis vert lumbalis 4,5', 'Penyempitan foramen vert lumbalis L4-5 dan L5-S1 kanan', 'Susp ischialgia kanan'],
  ['Lumbo-Sacral Ap/lat', 'Spondiloarthrosis vert lumbalis 3,4,5', 'Penyempitan foramen vert lumbalis L3-4:L4-5 dan L5-S1 kanan', 'Susp ischialgia kanan'],
  ['Lumbo-Sacral Ap/lat', 'Spondiloarthrosis vert lumbalis 4,5', 'Penyempitan foramen vert lumbalis L4-5 dan L5-S1 kiri', 'Susp ischialgia kiri'],
  ['Lumbo-Sacral Ap/lat', 'Spondiloarthrosis vert lumbalis 3,4,5', 'Penyempitan foramen vert lumbalis L3-4:L4-5 dan L5-S1 kiri', 'Susp ischialgia kiri'],
  ['Lumbo-Sacral Ap/lat', 'Spondiloarthrosis vert lumbalis 4,5', 'Penyempitan foramen vert lumbalis L4-5 dan L5-S1 kanan', 'Susp ischialgia kanan, dd/HNP'],
  ['Lumbo-Sacral Ap/lat', 'Spondiloarthrosis vert lumbalis 4,5', 'Penyempitan foramen vert lumbalis L4-5 dan L5-S1 kiri', 'Susp ischialgia kiri, dd/HNP'],
  ['BNO+Batu', 'Tampak konkramen opak setinggi  L2', 'Susp nephrolithyasis sinistra', ''],
  ['BNO+Batu', 'Susp nephrolithyasis kanan', '', ''],
  ['Shoulder Joint R', 'Osteoarthritis shoulder dextra', 'dd/Frozen shoulder a/r dextra ', ''],
  ['Shoulder Joint L', 'Osteoarthritis shoulder sinistra', 'dd/Frozen shoulder a/r sinistra ', ''],
  ['USG Cysta', 'Cysta ovarium dextra', ' ', ''],
  ['BNO', 'Cysta ovarium dextra', ' Tidak tampak urolithysasis opak', ''],
  ['USG Normal', 'Tidak tampak urolitisis opak sepanjang Tract Urinarius', 'Struktur patenkhim ginjal, KE, hepar, Vu dalam batas normal', ''],
  ['USG Mammae dextra', 'Susp massa mammae dextra', 'dd/FAM', ''],
  ['USG Mammae sinistra', 'Susp massa mammae sinistra', 'dd/FAM', ''],
  ['BNO Perselubungan', 'Perangsangan peritoneum pada abdomen bagian atas tengah dan bawah', 'Tidak tampak distensi usus', ''],
  ['BNO Perselubungan te', 'Perangsangan peritoneum pada abdomen bagian tengah dan bawah', 'Tidak tampak distensi usus', ''],
  ['Ossa manus R', 'Tidak tampak fraktur ossa manus R', '', ''],
  ['Oeshopagus', 'Oeshopagotis pada oeshopagus  1/3 proximal', '', ''],
  ['Effusi pleura kanan', 'effusi pleura kanan, ec tb paru aktif', '', ''],
  ['Effusi pleura kiri', 'effusi pleura kiri, ec tb paru aktif', '', ''],
  ['Cervikal Ap/Lat', 'ampak pembengkakan jaringan lunak pada colli lateral kiri', 'Susp pembesaran KGB colli lateral kiri', ''],
  ['Thorak HHD', 'Cardiomegali tanpa bendungan paru(HHD)', 'Tidak tampak KP paru aktif', ''],
  ['Thorak Cardiomegali+', 'Cardiomegali tanpa bendungan paru', 'Gbr bronchitis', ''],
  ['Thorak Cardiomegali+', 'Cardiomegali tanpa bendungan paru', 'Gbr bronchitis, dd/BP', ''],
  ['Thorak Cardiomegali+', 'Cardiomegali tanpa bendungan paru', 'Gbr bronchitis, dd/TB', ''],
  ['Thorak Cardiomegali+', 'Cardiomegali tanpa bendungan paru', 'Tb paru aktif', ''],
  ['Thorak Cardiomegali+', 'Cardiomegali tanpa bendungan paru', 'Tb paru aktif, dd/Bronchitis', ''],
  ['Thorak Cardiomegali ', 'Cardiomegali tanpa bendungan paru', 'BP kanan dan kiri', ''],
  ['Thorak Cardiomegali ', 'Cardiomegali tanpa bendungan paru', 'BP kanan dan kiri, dd/Bronchitis', ''],
  ['Thorak Cardiomegali ', 'Cardiomegali tanpa bendungan paru', 'BP kanan dan kiri, dd/TB', ''],
  ['BNO Udara berlebihan', 'Udara berlebihan intraabdomen dd/gr meteorismus', 'Tampak distensi dan penebalan dinding usus', ''],
  ['BNO susp local perit', 'Perangsangan peritoneum pada abdomen bagian tengah dan bawah', 'Susp peritonitis', ''],
  ['Thorak ', 'Post Kp, masih  tampak aktifitas, perbaikan', 'Tidak tampak cardiomegali', ''],
  ['Thorak Normal', 'Rontgenologis cor dan pulmo dalam batas normal', 'Rontgenologis cor dan pulmo dalam batas normal', ''],
  ['Thorak ', 'Rontgenologis cor dan pulmo dalam batas normal', '', ''],
  ['Thorak', 'Post Kp, tidak tampak aktifitas', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'Post Kp, tidak tampak aktifitas', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'Tb paru aktif paru kanan dan kiri, dd/Pneumonia', 'Tidak tampak cardiomegali', ''],
  ['Lumbo-Sacral Ap/lat', 'Spondiloarthrosis vert lumbalis 3,4,5', 'Penyempitan foramen vert lumbalis L3-4:L4-5 dan L5-S1 kanan', ''],
  ['Thorak', 'Tb paru aktif paru kanan dan kiri, dd/Pneumonia', 'Tidak tampak cardiomegali', ''],
  ['Thorak', 'Effusi pleura kanan, ec tb paru aktif', '', ''],
  ['MD', 'Tampak kontras mengisi gaster dan duedenum', 'Gastritis kronis, Tidak tampak ulcus', ''],
  ['Usg', 'Obs ascites ec dd/1, cirrhosis hepatis', '2. Peritonitis', ''],
  ['Usg Abdomen', 'Tidak tampak urolitisis opak sepanjang Tract Urinarius', 'Struktur parenkhim ginjal, KE, hepar, Vu dalam batas normal', ''],
  ['BNO', 'Obs Konstipasi', 'Saran : Foto coloon in loop', ''],
  ['Kepala', 'Tidak tampak fraktur  pada os cranium', 'Tidak tampak tanda TTIK', ''],
  ['Thorak', 'Pneumonia paru kanan dan kiri dd/tb', 'Tidak tampak cardiomegali', ''],
  ['Genu R', 'Osteoarhtrosis genu dextra grade II', '', ''],
  ['Genu L', 'Osteoarhtrosis genu sinistra grade II', '', ''],
  ['Femur R', 'Tampak fraktur os femoris dextra', '', ''],
];

async function main() {
  const rows = parseKesanTemplateTsv(KESAN_ROWS.map((cells) => cells.join('\t')).join('\n'));
  let created = 0;
  for (const row of rows) {
    // Aman dijalankan ulang: template dengan judul + isi yang sama tidak dibuat dobel.
    const existing = await prisma.kesanTemplate.findFirst({ where: { judul: row.judul, isi: row.isi } });
    if (!existing) {
      await prisma.kesanTemplate.create({ data: row });
      created += 1;
    }
  }
  console.log(`Master Kesan: ${created} template baru dari ${rows.length} baris unik (${KESAN_ROWS.length - 1} baris sumber).`);
}

main().finally(() => prisma.$disconnect());
