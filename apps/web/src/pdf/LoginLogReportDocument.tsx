import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatDurasi, pecahWaktuLogin, type LoginLogItem } from '../lib/loginLog.ts';
import { truncatePdfCell } from './pdfText.ts';

const BLUE = '#1d5fae';
const LINE = '#94a3b8';

const styles = StyleSheet.create({
  page: { padding: 24, fontFamily: 'Helvetica', fontSize: 9, color: '#1a1a1a' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  logo: { width: 40, height: 40, marginRight: 10 },
  clinic: { fontSize: 14, fontWeight: 'bold', color: BLUE },
  title: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  printed: { fontSize: 8, color: '#64748b', marginTop: 2 },
  table: { borderWidth: 0.8, borderColor: LINE },
  th: { flexDirection: 'row', backgroundColor: '#e6f1fc', borderBottomWidth: 0.8, borderColor: LINE, fontWeight: 'bold' },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: LINE, alignItems: 'center', minHeight: 20 },
  cell: { paddingVertical: 4, paddingHorizontal: 4 },
  no: { width: '5%', textAlign: 'center' },
  nama: { width: '23%' },
  jam: { width: '8%', textAlign: 'center' },
  tanggal: { width: '8%', textAlign: 'center' },
  bulan: { width: '12%' },
  tahun: { width: '8%', textAlign: 'center' },
  durasi: { width: '18%' },
  foto: { width: '18%', alignItems: 'center' },
  fotoImg: { width: 56, height: 42, objectFit: 'cover' },
});

interface LoginLogReportDocumentProps {
  readonly items: readonly LoginLogItem[];
  readonly logoSrc: string;
}

export function LoginLogReportDocument({ items, logoSrc }: LoginLogReportDocumentProps) {
  return (
    <Document title="Tabel_Login.pdf">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          {logoSrc ? <Image style={styles.logo} src={logoSrc} /> : null}
          <View>
            <Text style={styles.clinic}>KLINIK PRIMA HUSADA</Text>
            <Text style={styles.title}>Tabel Login Aplikasi</Text>
            <Text style={styles.printed}>Dicetak {new Date().toLocaleString('id-ID')}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.th} fixed>
            <Text style={[styles.cell, styles.no]}>No</Text>
            <Text style={[styles.cell, styles.nama]}>Nama Login</Text>
            <Text style={[styles.cell, styles.jam]}>Jam</Text>
            <Text style={[styles.cell, styles.tanggal]}>Tanggal</Text>
            <Text style={[styles.cell, styles.bulan]}>Bulan</Text>
            <Text style={[styles.cell, styles.tahun]}>Tahun</Text>
            <Text style={[styles.cell, styles.durasi]}>Durasi Buka</Text>
            <Text style={[styles.cell, styles.foto]}>Foto</Text>
          </View>
          {items.map((item, i) => {
            const w = pecahWaktuLogin(item.loginAt);
            return (
              <View key={item.id} style={styles.tr} wrap={false}>
                <Text style={[styles.cell, styles.no]}>{i + 1}</Text>
                <Text style={[styles.cell, styles.nama]}>{truncatePdfCell(item.nama, 40)}</Text>
                <Text style={[styles.cell, styles.jam]}>{w.jam}</Text>
                <Text style={[styles.cell, styles.tanggal]}>{w.tanggal}</Text>
                <Text style={[styles.cell, styles.bulan]}>{w.bulan}</Text>
                <Text style={[styles.cell, styles.tahun]}>{w.tahun}</Text>
                <Text style={[styles.cell, styles.durasi]}>{formatDurasi(item.durasiDetik)}</Text>
                <View style={[styles.cell, styles.foto]}>
                  {item.foto ? <Image style={styles.fotoImg} src={item.foto} /> : <Text>-</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
