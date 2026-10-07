import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type {
  LisensiCetakBagian,
  LisensiCetakLampiran,
} from '../lib/lisensi.ts';

export interface LisensiDocumentData {
  readonly logoSrc: string;
  readonly judul: string;
  readonly tanggalCetak: string;
  readonly bagian: ReadonlyArray<LisensiCetakBagian>;
  /** `src` sudah berupa data URL PNG/JPEG yang bisa dibaca react-pdf. */
  readonly lampiran: ReadonlyArray<LisensiCetakLampiran>;
  /** Cetak ringkas ("Cetak Semua"): baris dan tanda tangan dirapatkan supaya daftar muat satu halaman. */
  readonly padat?: boolean;
}

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  page: { padding: 14, fontFamily: 'Helvetica', fontSize: 9, color: BLACK },
  frame: { borderWidth: 1.5, borderColor: BLUE, padding: 14, flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  logo: { width: 48, height: 48, marginRight: 12, objectFit: 'contain' },
  headerText: { flex: 1 },
  clinicSmall: { fontSize: 8 },
  clinicName: { fontSize: 17, fontWeight: 'bold', color: BLUE, marginTop: 1 },
  clinicAddress: { fontSize: 8, color: '#64748b', marginTop: 2 },
  divider: {
    height: 2.5,
    backgroundColor: BLUE,
    marginTop: 10,
    marginBottom: 14,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  table: { borderWidth: 0.8, borderColor: BLACK },
  thRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderBottomWidth: 0.8,
    borderColor: BLACK,
    paddingVertical: 4,
    fontWeight: 'bold',
  },
  trRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderColor: '#cbd5e1',
    minHeight: 18,
  },
  cell: { paddingHorizontal: 4, paddingVertical: 3 },
  colNo: { width: 28, textAlign: 'center' },
  colTtd: { width: 120, alignItems: 'center' },
  ttdSmall: { width: 100, height: 36, objectFit: 'contain' },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  signatureBox: { alignItems: 'center', width: 180 },
  signatureJabatan: { fontSize: 9, marginBottom: 4 },
  signatureImage: { width: 150, height: 56, objectFit: 'contain' },
  signatureSpacer: { height: 56 },
  signatureName: {
    fontSize: 9,
    fontWeight: 'bold',
    borderBottomWidth: 0.8,
    borderColor: BLACK,
    paddingBottom: 2,
    minHeight: 13,
    width: '100%',
    textAlign: 'center',
  },
  trRowPadat: { minHeight: 13 },
  cellPadat: { paddingVertical: 1.5 },
  thRowPadat: { paddingVertical: 2 },
  ttdPadat: { width: 70, height: 22, objectFit: 'contain' },
  sectionTitlePadat: { marginTop: 4, marginBottom: 2 },
  signatureSectionPadat: { marginTop: 8 },
  signatureImagePadat: { width: 110, height: 34, objectFit: 'contain' },
  signatureSpacerPadat: { height: 34 },
  lampiranTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 8 },
  lampiranImage: { width: '100%', maxHeight: 640, objectFit: 'contain' },
});

/** Kop surat klinik, dipakai juga oleh cetakan Surat Sehat dan Hasil Lab karyawan. */
export function Kop({ logoSrc }: { readonly logoSrc: string }) {
  return (
    <>
      <View style={styles.headerRow}>
        {logoSrc ? <Image style={styles.logo} src={logoSrc} /> : null}
        <View style={styles.headerText}>
          <Text style={styles.clinicSmall}>
            KLINIK ROENTGEN, USG DAN LABORATORIUM
          </Text>
          <Text style={styles.clinicName}>PRIMA HUSADA</Text>
          <Text style={styles.clinicAddress}>
            Jl Siliwangi No 28 A Parung Kuda Telp. 0857-1932-5557
          </Text>
        </View>
      </View>
      <View style={styles.divider} />
    </>
  );
}

function Tabel({
  bagian,
  padat,
}: {
  readonly bagian: Extract<LisensiCetakBagian, { tipe: 'tabel' }>;
  readonly padat: boolean;
}) {
  // Kolom No dan tanda tangan berlebar tetap; kolom teks berbagi sisa lebar.
  const kolomTeks = bagian.kolom.slice(1);
  return (
    <View>
      <Text
        style={padat ? [styles.sectionTitle, styles.sectionTitlePadat] : styles.sectionTitle}
      >
        {bagian.judul}
      </Text>
      <View style={styles.table}>
        <View
          style={padat ? [styles.thRow, styles.thRowPadat] : styles.thRow}
          fixed
        >
          <Text style={[styles.cell, padat ? styles.cellPadat : {}, styles.colNo]}>{bagian.kolom[0]}</Text>
          {kolomTeks.map((label) => (
            <Text key={label} style={[styles.cell, padat ? styles.cellPadat : {}, { flex: 1 }]}>
              {label}
            </Text>
          ))}
          {bagian.kolomTtd ? (
            <Text style={[styles.cell, styles.colTtd]}>{bagian.kolomTtd}</Text>
          ) : null}
        </View>
        {bagian.baris.map((baris, idx) => (
          <View
            key={idx}
            style={padat ? [styles.trRow, styles.trRowPadat] : styles.trRow}
            wrap={false}
          >
            <Text style={[styles.cell, padat ? styles.cellPadat : {}, styles.colNo]}>{baris.sel[0]}</Text>
            {baris.sel.slice(1).map((isi, col) => (
              <Text key={col} style={[styles.cell, padat ? styles.cellPadat : {}, { flex: 1 }]}>
                {isi}
              </Text>
            ))}
            {bagian.kolomTtd ? (
              <View style={[styles.cell, styles.colTtd]}>
                {baris.ttd ? (
                  <Image
                    style={padat ? styles.ttdPadat : styles.ttdSmall}
                    src={baris.ttd}
                  />
                ) : (
                  <Text>—</Text>
                )}
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function Pejabat({
  bagian,
  tanggalCetak,
  padat,
}: {
  readonly bagian: Extract<LisensiCetakBagian, { tipe: 'pejabat' }>;
  readonly tanggalCetak: string;
  readonly padat: boolean;
}) {
  return (
    <View
      style={padat ? [styles.signatureSection, styles.signatureSectionPadat] : styles.signatureSection}
      wrap={false}
    >
      <View style={styles.signatureBox}>
        <Text style={styles.signatureJabatan}>Parung Kuda, {tanggalCetak}</Text>
        <Text style={styles.signatureJabatan}>{bagian.jabatan}</Text>
        {bagian.ttd ? (
          <Image
            style={padat ? styles.signatureImagePadat : styles.signatureImage}
            src={bagian.ttd}
          />
        ) : (
          <View style={padat ? styles.signatureSpacerPadat : styles.signatureSpacer} />
        )}
        <Text style={styles.signatureName}>{bagian.nama}</Text>
      </View>
    </View>
  );
}

/** Dokumen cetak menu Lisensi: kop surat, tabel per bagian, tanda tangan pejabat di bawah, lalu lampiran gambar. */
export function LisensiDocument({
  data,
}: {
  readonly data: LisensiDocumentData;
}) {
  return (
    <Document title={data.judul}>
      <Page size="A4" style={styles.page}>
        <View style={styles.frame}>
          <Kop logoSrc={data.logoSrc} />
          <Text style={styles.title}>{data.judul}</Text>
          <Text style={styles.subtitle}>
            Tanggal cetak: {data.tanggalCetak}
          </Text>
          {data.bagian.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#64748b' }}>
              Belum ada data.
            </Text>
          ) : null}
          {data.bagian.map((bagian, idx) =>
            bagian.tipe === 'tabel' ? (
              <Tabel key={idx} bagian={bagian} padat={data.padat === true} />
            ) : (
              <Pejabat
                key={idx}
                bagian={bagian}
                tanggalCetak={data.tanggalCetak}
                padat={data.padat === true}
              />
            ),
          )}
        </View>
      </Page>
      {data.lampiran.map((lampiran, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <View style={styles.frame}>
            <Kop logoSrc={data.logoSrc} />
            <Text style={styles.lampiranTitle}>Lampiran: {lampiran.judul}</Text>
            <Image style={styles.lampiranImage} src={lampiran.src} />
          </View>
        </Page>
      ))}
    </Document>
  );
}
