export type Rad2PeriodKind = 'semua' | 'hari-ini' | 'minggu-ini' | 'bulan-ini' | 'custom';

export const RAD2_PERIOD_OPTIONS: readonly { readonly value: Rad2PeriodKind; readonly label: string }[] = [
  { value: 'semua', label: 'Semua tanggal' },
  { value: 'hari-ini', label: 'Pasien hari ini' },
  { value: 'minggu-ini', label: 'Minggu ini' },
  { value: 'bulan-ini', label: 'Bulan ini' },
  { value: 'custom', label: 'Custom…' },
];

export interface Rad2PeriodRange {
  /** YYYY-MM-DD inklusif; string kosong = tanpa batas. */
  readonly dari: string;
  readonly sampai: string;
  readonly label: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Tanggal lokal (bukan UTC) sebagai YYYY-MM-DD, selaras dengan hari yang dilihat user. */
function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD -> DD-MM-YYYY untuk label laporan. */
export function formatIsoDay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso;
}

function rangeLabel(prefix: string, dari: string, sampai: string): string {
  if (dari && sampai) {
    return dari === sampai ? `${prefix} (${formatIsoDay(dari)})` : `${prefix} (${formatIsoDay(dari)} s/d ${formatIsoDay(sampai)})`;
  }
  if (dari) return `${prefix} (mulai ${formatIsoDay(dari)})`;
  if (sampai) return `${prefix} (sampai ${formatIsoDay(sampai)})`;
  return prefix;
}

/**
 * Rentang tanggal untuk pilihan periode. Minggu dihitung Senin–Minggu, bulan dari
 * tanggal 1 sampai hari terakhir bulan itu. `now` dioper dari luar supaya bisa diuji.
 */
export function resolveRad2Period(
  kind: Rad2PeriodKind,
  now: Date,
  custom: { readonly dari: string; readonly sampai: string },
): Rad2PeriodRange {
  switch (kind) {
    case 'semua':
      return { dari: '', sampai: '', label: 'Semua tanggal' };
    case 'hari-ini': {
      const day = toIsoLocal(now);
      return { dari: day, sampai: day, label: rangeLabel('Hari ini', day, day) };
    }
    case 'minggu-ini': {
      const sinceMonday = (now.getDay() + 6) % 7;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      const dari = toIsoLocal(monday);
      const sampai = toIsoLocal(sunday);
      return { dari, sampai, label: rangeLabel('Minggu ini', dari, sampai) };
    }
    case 'bulan-ini': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const dari = toIsoLocal(first);
      const sampai = toIsoLocal(last);
      return { dari, sampai, label: rangeLabel('Bulan ini', dari, sampai) };
    }
    case 'custom':
      return { dari: custom.dari, sampai: custom.sampai, label: rangeLabel('Custom', custom.dari, custom.sampai) };
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
