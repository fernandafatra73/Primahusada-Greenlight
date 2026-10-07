import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { Kop } from './LisensiDocument.tsx';

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  page: { padding: 14, fontFamily: 'Helvetica', fontSize: 10, color: BLACK },
  frame: { borderWidth: 1.5, borderColor: BLUE, padding: 18, flexGrow: 1 },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    textTransform: 'uppercase',
  },
  nomor: { fontSize: 9.5, textAlign: 'center', marginTop: 2, marginBottom: 14 },
  paragraf: { lineHeight: 1.6, textAlign: 'justify', marginBottom: 6 },
  dataTable: { paddingLeft: 14, marginBottom: 8 },
  dataRow: { flexDirection: 'row', marginBottom: 3 },
  dataLabel: { width: 140 },
  dataColon: { width: 12 },
  dataValue: { flex: 1, fontWeight: 'bold' },
  kesimpulan: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
    textTransform: 'uppercase',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  signatureBox: { alignItems: 'center', width: 200 },
  signatureText: { fontSize: 10, marginBottom: 2 },
  signatureImage: { width: 150, height: 60, objectFit: 'contain' },
  signatureSpacer: { height: 60 },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  signatureRole: { fontSize: 9, color: '#475569', marginTop: 2 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 3,
    color: BLUE,
  },
  table: { borderWidth: 0.8, borderColor: BLACK },
  thRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderBottomWidth: 0.8,
    borderColor: BLACK,
    paddingVertical: 3,
    fontWeight: 'bold',
    fontSize: 9,
  },
  trRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#cbd5e1',
    paddingVertical: 2.5,
    fontSize: 9,
  },
  colParam: { width: '34%', paddingLeft: 4 },
  colHasil: { width: '20%', paddingLeft: 4, fontWeight: 'bold' },
  colSatuan: { width: '16%', paddingLeft: 4 },
  colNormal: { width: '30%', paddingLeft: 4 },
});

function Baris({
  label,
  isi,
}: {
  readonly label: string;
  readonly isi: string | null;
}) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataColon}>:</Text>
      <Text style={styles.dataValue}>{isi?.trim() || '-'}</Text>
    </View>
  );
}

export interface SuratSehatKaryawanData {
  readonly logoSrc: string;
  readonly nomorSurat: string | null;
  readonly nama: string;
  readonly jabatan: string | null;
  readonly tempatTanggalLahir: string | null;
  readonly jenisKelamin: string | null;
  readonly alamat: string | null;
  readonly tanggalPeriksa: string;
  readonly tinggiBadan: string | null;
  readonly beratBadan: string | null;
  readonly tekananDarah: string | null;
  readonly nadi: string | null;
  readonly butaWarna: string | null;
  readonly kesimpulanLabel: string;
  readonly keperluan: string | null;
  readonly catatan: string | null;
  readonly namaDokter: string;
  readonly sipDokter: string | null;
  /** Data URL PNG tanda tangan dokter. */
  readonly ttdDokter: string | null;
}

/** Surat keterangan sehat karyawan dengan tanda tangan dokter. */
export function SuratSehatKaryawanDocument({
  data,
}: {
  readonly data: SuratSehatKaryawanData;
}) {
  const satuan = (isi: string | null, unit: string): string | null =>
    isi?.trim() ? `${isi.trim()} ${unit}` : null;
  return (
    <Document title={`Surat_Sehat_${data.nama}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.frame}>
          <Kop logoSrc={data.logoSrc} />
          <Text style={styles.title}>Surat Keterangan Sehat</Text>
          <Text style={styles.nomor}>
            Nomor: {data.nomorSurat?.trim() || '..........................'}
          </Text>

          <Text style={styles.paragraf}>
            Yang bertanda tangan di bawah ini, dokter pemeriksa, menerangkan
            bahwa:
          </Text>
          <View style={styles.dataTable}>
            <Baris label="Nama" isi={data.nama} />
            <Baris
              label="Tempat, Tanggal Lahir"
              isi={data.tempatTanggalLahir}
            />
            <Baris label="Jenis Kelamin" isi={data.jenisKelamin} />
            <Baris label="Jabatan / Pekerjaan" isi={data.jabatan} />
            <Baris label="Alamat" isi={data.alamat} />
          </View>

          <Text style={styles.paragraf}>
            Telah dilakukan pemeriksaan kesehatan pada tanggal{' '}
            {data.tanggalPeriksa} dengan hasil:
          </Text>
          <View style={styles.dataTable}>
            <Baris label="Tinggi Badan" isi={satuan(data.tinggiBadan, 'cm')} />
            <Baris label="Berat Badan" isi={satuan(data.beratBadan, 'kg')} />
            <Baris
              label="Tekanan Darah"
              isi={satuan(data.tekananDarah, 'mmHg')}
            />
            <Baris label="Nadi" isi={satuan(data.nadi, 'x/menit')} />
            <Baris label="Buta Warna" isi={data.butaWarna} />
            {data.catatan ? <Baris label="Catatan" isi={data.catatan} /> : null}
          </View>

          <Text style={styles.paragraf}>
            Berdasarkan hasil pemeriksaan tersebut, yang bersangkutan
            dinyatakan:
          </Text>
          <Text style={styles.kesimpulan}>{data.kesimpulanLabel}</Text>
          <Text style={styles.paragraf}>
            Surat keterangan ini dibuat untuk keperluan{' '}
            {data.keperluan?.trim() || 'perizinan'} dan dapat dipergunakan
            sebagaimana mestinya.
          </Text>

          <View style={styles.signatureSection} wrap={false}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureText}>
                Parung Kuda, {data.tanggalPeriksa}
              </Text>
              <Text style={styles.signatureText}>Dokter Pemeriksa</Text>
              {data.ttdDokter ? (
                <Image style={styles.signatureImage} src={data.ttdDokter} />
              ) : (
                <View style={styles.signatureSpacer} />
              )}
              <Text style={styles.signatureName}>{data.namaDokter}</Text>
              {data.sipDokter ? (
                <Text style={styles.signatureRole}>SIP: {data.sipDokter}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export interface HasilLabKaryawanData {
  readonly logoSrc: string;
  readonly nama: string;
  readonly jabatan: string | null;
  readonly tanggalPeriksa: string;
  readonly catatan: string | null;
  readonly kelompok: ReadonlyArray<{
    readonly jenis: string;
    readonly baris: ReadonlyArray<{
      readonly parameter: string;
      readonly hasil: string;
      readonly satuan: string | null;
      readonly nilaiNormal: string | null;
    }>;
  }>;
}

/** Hasil laboratorium tahunan karyawan, dikelompokkan per jenis pemeriksaan. */
export function HasilLabKaryawanDocument({
  data,
}: {
  readonly data: HasilLabKaryawanData;
}) {
  return (
    <Document title={`Hasil_Lab_${data.nama}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.frame}>
          <Kop logoSrc={data.logoSrc} />
          <Text style={[styles.title, { marginBottom: 12 }]}>
            Hasil Pemeriksaan Laboratorium
          </Text>
          <View style={styles.dataTable}>
            <Baris label="Nama" isi={data.nama} />
            <Baris label="Jabatan / Pekerjaan" isi={data.jabatan} />
            <Baris label="Tanggal Pemeriksaan" isi={data.tanggalPeriksa} />
          </View>

          {data.kelompok.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#64748b' }}>
              Belum ada hasil pemeriksaan.
            </Text>
          ) : null}
          {data.kelompok.map((k) => (
            <View key={k.jenis} wrap={false}>
              <Text style={styles.sectionTitle}>{k.jenis}</Text>
              <View style={styles.table}>
                <View style={styles.thRow}>
                  <Text style={styles.colParam}>Pemeriksaan</Text>
                  <Text style={styles.colHasil}>Hasil</Text>
                  <Text style={styles.colSatuan}>Satuan</Text>
                  <Text style={styles.colNormal}>Nilai Normal</Text>
                </View>
                {k.baris.map((b, idx) => (
                  <View key={idx} style={styles.trRow}>
                    <Text style={styles.colParam}>{b.parameter}</Text>
                    <Text style={styles.colHasil}>{b.hasil}</Text>
                    <Text style={styles.colSatuan}>{b.satuan || '-'}</Text>
                    <Text style={styles.colNormal}>{b.nilaiNormal || '-'}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {data.catatan ? (
            <Text style={[styles.paragraf, { marginTop: 10 }]}>
              Catatan: {data.catatan}
            </Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
