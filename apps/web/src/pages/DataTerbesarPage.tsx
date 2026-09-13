import type { AppViewId } from '../config/navigation.ts';
import './DataTerbesarPage.css';

interface DataTerbesarPageProps {
  readonly onNavigate: (view: AppViewId) => void;
}

interface DataTerbesarItem {
  readonly id: AppViewId;
  readonly label: string;
  readonly icon: string;
}

const ITEMS: readonly DataTerbesarItem[] = [
  { id: 'pendaftaran-umum', label: 'Daftar', icon: '📝' },
  { id: 'pasien', label: 'Radiologi', icon: '🩻' },
  { id: 'lab', label: 'Laboratorium', icon: '🧪' },
  { id: 'farmasi-bhp', label: 'Farmasy', icon: '💊' },
  { id: 'rawat-jalan', label: 'Rawat Jalan', icon: '🚶' },
  { id: 'rawat-inap', label: 'Rawat Inap', icon: '🛏️' },
  { id: 'hrd', label: 'HRD', icon: '👥' },
  { id: 'lengkap', label: 'Lengkap', icon: '📋' },
  { id: 'keuangan-pembukuan', label: 'Keuangan', icon: '💰' },
];

export function DataTerbesarPage({ onNavigate }: DataTerbesarPageProps) {
  return (
    <div className="data-terbesar">
      <div className="data-terbesar__panel">
        <h2 className="data-terbesar__heading">Data Terbesar</h2>
        <div className="data-terbesar__grid">
          {ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="data-terbesar__button"
              onClick={() => onNavigate(item.id)}
            >
              <span className="data-terbesar__button-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
