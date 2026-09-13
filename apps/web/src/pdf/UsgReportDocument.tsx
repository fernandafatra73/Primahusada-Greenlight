import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

export interface UsgReportData {
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
  readonly fotoDataUrl: string;
  readonly fotoDataUrl2: string;
  readonly fotoDataUrl3: string;
  readonly fotoDataUrl4: string;
  readonly analisa: string;
  readonly kesan: string;
  readonly radiologNama: string;
  readonly tanggalCetak: string;
  readonly signatureSrc?: string;
}

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  // Margin dibuat sama semua sisi (0.5cm) supaya kerangka tercetak center.
  // Catatan: 1cm sempat terbukti memotong garis kerangka di printer fisik
  // untuk dokumen sejenis, jadi 0.5cm berisiko lebih besar — cek hasil
  // cetak fisiknya.
  page: {
    paddingTop: '0.5cm', paddingLeft: '0.5cm', paddingRight: '0.5cm', paddingBottom: '0.5cm',
    fontFamily: 'Helvetica', fontSize: 9.5, color: BLACK,
  },
  frame: { height: '100%', borderWidth: 1, borderColor: BLACK, padding: 12, flexDirection: 'column', position: 'relative' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  logo: { width: 44, height: 44, marginRight: 10 },
  headerText: { flex: 1 },
  clinicName: { fontSize: 15, fontWeight: 'bold', color: BLUE, marginBottom: 2 },
  clinicAddress: { fontSize: 8, color: BLACK, lineHeight: 1.35 },
  divider: { height: 2, backgroundColor: BLUE, marginVertical: 6 },
  titleSection: { textAlign: 'center', marginVertical: 4 },
  reportTitle: { fontSize: 12, fontWeight: 'bold', color: BLUE, textTransform: 'uppercase' },

  infoGrid: {
    marginVertical: 6,
    padding: 6, backgroundColor: '#f8fafc', borderWidth: 0.5, borderColor: '#cbd5e1',
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoRowSpacing: { marginTop: 4 },
  infoCell: { width: '48%', flexDirection: 'row' },
  infoLabelLeft: { width: 60, fontSize: 8.5 },
  infoLabelRight: { width: 80, fontSize: 8.5 },
  infoColon: { width: 6, fontSize: 8.5 },
  bold: { fontWeight: 'bold', fontSize: 8.5 },

  photoStack: { marginVertical: 8 },
  photoRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  photoRowSpacing: { marginTop: 8 },
  photoContainer: {
    alignItems: 'center', borderWidth: 0.8, borderColor: BLACK, padding: 8,
  },
  photo: { maxWidth: 320, maxHeight: 320, objectFit: 'contain' },
  photoHalf: { maxWidth: 235, maxHeight: 235, objectFit: 'contain' },
  photoQuarter: { maxWidth: 195, maxHeight: 195, objectFit: 'contain' },

  section: { marginTop: 8 },
  sectionLabel: { fontSize: 9.5, fontWeight: 'bold', color: BLUE, marginBottom: 3 },
  sectionLabelInline: { fontSize: 9.5, fontWeight: 'bold', color: BLUE },
  sectionBody: {
    fontSize: 9.5, lineHeight: 1.5, padding: 6, borderWidth: 0.5, borderColor: '#cbd5e1', minHeight: 30,
  },

  disclaimer: { fontSize: 6.5, fontStyle: 'italic', color: '#64748b', position: 'absolute', bottom: 4, left: 12 },

  // marginTop dinaikkan 1cm (28.3465pt) dari posisi semula (18).
  signatureSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -10.35, paddingHorizontal: 20 },
  signatureBox: { alignItems: 'center', width: 170 },
  signatureTitle: { fontSize: 8, marginBottom: 4 },
  signatureImage: { width: 150, height: 47, objectFit: 'contain', marginBottom: 2 },
  signatureGap: { height: 47, marginBottom: 2 },
  signatureName: {
    fontSize: 8, fontWeight: 'bold', width: '100%', textAlign: 'center',
  },
  signatureRole: {
    fontSize: 8, textAlign: 'center', marginTop: 1, borderTopWidth: 0.8, borderColor: BLACK,
    paddingTop: 2, width: '100%',
  },
});

export function UsgReportDocument({ data }: { readonly data: UsgReportData }) {
  const photos = [data.fotoDataUrl, data.fotoDataUrl2, data.fotoDataUrl3, data.fotoDataUrl4].filter(
    (src): src is string => Boolean(src),
  );
  const photoStyle = photos.length >= 3 ? styles.photoQuarter : photos.length === 2 ? styles.photoHalf : styles.photo;
  const photoRows = photos.length > 2 ? [photos.slice(0, 2), photos.slice(2, 4)] : [photos];

  return (
    <Document title={`USG_${data.namaPasien}.pdf`}>
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
            <Text style={styles.reportTitle}>Hasil Pemeriksaan USG</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionBody}>
              <Text style={styles.sectionLabelInline}>Klinis: </Text>
              {data.analisa || '—'}
            </Text>
          </View>

          {photos.length > 0 ? (
            <View style={styles.photoStack}>
              {photoRows.map((row, rowIndex) => (
                <View
                  key={rowIndex}
                  style={rowIndex > 0 ? [styles.photoRow, styles.photoRowSpacing] : styles.photoRow}
                >
                  {row.map((src, photoIndex) => (
                    <View key={photoIndex} style={styles.photoContainer}>
                      <Image style={photoStyle} src={src} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Kesan:</Text>
            <Text style={styles.sectionBody}>{data.kesan || '—'}</Text>
          </View>

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

          <Text style={styles.disclaimer}>Tgl Cetak: {data.tanggalCetak}</Text>
        </View>
      </Page>
    </Document>
  );
}
