import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { UsgReportData } from './UsgReportDocument.tsx';

const BLUE = '#2b4c9b';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  // paddingBottom lebih besar dari sisi lain: jarak aman supaya garis bingkai
  // bawah tidak ikut terpotong saat dicetak/dipotong printer.
  page: {
    paddingTop: 14, paddingLeft: 14, paddingRight: 14, paddingBottom: 24,
    fontFamily: 'Helvetica', fontSize: 8, color: BLACK,
  },
  frame: { height: '100%', borderWidth: 1, borderColor: BLACK, padding: 9, flexDirection: 'column' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  logo: { width: 34, height: 34, marginRight: 7 },
  headerText: { flex: 1 },
  clinicName: { fontSize: 12, fontWeight: 'bold', color: BLUE, marginBottom: 1 },
  clinicAddress: { fontSize: 6.5, color: BLACK, lineHeight: 1.3 },
  divider: { height: 1.5, backgroundColor: BLUE, marginVertical: 4 },
  titleSection: { textAlign: 'center', marginVertical: 3 },
  reportTitle: { fontSize: 10, fontWeight: 'bold', color: BLUE, textTransform: 'uppercase' },

  infoGrid: {
    marginVertical: 4,
    padding: 5, backgroundColor: '#f8fafc', borderWidth: 0.5, borderColor: '#cbd5e1',
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoRowSpacing: { marginTop: 3 },
  infoCell: { width: '48%', flexDirection: 'row' },
  infoLabelLeft: { width: 46, fontSize: 6.5 },
  infoLabelRight: { width: 60, fontSize: 6.5 },
  infoColon: { width: 5, fontSize: 6.5 },
  bold: { fontWeight: 'bold', fontSize: 6.5 },

  photoStack: { marginVertical: 5 },
  photoRow: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  photoRowSpacing: { marginTop: 5 },
  photoContainer: {
    alignItems: 'center', borderWidth: 0.8, borderColor: BLACK, padding: 5,
  },
  photo: { maxWidth: 200, maxHeight: 200, objectFit: 'contain' },
  photoHalf: { maxWidth: 148, maxHeight: 148, objectFit: 'contain' },
  photoQuarter: { maxWidth: 122, maxHeight: 122, objectFit: 'contain' },

  section: { marginTop: 5 },
  sectionLabel: { fontSize: 8, fontWeight: 'bold', color: BLUE, marginBottom: 2 },
  sectionLabelInline: { fontSize: 8, fontWeight: 'bold', color: BLUE },
  sectionBody: {
    fontSize: 8, lineHeight: 1.4, padding: 4, borderWidth: 0.5, borderColor: '#cbd5e1', minHeight: 20,
  },

  disclaimer: { fontSize: 5.5, fontStyle: 'italic', color: '#64748b', marginTop: 5 },

  signatureSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, paddingHorizontal: 10 },
  signatureBox: { alignItems: 'center', width: 130 },
  signatureTitle: { fontSize: 6.5, marginBottom: 3 },
  signatureImage: { width: 108, height: 33, objectFit: 'contain', marginBottom: 1 },
  signatureGap: { height: 33, marginBottom: 1 },
  signatureName: {
    fontSize: 6.5, fontWeight: 'bold', width: '100%', textAlign: 'center',
  },
  signatureRole: {
    fontSize: 6.5, textAlign: 'center', marginTop: 1, borderTopWidth: 0.8, borderColor: BLACK,
    paddingTop: 2, width: '100%',
  },
});

/** Varian "kertas kecil" dari UsgReportDocument, memakai ukuran kertas yang
 * sama dengan cetak radiologi (14.85cm x 21cm, A4 dibagi 2) tapi isinya
 * identik dengan hasil USG ukuran penuh. */
export function UsgKertasKecilReportDocument({ data }: { readonly data: UsgReportData }) {
  const photos = [data.fotoDataUrl, data.fotoDataUrl2, data.fotoDataUrl3, data.fotoDataUrl4].filter(
    (src): src is string => Boolean(src),
  );
  const photoStyle = photos.length >= 3 ? styles.photoQuarter : photos.length === 2 ? styles.photoHalf : styles.photo;
  const photoRows = photos.length > 2 ? [photos.slice(0, 2), photos.slice(2, 4)] : [photos];

  return (
    <Document title={`USG_${data.namaPasien}_kertas-kecil.pdf`}>
      {/* 420.95 pt x 595.28 pt = 14.85cm x 21cm, sama seperti ukuran cetak radiologi. */}
      <Page size={[420.95, 595.28]} style={styles.page}>
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
