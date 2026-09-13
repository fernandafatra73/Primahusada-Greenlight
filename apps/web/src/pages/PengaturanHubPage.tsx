import { useState } from 'react';
import { LogoPerusahaanPage } from './LogoPerusahaanPage.tsx';
import { AutotextPage } from './AutotextPage.tsx';
import { FotoDashboardPage } from './FotoDashboardPage.tsx';
import { BackupDatabasePage } from './BackupDatabasePage.tsx';

const PENGATURAN_TABS = [
  { id: 'logo-perusahaan', label: 'Kop Surat & Logo' },
  { id: 'autote1', label: 'Autote1' },
  { id: 'foto-dashboard', label: 'Foto untuk Dashboard' },
  { id: 'backup-database', label: 'Backup & Restore Database' },
] as const;

type PengaturanTabId = (typeof PENGATURAN_TABS)[number]['id'];

function renderTabContent(tabId: PengaturanTabId) {
  switch (tabId) {
    case 'logo-perusahaan':
      return <LogoPerusahaanPage />;
    case 'autote1':
      return <AutotextPage />;
    case 'foto-dashboard':
      return <FotoDashboardPage />;
    case 'backup-database':
      return <BackupDatabasePage />;
    default: {
      const exhaustiveCheck: never = tabId;
      return exhaustiveCheck;
    }
  }
}

/** Menggabungkan seluruh sub-halaman Pengaturan ke dalam satu halaman
 * dengan tab, menggantikan dropdown navbar Pengaturan yang sebelumnya
 * membuka jendela terpisah per menu. */
export function PengaturanHubPage() {
  const [activeTab, setActiveTab] = useState<PengaturanTabId>('logo-perusahaan');

  return (
    <>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {PENGATURAN_TABS.map((tab) => (
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
