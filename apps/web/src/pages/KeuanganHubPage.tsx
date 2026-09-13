import { useState } from 'react';
import { KeuanganPembukuanPage } from './KeuanganPembukuanPage.tsx';
import { HasilPerbulanPage } from './HasilPerbulanPage.tsx';
import { PenggajianPage } from './PenggajianPage.tsx';
import { LogoPerusahaanPage } from './LogoPerusahaanPage.tsx';
import { SharingPage } from './SharingPage.tsx';

const KEUANGAN_TABS = [
  { id: 'keuangan-pembukuan', label: 'Sistem Keuangan & Pembukuan' },
  { id: 'hasil-perbulan', label: 'Hasil Perbulan' },
  { id: 'penggajian', label: 'Penggajian' },
  { id: 'logo-perusahaan', label: 'Logo Perusahaan' },
  { id: 'sharing', label: 'Manajemen Sharing Dokter' },
] as const;

type KeuanganTabId = (typeof KEUANGAN_TABS)[number]['id'];

function renderTabContent(tabId: KeuanganTabId) {
  switch (tabId) {
    case 'keuangan-pembukuan':
      return <KeuanganPembukuanPage />;
    case 'hasil-perbulan':
      return <HasilPerbulanPage />;
    case 'penggajian':
      return <PenggajianPage />;
    case 'logo-perusahaan':
      return <LogoPerusahaanPage />;
    case 'sharing':
      return <SharingPage />;
    default: {
      const exhaustiveCheck: never = tabId;
      return exhaustiveCheck;
    }
  }
}

/** Menggabungkan seluruh sub-halaman Keuangan ke dalam satu halaman dengan
 * tab, menggantikan dropdown navbar Keuangan yang sebelumnya membuka
 * jendela terpisah per menu. */
export function KeuanganHubPage() {
  const [activeTab, setActiveTab] = useState<KeuanganTabId>('keuangan-pembukuan');

  return (
    <>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {KEUANGAN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`btn btn--sm ${activeTab === tab.id ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab(tab.id)}
            style={activeTab !== tab.id ? { border: '1px solid var(--color-border)' } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderTabContent(activeTab)}
    </>
  );
}
