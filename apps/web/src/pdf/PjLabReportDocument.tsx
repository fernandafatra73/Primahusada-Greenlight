import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { truncatePdfCell } from './pdfText.ts';

export interface PjLabReportItem {
  readonly no: number;
  readonly nama: string;
  readonly jumlahFormatted: string;
}

export interface PjLabReportData {
  readonly logoSrc: string;
  readonly tanggalCetak: string;
  readonly items: readonly PjLabReportItem[];
  readonly totalJumlahFormatted: string;
  /** Nama yang dicetak di kolom tanda tangan. */
  readonly adminNama: string;
}

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  page: {
    padding: 14,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: BLACK,
  },
  frame: {
    borderWidth: 1.5,
    borderColor: BLUE,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logo: {
    width: 48,
    height: 48,
    marginRight: 12,
    objectFit: 'contain',
  },
  headerText: {
    flex: 1,
  },
  clinicSmall: {
    fontSize: 8,
  },
  clinicName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: BLUE,
    marginTop: 1,
  },
  clinicAddress: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
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
  table: {
    borderWidth: 0.8,
    borderColor: BLACK,
  },
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
    borderBottomWidth: 0.5,
    borderColor: '#cbd5e1',
    paddingVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    fontWeight: 'bold',
    color: BLUE,
    borderTopWidth: 0.8,
    borderColor: BLACK,
  },
  colNo: { width: '8%', textAlign: 'center' },
  colNama: { width: '68%', paddingLeft: 4 },
  colJumlah: { width: '24%', textAlign: 'right', paddingRight: 4 },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  signatureBox: {
    alignItems: 'center',
    width: 170,
  },
  signatureDate: {
    fontSize: 8.5,
    marginBottom: 40,
  },
  signatureName: {
    fontSize: 9,
    fontWeight: 'bold',
    borderTopWidth: 0.8,
    borderColor: BLACK,
    paddingTop: 2,
    width: '100%',
    textAlign: 'center',
  },
});

export function PjLabReportDocument({ data }: { readonly data: PjLabReportData }) {
  return (
    <Document title="Daftar_PJ_Laboratorium.pdf">
      <Page size="A4" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.headerRow}>
            {data.logoSrc ? <Image style={styles.logo} src={data.logoSrc} /> : null}
            <View style={styles.headerText}>
              <Text style={styles.clinicSmall}>KLINIK ROENTGEN, USG DAN LABORATORIUM</Text>
              <Text style={styles.clinicName}>PRIMA HUSADA</Text>
              <Text style={styles.clinicAddress}>Jl Siliwangi No 28 A Parung Kuda Telp. 0857-1932-5557</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <Text style={styles.title}>Penanggung Jawab Laboratorium</Text>
          <Text style={styles.subtitle}>Tanggal cetak: {data.tanggalCetak}</Text>

          <View style={styles.table}>
            <View style={styles.thRow}>
              <Text style={styles.colNo}>No</Text>
              <Text style={styles.colNama}>Nama Penanggung Jawab</Text>
              <Text style={styles.colJumlah}>Jumlah</Text>
            </View>
            {data.items.length === 0 ? (
              <View style={styles.trRow}>
                <Text style={{ width: '100%', textAlign: 'center' }}>Belum ada data penanggung jawab.</Text>
              </View>
            ) : (
              data.items.map((row) => (
                <View key={row.no} style={styles.trRow} wrap={false}>
                  <Text style={styles.colNo}>{row.no}</Text>
                  <Text style={styles.colNama}>{truncatePdfCell(row.nama, 70)}</Text>
                  <Text style={styles.colJumlah}>{row.jumlahFormatted}</Text>
                </View>
              ))
            )}
            <View style={styles.totalRow}>
              <Text style={{ width: '76%', textAlign: 'right', paddingRight: 4 }}>Total</Text>
              <Text style={styles.colJumlah}>{data.totalJumlahFormatted}</Text>
            </View>
          </View>

          <View style={styles.signatureSection} wrap={false}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureDate}>Parung Kuda, {data.tanggalCetak}</Text>
              <Text style={styles.signatureName}>{data.adminNama || '( .............................. )'}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
