import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

export interface SuratPeringatanAdminKlinikData {
  readonly logoSrc: string;
  readonly namaKlinik: string;
  readonly alamatKlinik: string;
  readonly teleponKlinik: string;
  readonly nomorSurat: string;
  readonly level: string;
  readonly namaKaryawan: string;
  readonly jabatan: string;
  readonly alasan: string;
  readonly tempatSurat: string;
  readonly tanggalSurat: string;
  readonly namaPenandatangan: string;
  readonly jabatanPenandatangan: string;
}

const LEVEL_LABEL: Record<string, string> = {
  SP1: 'Surat Peringatan Pertama (SP1)',
  SP2: 'Surat Peringatan Kedua (SP2)',
  SP3: 'Surat Peringatan Ketiga (SP3)',
};

const RED = '#b91c1c';
const BLACK = '#1a1a1a';

const styles = StyleSheet.create({
  page: { padding: 24, fontFamily: 'Helvetica', fontSize: 10.5, color: BLACK },
  frame: { height: '100%', flexDirection: 'column' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  logo: { width: 48, height: 48, marginRight: 12 },
  headerText: { flex: 1 },
  clinicName: { fontSize: 16, fontWeight: 'bold', color: RED, marginBottom: 2 },
  clinicAddress: { fontSize: 9, color: BLACK, lineHeight: 1.35 },
  divider: { height: 2.5, backgroundColor: RED, marginVertical: 8 },
  titleSection: { textAlign: 'center', marginVertical: 8 },
  reportTitle: { fontSize: 13, fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' },
  nomorSurat: { fontSize: 10, marginTop: 2 },
  body: { marginTop: 12, lineHeight: 1.7, textAlign: 'justify' },
  dataTable: { marginTop: 10, marginBottom: 10, paddingLeft: 16 },
  dataRow: { flexDirection: 'row', marginBottom: 3 },
  dataLabel: { width: 130, fontSize: 10.5 },
  dataColon: { width: 12, fontSize: 10.5 },
  dataValue: { flex: 1, fontSize: 10.5, fontWeight: 'bold' },
  signatureSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 40, paddingHorizontal: 20 },
  signatureBox: { alignItems: 'center', width: 200 },
  signatureDate: { fontSize: 10, marginBottom: 45 },
  signatureName: { fontSize: 10, fontWeight: 'bold', textDecoration: 'underline' },
  signatureRole: { fontSize: 9, color: '#475569', marginTop: 2 },
});

export function SuratPeringatanAdminKlinikDocument({ data }: { readonly data: SuratPeringatanAdminKlinikData }) {
  const levelLabel = LEVEL_LABEL[data.level] ?? data.level;
  return (
    <Document title={`Surat_Peringatan_${data.level}_${data.namaKaryawan}.pdf`}>
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
            <Text style={styles.reportTitle}>{levelLabel}</Text>
            <Text style={styles.nomorSurat}>Nomor: {data.nomorSurat || '-'}</Text>
          </View>

          <Text style={styles.body}>
            Yang bertanda tangan di bawah ini, pimpinan {data.namaKlinik}, dengan ini memberikan
            surat peringatan kepada:
          </Text>

          <View style={styles.dataTable}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Nama</Text>
              <Text style={styles.dataColon}>:</Text>
              <Text style={styles.dataValue}>{data.namaKaryawan}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Jabatan</Text>
              <Text style={styles.dataColon}>:</Text>
              <Text style={styles.dataValue}>{data.jabatan}</Text>
            </View>
          </View>

          <Text style={styles.body}>Sehubungan dengan: {data.alasan}</Text>

          <Text style={styles.body}>
            Kami harapkan yang bersangkutan dapat memperbaiki kedisiplinan dan kinerjanya.
            Apabila pelanggaran serupa terulang kembali, maka akan dikenakan sanksi lebih lanjut
            sesuai dengan ketentuan yang berlaku di klinik.
          </Text>

          <Text style={styles.body}>Demikian surat peringatan ini dibuat untuk dipatuhi sebagaimana mestinya.</Text>

          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureDate}>
                {data.tempatSurat}, {data.tanggalSurat}
              </Text>
              <Text style={styles.signatureName}>
                {data.namaPenandatangan || '( ................................. )'}
              </Text>
              <Text style={styles.signatureRole}>{data.jabatanPenandatangan}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
