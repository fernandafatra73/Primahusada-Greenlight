import { useState } from 'react';
import { FarmasiBhpPage } from './FarmasiBhpPage.tsx';
import { FarmasiKwitansiPage } from './FarmasiKwitansiPage.tsx';

const FARMASI_TABS = [
  { id: 'farmasi-bhp', label: 'Stok Obat & BHP' },
  { id: 'kwitansi-farmasi', label: 'Kwitansi Farmasi' },
] as const;

type FarmasiTabId = (typeof FARMASI_TABS)[number]['id'];

function renderTabContent(tabId: FarmasiTabId) {
  switch (tabId) {
    case 'farmasi-bhp':
      return <FarmasiBhpPage />;
    case 'kwitansi-farmasi':
      return <FarmasiKwitansiPage />;
    default: {
      const exhaustiveCheck: never = tabId;
      return exhaustiveCheck;
    }
  }
}

/** Menggabungkan seluruh sub-halaman kategori Farmasi (dulu dropdown navbar)
 * ke dalam satu halaman dengan tab, senada dengan hub Radiologi/Laboratorium. */
export function FarmasiHubPage() {
  const [activeTab, setActiveTab] = useState<FarmasiTabId>('farmasi-bhp');

  return (
    <div className="page-frame page-frame--rose">
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {FARMASI_TABS.map((tab) => (
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
    </div>
  );
}
