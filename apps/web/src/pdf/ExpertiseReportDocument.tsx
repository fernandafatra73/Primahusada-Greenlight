import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface ExpertiseReportData {
  readonly logoSrc: string;
  readonly namaKlinik: string;
  readonly alamatKlinik: string;
  readonly teleponKlinik: string;
  readonly namaPenyakit: string;
  readonly pemeriksaan: string;
  readonly klinis: string;
  readonly kesan: string;
  readonly fotoDataUrl: string;
  readonly tanggalCetak: string;
}

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  page: { padding: 24, fontFamily: 'Helvetica', fontSize: 10, color: BLACK },
  frame: { borderWidth: 1, borderColor: BLACK, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  logo: { width: 44, height: 44, marginRight: 10 },
  headerText: { flex: 1 },
  clinicName: { fontSize: 15, fontWeight: 'bold', color: BLUE, marginBottom: 2 },
  clinicAddress: { fontSize: 8, color: BLACK, lineHeight: 1.35 },
  divider: { height: 2, backgroundColor: BLUE, marginVertical: 8 },
  title: {
    fontSize: 12, fontWeight: 'bold', color: BLUE, textTransform: 'uppercase',
    textAlign: 'center', marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5,
    borderBottomWidth: 0.5, borderColor: '#cbd5e1',
  },
  infoLabel: { color: '#64748b' },
  infoValue: { fontWeight: 'bold' },
  section: { marginTop: 8 },
  sectionLabel: { fontSize: 10, fontWeight: 'bold', color: BLUE, marginBottom: 3 },
  sectionBody: {
    fontSize: 10, lineHeight: 1.5, padding: 6, borderWidth: 0.5, borderColor: '#cbd5e1', minHeight: 26,
  },
  photoWrap: { alignItems: 'center', marginTop: 10 },
  photoContainer: { borderWidth: 0.8, borderColor: BLACK, padding: 8 },
  photo: { maxWidth: 280, maxHeight: 280, objectFit: 'contain' },
  footer: { marginTop: 14, fontSize: 8, color: '#64748b', textAlign: 'right' },
});

export function ExpertiseReportDocument({ data }: { readonly data: ExpertiseReportData }) {
  return (
    <Document title={`Expertise_${(data.namaPenyakit || 'data').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}>
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

          <Text style={styles.title}>Expertise</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nama Penyakit</Text>
            <Text style={styles.infoValue}>{data.namaPenyakit || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pemeriksaan</Text>
            <Text style={styles.infoValue}>{data.pemeriksaan || '—'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Klinis</Text>
            <Text style={styles.sectionBody}>{data.klinis || '—'}</Text>
          </View>

          {data.fotoDataUrl ? (
            <View style={styles.photoWrap}>
              <View style={styles.photoContainer}>
                <Image style={styles.photo} src={data.fotoDataUrl} />
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Kesan</Text>
            <Text style={styles.sectionBody}>{data.kesan || '—'}</Text>
          </View>

          <Text style={styles.footer}>Dicetak: {data.tanggalCetak}</Text>
        </View>
      </Page>
    </Document>
  );
}
