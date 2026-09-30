import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { truncatePdfCell } from './pdfText.ts';

export interface Rad2ReportItem {
  readonly no: number;
  readonly nama: string;
  readonly umur: string;
  readonly tanggal: string;
  readonly pemeriksaan: string;
  readonly pengirim: string;
  readonly radiologi: string;
  readonly hargaFormatted: string;
  readonly sharingFormatted: string;
}

export interface Rad2ReportData {
  readonly logoSrc: string;
  readonly dokterLabel: string;
  readonly periodeLabel: string;
  readonly tanggalCetak: string;
  readonly items: readonly Rad2ReportItem[];
  readonly totalData: number;
  readonly totalHargaFormatted: string;
  readonly totalSharingFormatted: string;
  readonly adminNama: string;
}

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  page: { padding: 16, fontFamily: 'Helvetica', fontSize: 8.5, color: BLACK },
  frame: { borderWidth: 1, borderColor: BLACK, padding: 10, flexDirection: 'column' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  logo: { width: 44, height: 44, marginRight: 10 },
  headerText: { flex: 1 },
  clinicName: { fontSize: 15, fontWeight: 'bold', color: BLUE, marginBottom: 2 },
  clinicAddress: { fontSize: 8, lineHeight: 1.35 },
  divider: { height: 2, backgroundColor: BLUE, marginVertical: 5 },
  titleSection: { textAlign: 'center', marginVertical: 4 },
  reportTitle: { fontSize: 11, fontWeight: 'bold', color: BLUE, textTransform: 'uppercase' },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
    padding: 5,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  infoText: { fontSize: 8 },
  bold: { fontWeight: 'bold' },
  table: { marginVertical: 4, borderWidth: 0.8, borderColor: BLACK },
  thRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderBottomWidth: 0.8,
    borderColor: BLACK,
    paddingVertical: 4,
    fontWeight: 'bold',
    fontSize: 8,
  },
  trRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#cbd5e1', paddingVertical: 3, fontSize: 8 },
  colNo: { width: '4%', textAlign: 'center' },
  colNama: { width: '17%', paddingLeft: 3 },
  colUmur: { width: '6%', textAlign: 'center' },
  colTanggal: { width: '9%', textAlign: 'center' },
  colPemeriksaan: { width: '19%', paddingLeft: 3 },
  colPengirim: { width: '15%', paddingLeft: 3 },
  colRadiologi: { width: '12%', paddingLeft: 3 },
  colHarga: { width: '9%', textAlign: 'right', paddingRight: 3 },
  colSharing: { width: '9%', textAlign: 'right', paddingRight: 3 },
  summaryContainer: {
    marginTop: 8,
    alignSelf: 'flex-end',
    width: 240,
    borderWidth: 0.8,
    borderColor: BLACK,
    padding: 6,
    flexDirection: 'column',
    gap: 3,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 8 },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    fontWeight: 'bold',
    color: BLUE,
    paddingTop: 3,
    borderTopWidth: 0.8,
    borderColor: BLACK,
    marginTop: 2,
  },
  signatureSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18, paddingHorizontal: 20 },
  signatureBox: { alignItems: 'center', width: 150 },
  signatureTitle: { fontSize: 8, marginBottom: 28 },
  signatureName: {
    fontSize: 8,
    fontWeight: 'bold',
    borderTopWidth: 0.8,
    borderColor: BLACK,
    paddingTop: 2,
    width: '100%',
    textAlign: 'center',
  },
});

export function Rad2ReportDocument({ data }: { readonly data: Rad2ReportData }) {
  return (
    <Document title="Laporan_Rad2.pdf">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.headerRow}>
            {data.logoSrc ? <Image style={styles.logo} src={data.logoSrc} /> : null}
            <View style={styles.headerText}>
              <Text style={styles.clinicName}>KLINIK PRIMA HUSADA</Text>
              <Text style={styles.clinicAddress}>Jl Siliwangi No 28 A Parung Kuda Telp. 0857-1932-5557</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.titleSection}>
            <Text style={styles.reportTitle}>Laporan Register Rad2</Text>
          </View>

          <View style={styles.infoGrid}>
            <Text style={styles.infoText}>
              Dokter Pengirim: <Text style={styles.bold}>{data.dokterLabel}</Text>
            </Text>
            <Text style={styles.infoText}>
              Periode: <Text style={styles.bold}>{data.periodeLabel}</Text>
            </Text>
            <Text style={styles.infoText}>
              Tgl Cetak: <Text style={styles.bold}>{data.tanggalCetak}</Text>
            </Text>
          </View>

          <View style={styles.table}>
            <View style={styles.thRow} fixed>
              <Text style={styles.colNo}>No</Text>
              <Text style={styles.colNama}>Nama Pasien</Text>
              <Text style={styles.colUmur}>Umur</Text>
              <Text style={styles.colTanggal}>Tanggal</Text>
              <Text style={styles.colPemeriksaan}>Pemeriksaan</Text>
              <Text style={styles.colPengirim}>Dokter Pengirim</Text>
              <Text style={styles.colRadiologi}>Radiologi</Text>
              <Text style={styles.colHarga}>Harga</Text>
              <Text style={styles.colSharing}>Sharing</Text>
            </View>
            {data.items.length === 0 ? (
              <View style={styles.trRow}>
                <Text style={{ width: '100%', textAlign: 'center', paddingVertical: 4 }}>
                  Belum ada data untuk kriteria ini.
                </Text>
              </View>
            ) : (
              data.items.map((row) => (
                <View key={row.no} style={styles.trRow} wrap={false}>
                  <Text style={styles.colNo}>{row.no}</Text>
                  <Text style={styles.colNama}>{truncatePdfCell(row.nama, 26)}</Text>
                  <Text style={styles.colUmur}>{row.umur}</Text>
                  <Text style={styles.colTanggal}>{row.tanggal}</Text>
                  <Text style={styles.colPemeriksaan}>{truncatePdfCell(row.pemeriksaan, 32)}</Text>
                  <Text style={styles.colPengirim}>{truncatePdfCell(row.pengirim, 24)}</Text>
                  <Text style={styles.colRadiologi}>{truncatePdfCell(row.radiologi, 18)}</Text>
                  <Text style={styles.colHarga}>{row.hargaFormatted}</Text>
                  <Text style={styles.colSharing}>{row.sharingFormatted}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.summaryContainer} wrap={false}>
            <View style={styles.summaryRow}>
              <Text>Total Data:</Text>
              <Text style={styles.bold}>{data.totalData} Pasien</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Total Harga:</Text>
              <Text style={styles.bold}>{data.totalHargaFormatted}</Text>
            </View>
            <View style={styles.summaryRowTotal}>
              <Text>Total Sharing:</Text>
              <Text>{data.totalSharingFormatted}</Text>
            </View>
          </View>

          <View style={styles.signatureSection} wrap={false}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Petugas Admin Klinik</Text>
              <Text style={styles.signatureName}>{data.adminNama ? data.adminNama : '( Petugas Admin Klinik )'}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
