import { Document, Image, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import { buildKwitansiRows, type KwitansiRowInput } from '../lib/kwitansiRows.ts';
import { truncatePdfCell } from './pdfText.ts';

export interface KwitansiPendaftaranUmumData {
  readonly logoSrc: string;
  readonly noKwitansi: string;
  readonly sudahTerimaDari: string;
  readonly untukPembayaran: string;
  readonly tanggal: string;
  readonly items: readonly KwitansiRowInput[];
  readonly totalFormatted: string;
  readonly terbilang: string;
  /** Tanggal di atas tanda tangan, mis. "16 Oktober 2026". */
  readonly tanggalTtd: string;
  readonly penerimaNama: string;
}

const NAVY = '#0b3d78';
const BLUE = '#1d5fae';
const SKY = '#7cc4f2';
const PALE = '#e6f1fc';
const LINE = '#2a64b0';
const TEXT = '#1a2b44';

// A5 lanskap: 595 x 420 pt.
const PAGE_W = 595;
const PAGE_H = 420;

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: TEXT,
    padding: 8,
  },
  frame: {
    position: 'relative',
    height: '100%',
    borderWidth: 1.2,
    borderColor: BLUE,
    overflow: 'hidden',
  },
  swoosh: { position: 'absolute', left: 0, top: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderColor: BLUE,
  },
  logo: { width: 64, height: 64, marginRight: 10 },
  brand: { flex: 1 },
  brandSmall: { fontSize: 13, color: BLUE, letterSpacing: 1.5 },
  brandName: { fontSize: 21, fontWeight: 'bold', color: NAVY, marginTop: -1 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 5 },
  taglineBar: { width: 34, height: 1.5, backgroundColor: '#1aa39a', marginRight: 5 },
  tagline: { fontSize: 8.5, fontStyle: 'italic', color: BLUE },
  contact: { fontSize: 8, fontWeight: 'bold', color: NAVY, marginTop: 1.5 },
  titleBox: { width: 168, alignItems: 'center' },
  titleBadge: {
    width: '100%',
    backgroundColor: BLUE,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  titleText: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', letterSpacing: 2 },
  noRow: { flexDirection: 'row', marginTop: 8, fontSize: 10 },
  body: { paddingHorizontal: 18, paddingTop: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 5 },
  infoLabel: { width: 88, fontSize: 9.5 },
  infoColon: { width: 10, fontSize: 9.5 },
  infoValue: {
    flex: 1,
    fontSize: 9.5,
    fontWeight: 'bold',
    borderBottomWidth: 0.7,
    borderBottomStyle: 'dotted',
    borderColor: '#5b6b80',
    paddingBottom: 1,
  },
  table: {
    position: 'relative',
    marginTop: 6,
    borderWidth: 0.9,
    borderColor: LINE,
    borderRadius: 3,
  },
  watermark: { position: 'absolute', width: 70, height: 70, opacity: 0.12 },
  th: { flexDirection: 'row', backgroundColor: PALE, borderBottomWidth: 0.9, borderColor: LINE },
  tr: { flexDirection: 'row', borderBottomWidth: 0.6, borderColor: LINE, minHeight: 15 },
  cellNo: { width: '7%', textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.6, borderColor: LINE },
  cellNama: { width: '51%', paddingVertical: 3, paddingHorizontal: 5, borderRightWidth: 0.6, borderColor: LINE },
  cellJumlah: { width: '18%', textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.6, borderColor: LINE },
  cellHarga: { width: '24%', textAlign: 'right', paddingVertical: 3, paddingHorizontal: 5 },
  thText: { fontWeight: 'bold', color: NAVY, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  totalLabel: {
    width: '18%',
    backgroundColor: PALE,
    borderWidth: 0.9,
    borderTopWidth: 0,
    borderColor: LINE,
    paddingVertical: 5,
    textAlign: 'center',
    fontWeight: 'bold',
    color: NAVY,
    fontSize: 9.5,
  },
  totalValue: {
    width: '24%',
    borderWidth: 0.9,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: LINE,
    paddingVertical: 5,
    paddingHorizontal: 5,
    textAlign: 'right',
    fontWeight: 'bold',
    color: NAVY,
    fontSize: 10,
  },
  bottom: { flexDirection: 'row', marginTop: 8 },
  bottomLeft: { width: '64%' },
  terbilangBox: {
    backgroundColor: PALE,
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 8,
    flexDirection: 'row',
  },
  terbilangLabel: { fontSize: 9, fontStyle: 'italic', color: BLUE, marginRight: 4 },
  terbilangValue: { flex: 1, fontSize: 9, fontStyle: 'italic', fontWeight: 'bold', color: TEXT },
  thanks: { marginTop: 8, fontSize: 8, fontStyle: 'italic', color: BLUE },
  thanksBold: { fontSize: 8, fontStyle: 'italic', fontWeight: 'bold', color: NAVY },
  sign: { width: '36%', alignItems: 'center', fontSize: 8.5 },
  signName: { marginTop: 34, fontSize: 8.5, fontWeight: 'bold' },
});

/** Gelombang biru di pojok kanan atas dan kiri bawah, meniru blangko kwitansi cetak. */
function Swooshes() {
  return (
    <Svg style={styles.swoosh} width={PAGE_W - 16} height={PAGE_H - 16}>
      <Path d="M 330 0 C 420 6, 500 14, 579 40 L 579 0 Z" fill={SKY} />
      <Path d="M 380 0 C 460 4, 530 10, 579 26 L 579 0 Z" fill={BLUE} />
      <Path d="M 0 362 C 90 372, 200 392, 300 404 L 0 404 Z" fill={SKY} />
      <Path d="M 0 376 C 90 384, 180 398, 250 404 L 0 404 Z" fill={BLUE} />
    </Svg>
  );
}

function InfoRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoColon}>:</Text>
      <Text style={styles.infoValue}>{truncatePdfCell(value, 90)}</Text>
    </View>
  );
}

export function KwitansiPendaftaranUmumDocument({ data }: { readonly data: KwitansiPendaftaranUmumData }) {
  const rows = buildKwitansiRows(data.items);

  return (
    <Document title={`Kwitansi_${data.noKwitansi}.pdf`}>
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          <Swooshes />

          <View style={styles.header}>
            {data.logoSrc ? <Image style={styles.logo} src={data.logoSrc} /> : null}
            <View style={styles.brand}>
              <Text style={styles.brandSmall}>KLINIK</Text>
              <Text style={styles.brandName}>PRIMA HUSADA</Text>
              <View style={styles.taglineRow}>
                <View style={styles.taglineBar} />
                <Text style={styles.tagline}>Sehat Bersama, Hidup Lebih Baik</Text>
              </View>
              <Text style={styles.contact}>Jl Siliwangi Ruko Palapa No 2 Parung Kuda Sukabumi</Text>
              <Text style={styles.contact}>Telp 0857-1932-5557</Text>
            </View>
            <View style={styles.titleBox}>
              <View style={styles.titleBadge}>
                <Text style={styles.titleText}>KWITANSI</Text>
              </View>
              <View style={styles.noRow}>
                <Text>No. : </Text>
                <Text style={{ fontWeight: 'bold' }}>{data.noKwitansi}</Text>
              </View>
            </View>
          </View>

          <View style={styles.body}>
            <InfoRow label="Sudah terima dari" value={data.sudahTerimaDari} />
            <InfoRow label="Untuk pembayaran" value={data.untukPembayaran} />
            <InfoRow label="Tanggal" value={data.tanggal} />

            <View style={styles.table}>
              {data.logoSrc ? (
                <Image style={[styles.watermark, { left: '42%', top: 22 }]} src={data.logoSrc} />
              ) : null}
              <View style={styles.th}>
                <Text style={[styles.cellNo, styles.thText]}>No.</Text>
                <Text style={[styles.cellNama, styles.thText]}>Jenis Layanan / Keterangan</Text>
                <Text style={[styles.cellJumlah, styles.thText]}>Jumlah</Text>
                <Text style={[styles.cellHarga, styles.thText]}>Harga</Text>
              </View>
              {rows.map((row, i) => (
                <View key={row.no} style={i === rows.length - 1 ? [styles.tr, { borderBottomWidth: 0 }] : styles.tr}>
                  <Text style={styles.cellNo}>{row.no}</Text>
                  <Text style={styles.cellNama}>{row.nama ? truncatePdfCell(row.nama, 60) : ''}</Text>
                  <Text style={styles.cellJumlah}>{row.jumlah}</Text>
                  <Text style={styles.cellHarga}>{row.hargaFormatted}</Text>
                </View>
              ))}
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Pembayaran</Text>
              <Text style={styles.totalValue}>{data.totalFormatted}</Text>
            </View>

            <View style={styles.bottom}>
              <View style={styles.bottomLeft}>
                <View style={styles.terbilangBox}>
                  <Text style={styles.terbilangLabel}>Terbilang :</Text>
                  <Text style={styles.terbilangValue}>{data.terbilang}</Text>
                </View>
                <Text style={styles.thanks}>Terima kasih atas kepercayaan Anda</Text>
                <Text style={styles.thanksBold}>kepada Klinik Prima Husada</Text>
              </View>
              <View style={styles.sign}>
                <Text>Sukabumi, {data.tanggalTtd}</Text>
                <Text>Penerima,</Text>
                <Text style={styles.signName}>
                  ( {data.penerimaNama ? data.penerimaNama : '..............................'} )
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
