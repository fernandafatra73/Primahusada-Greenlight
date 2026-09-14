import { useState } from 'react';
import { DokterPage } from './DokterPage.tsx';
import { KaryawanKlinikPage } from './KaryawanKlinikPage.tsx';
import { TandaTanganElektronikPage } from './TandaTanganElektronikPage.tsx';
import { RolePage } from './RolePage.tsx';
import { AdminPage } from './AdminPage.tsx';

const DOKTER_TABS = [
  { id: 'dokter', label: 'Dokter Pengirim' },
  { id: 'karyawan-klinik', label: 'Karyawan Klinik' },
  { id: 'tanda-tangan-elektronik', label: 'Tanda Tangan Elektronik' },
  { id: 'role', label: 'Role & Staff' },
  { id: 'admin', label: 'Admin' },
] as const;

type DokterTabId = (typeof DOKTER_TABS)[number]['id'];

function renderTabContent(tabId: DokterTabId) {
  switch (tabId) {
    case 'dokter':
      return <DokterPage />;
    case 'karyawan-klinik':
      return <KaryawanKlinikPage />;
    case 'tanda-tangan-elektronik':
      return <TandaTanganElektronikPage />;
    case 'role':
      return <RolePage />;
    case 'admin':
      return <AdminPage />;
    default: {
      const exhaustiveCheck: never = tabId;
      return exhaustiveCheck;
    }
  }
}

/** Menggabungkan seluruh sub-halaman kategori Dokter (dulu dropdown navbar)
 * ke dalam satu halaman dengan tab, senada dengan hub Radiologi/Laboratorium. */
export function DokterHubPage() {
  const [activeTab, setActiveTab] = useState<DokterTabId>('dokter');

  return (
    <div className="page-frame page-frame--violet">
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {DOKTER_TABS.map((tab) => (
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
