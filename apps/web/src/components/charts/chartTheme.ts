import type { ApexOptions } from 'apexcharts';

export const CHART_COLORS = {
  primary: '#2563eb',
  success: '#16a34a',
  danger: '#dc2626',
  muted: '#94a3b8',
  violet: '#7c3aed',
} as const;

/** Palet warna berbeda-beda per kategori, mis. satu warna per dokter pengirim. */
export const CHART_PALETTE: readonly string[] = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
  '#4f46e5',
  '#ea580c',
  '#0d9488',
  '#9333ea',
];

export function paletteColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => CHART_PALETTE[i % CHART_PALETTE.length]!);
}

export function baseChartOptions(): ApexOptions {
  return {
    chart: {
      fontFamily: 'inherit',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { width: 2 },
    legend: {
      position: 'bottom',
      fontSize: '13px',
      labels: { colors: '#64748b' },
    },
    tooltip: { theme: 'light' },
  };
}
