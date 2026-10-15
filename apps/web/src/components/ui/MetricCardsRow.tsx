import type { ReactNode } from 'react';
import { MetricIcon, type MetricIconKind, type MetricTone } from '../icons/MetricIcons.tsx';

export type { MetricTone };

export interface MetricCardItem {
  readonly label: string;
  readonly value: string;
  readonly tone?: MetricTone;
  /** Ikon bawaan per jenis kartu (hindari semua shield). */
  readonly iconKind?: MetricIconKind;
  readonly icon?: ReactNode;
}

interface MetricCardsRowProps {
  readonly items: MetricCardItem[];
  /** Sel tambahan (mis. tombol aksi) tepat di kanan kartu terakhir. */
  readonly extra?: ReactNode;
}

export function MetricCardsRow({ items, extra }: MetricCardsRowProps) {
  return (
    <div className="metric-cards-row">
      {items.map((item) => {
        const tone = item.tone ?? 'blue';
        const icon =
          item.icon ??
          (item.iconKind ? <MetricIcon kind={item.iconKind} tone={tone} /> : null);
        return (
          <article key={item.label} className="metric-card">
            <div className="metric-card__body">
              <p className="metric-card__label">{item.label}</p>
              <p className="metric-card__value">{item.value}</p>
            </div>
            {icon}
          </article>
        );
      })}
      {extra && <div className="metric-cards-row__extra">{extra}</div>}
    </div>
  );
}
