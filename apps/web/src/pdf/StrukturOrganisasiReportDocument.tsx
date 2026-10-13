import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface StrukturOrganisasiReportAnggota {
  readonly jabatan: string;
  readonly nama: string;
  /** Data URL PNG/JPEG (react-pdf tidak mendukung webp/gif), atau null bila belum ada foto. */
  readonly fotoSrc: string | null;
}

export interface StrukturOrganisasiReportData {
  readonly logoSrc: string;
  readonly pimpinan: StrukturOrganisasiReportAnggota;
  readonly penanggungJawab: StrukturOrganisasiReportAnggota;
  readonly unitKerja: readonly StrukturOrganisasiReportAnggota[];
}

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  page: { padding: 16, fontFamily: 'Helvetica', fontSize: 9, color: BLACK },
  frame: { height: '100%', borderWidth: 1, borderColor: BLACK, padding: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  logo: { width: 44, height: 44, marginRight: 10 },
  headerText: { flex: 1 },
  clinicName: { fontSize: 15, fontWeight: 'bold', color: BLUE, marginBottom: 2 },
  clinicAddress: { fontSize: 8, lineHeight: 1.35 },
  divider: { height: 2, backgroundColor: BLUE, marginVertical: 5 },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    color: BLUE,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginVertical: 8,
  },
  level: { alignItems: 'center' },
  connector: { width: 1.5, height: 14, backgroundColor: BLACK, alignSelf: 'center' },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderColor: BLACK,
    paddingTop: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 165,
    padding: 6,
    margin: 4,
    borderWidth: 0.8,
    borderColor: BLACK,
    borderRadius: 4,
  },
  cardMain: { borderColor: BLUE, borderWidth: 1.5 },
  foto: { width: 46, height: 46, borderRadius: 23, marginRight: 8, objectFit: 'cover' },
  fotoKosong: { width: 46, height: 46, borderRadius: 23, marginRight: 8, backgroundColor: '#e2e8f0' },
  cardText: { flex: 1 },
  jabatan: { fontSize: 7.5, color: '#475569' },
  nama: { fontSize: 9.5, fontWeight: 'bold' },
});

function Kartu({
  anggota,
  utama = false,
}: {
  readonly anggota: StrukturOrganisasiReportAnggota;
  readonly utama?: boolean;
}) {
  return (
    <View style={utama ? [styles.card, styles.cardMain] : styles.card} wrap={false}>
      {anggota.fotoSrc ? (
        <Image style={styles.foto} src={anggota.fotoSrc} />
      ) : (
        <View style={styles.fotoKosong} />
      )}
      <View style={styles.cardText}>
        <Text style={styles.jabatan}>{anggota.jabatan}</Text>
        <Text style={styles.nama}>{anggota.nama || '-'}</Text>
      </View>
    </View>
  );
}

export function StrukturOrganisasiReportDocument({
  data,
}: {
  readonly data: StrukturOrganisasiReportData;
}) {
  return (
    <Document title="Struktur_Organisasi.pdf">
      <Page size="A4" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.headerRow}>
            {data.logoSrc ? <Image style={styles.logo} src={data.logoSrc} /> : null}
            <View style={styles.headerText}>
              <Text style={styles.clinicName}>KLINIK PRIMA HUSADA</Text>
              <Text style={styles.clinicAddress}>
                Jl Siliwangi No 28 A Parung Kuda Telp. 0857-1932-5557
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.title}>Struktur Organisasi</Text>

          <View style={styles.level}>
            <Kartu anggota={data.pimpinan} utama />
          </View>
          <View style={styles.connector} />
          <View style={styles.level}>
            <Kartu anggota={data.penanggungJawab} utama />
          </View>
          <View style={styles.connector} />
          <View style={styles.unitRow}>
            {data.unitKerja.map((unit) => (
              <Kartu key={unit.jabatan} anggota={unit} />
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}
