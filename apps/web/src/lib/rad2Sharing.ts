export interface Rad2SharingInput {
  readonly pengirim: string;
  readonly pemeriksaan: string;
  readonly umur: number;
  readonly harga: number;
}

export interface Rad2SharingResult {
  readonly nominal: number;
  readonly keterangan: string;
}

/** Umur di bawah batas ini memakai tarif anak untuk pemeriksaan thorax. */
export const RAD2_UMUR_ANAK_BATAS = 10;

export const RAD2_SHARING_DEFAULT = 10_000;

interface DokterSharingRule {
  readonly label: string;
  /** Potongan nama yang dicari pada pengirim yang sudah dinormalisasi. */
  readonly patterns: readonly RegExp[];
  readonly thoraxAnak: number;
  readonly thoraxDewasa: number;
  readonly persenLain: number;
}

const DOKTER_RULES: readonly DokterSharingRule[] = [
  {
    label: 'dr. Anna Diah',
    patterns: [/\banna diah\b/],
    thoraxAnak: 18_000,
    thoraxDewasa: 20_000,
    persenLain: 10,
  },
  {
    label: 'dr. Iman Purnawan',
    patterns: [/\biman purnawan\b/],
    thoraxAnak: 33_000,
    thoraxDewasa: 35_000,
    persenLain: 30,
  },
  {
    label: 'dr. Eva Christiani',
    patterns: [/\beva (christiani|kristiani)\b/],
    thoraxAnak: 33_000,
    thoraxDewasa: 35_000,
    persenLain: 30,
  },
];

/** Huruf kecil, tanda baca jadi spasi, supaya "dr. ANNA DIAH, Sp.A" tetap cocok. */
function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

export function isThoraxPemeriksaan(pemeriksaan: string): boolean {
  return /\b(thorax|thoraks|thorak|toraks|torak|thx)\b/.test(normalize(pemeriksaan));
}

function findDokterRule(pengirim: string): DokterSharingRule | null {
  const name = normalize(pengirim);
  return DOKTER_RULES.find((rule) => rule.patterns.some((p) => p.test(name))) ?? null;
}

/** Sharing dokter pengirim Rad2 menurut aturan klinik:
 * - dr. Anna Diah: thorax 18.000 (umur < 10) / 20.000, pemeriksaan lain 10% harga.
 * - dr. Iman Purnawan & dr. Eva Christiani: thorax 33.000 (umur < 10) / 35.000, lain 30% harga.
 * - dokter lain: 10.000 per pemeriksaan. */
export function computeRad2Sharing(input: Rad2SharingInput): Rad2SharingResult {
  const rule = findDokterRule(input.pengirim);
  if (!rule) {
    return { nominal: RAD2_SHARING_DEFAULT, keterangan: 'Dokter lain: Rp 10.000 per pemeriksaan' };
  }
  if (isThoraxPemeriksaan(input.pemeriksaan)) {
    const anak = input.umur < RAD2_UMUR_ANAK_BATAS;
    return {
      nominal: anak ? rule.thoraxAnak : rule.thoraxDewasa,
      keterangan: `${rule.label}, thorax umur ${anak ? `< ${RAD2_UMUR_ANAK_BATAS}` : `≥ ${RAD2_UMUR_ANAK_BATAS}`} tahun`,
    };
  }
  const harga = Number.isFinite(input.harga) && input.harga > 0 ? input.harga : 0;
  return {
    nominal: Math.round((harga * rule.persenLain) / 100),
    keterangan: `${rule.label}, pemeriksaan selain thorax: ${rule.persenLain}% dari harga`,
  };
}
