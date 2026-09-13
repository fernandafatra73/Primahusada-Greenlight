import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

export interface UsgKesanReportData {
  readonly logoSrc: string;
  readonly namaKlinik: string;
  readonly alamatKlinik: string;
  readonly teleponKlinik: string;
  readonly namaPasien: string;
  readonly umur: string;
  readonly alamat: string;
  readonly regCode: string;
  readonly jenisPemeriksaan: string;
  readonly tanggalLabel: string;
  readonly dokterPengirim: string;
  readonly kesan: string;
  readonly radiologNama: string;
  readonly tanggalCetak: string;
  readonly signatureSrc?: string;
}

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  // paddingBottom lebih besar dari sisi lain: jarak aman supaya garis bingkai
  // bawah tidak ikut terpotong saat dicetak/dipotong printer.
  page: {
    paddingTop: 24, paddingLeft: 24, paddingRight: 24, paddingBottom: 36,
    fontFamily: 'Helvetica', fontSize: 10.5, color: BLACK,
  },
  frame: { height: '100%', borderWidth: 1, borderColor: BLACK, padding: 16, flexDirection: 'column' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  logo: { width: 48, height: 48, marginRight: 12 },
  headerText: { flex: 1 },
  clinicName: { fontSize: 16, fontWeight: 'bold', color: BLUE, marginBottom: 2 },
  clinicAddress: { fontSize: 9, color: BLACK, lineHeight: 1.35 },
  divider: { height: 2.5, backgroundColor: BLUE, marginVertical: 8 },
  titleSection: { textAlign: 'center', marginVertical: 8 },
  reportTitle: { fontSize: 14, fontWeight: 'bold', color: BLUE, textTransform: 'uppercase' },
  reportSubtitle: { fontSize: 9.5, color: '#475569', marginTop: 2 },

  infoGrid: {
    marginVertical: 10,
    padding: 8, backgroundColor: '#f8fafc', borderWidth: 0.5, borderColor: '#cbd5e1',
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoRowSpacing: { marginTop: 5 },
  infoCell: { width: '48%', flexDirection: 'row' },
  infoLabelLeft: { width: 100, fontSize: 9.5 },
  infoLabelRight: { width: 90, fontSize: 9.5 },
  infoColon: { width: 6, fontSize: 9.5 },
  bold: { fontWeight: 'bold', fontSize: 9.5 },

  kesanSection: { marginTop: 16, flexGrow: 1 },
  kesanLabel: {
    fontSize: 12, fontWeight: 'bold', color: BLUE, marginBottom: 6, textTransform: 'uppercase',
  },
  kesanBody: {
    fontSize: 12, lineHeight: 1.8, padding: 14, borderWidth: 1, borderColor: BLACK, minHeight: 160,
  },

  disclaimer: { fontSize: 6.5, fontStyle: 'italic', color: '#64748b', marginTop: 10 },

  signatureSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, paddingHorizontal: 20 },
  signatureBox: { alignItems: 'center', width: 190 },
  signatureTitle: { fontSize: 9, marginBottom: 4 },
  signatureImage: { width: 165, height: 53, objectFit: 'contain', marginBottom: 2 },
  signatureGap: { height: 53, marginBottom: 2 },
  signatureName: {
    fontSize: 9, fontWeight: 'bold', width: '100%', textAlign: 'center',
  },
  signatureRole: {
    fontSize: 9, textAlign: 'center', marginTop: 1, borderTopWidth: 0.8, borderColor: BLACK,
    paddingTop: 2, width: '100%',
  },
});

export function UsgKesanReportDocument({ data }: { readonly data: UsgKesanReportData }) {
  return (
    <Document title={`Kesan_USG_${data.namaPasien}.pdf`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.headerRow}>
            {data.logoSrc ? <Image style={styles.logo} src={data.logoSrc} /> : null}
            <View style={styles.headerText}>
              <Text style={styles.clinicName}>{data.namaKlinik}</Text>
              <Text style={styles.clinicAddress}>
                {data.alamatKlinik}
                {data.teleponKlinik ? ` Telp. ${data.teleponKlinik}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.titleSection}>
            <Text style={styles.reportTitle}>Kesan Pemeriksaan USG</Text>
            <Text style={styles.reportSubtitle}>Ringkasan hasil untuk dokter pengirim / pasien</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabelLeft}>Nama Pasien</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.bold}>{data.namaPasien}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabelRight}>Umur</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.bold}>{data.umur || '-'}</Text>
              </View>
            </View>
            <View style={[styles.infoRow, styles.infoRowSpacing]}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabelLeft}>Alamat</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.bold}>{data.alamat || '-'}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabelRight}>Pemeriksaan</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.bold}>{data.jenisPemeriksaan || '-'}</Text>
              </View>
            </View>
            <View style={[styles.infoRow, styles.infoRowSpacing]}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabelLeft}>No. Reg</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.bold}>{data.regCode || '-'}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabelRight}>Dokter Pengirim</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.bold}>{data.dokterPengirim || '-'}</Text>
              </View>
            </View>
            <View style={[styles.infoRow, styles.infoRowSpacing]}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabelLeft}>Tanggal Pemeriksaan</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.bold}>{data.tanggalLabel || '-'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.kesanSection}>
            <Text style={styles.kesanLabel}>Kesan:</Text>
            <Text style={styles.kesanBody}>{data.kesan || '—'}</Text>
          </View>

          <Text style={styles.disclaimer}>Tgl Cetak: {data.tanggalCetak}</Text>

          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Teman Sejawat</Text>
              {data.signatureSrc ? (
                <Image style={styles.signatureImage} src={data.signatureSrc} />
              ) : (
                <View style={styles.signatureGap} />
              )}
              <Text style={styles.signatureName}>{data.radiologNama}</Text>
              <Text style={styles.signatureRole}>Radiolog</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
