import { useState } from 'react';
import type { AppViewId } from '../config/navigation.ts';
import { LaboratoriumPage } from './LaboratoriumPage.tsx';
import { LabDuplikatPage } from './LabDuplikatPage.tsx';
import { KwitansiLaboratoriumPage } from './KwitansiLaboratoriumPage.tsx';
import { SharingArsipPage } from './SharingArsipPage.tsx';
import { HargaPemeriksaanLabPage } from './HargaPemeriksaanLabPage.tsx';
import { CetakLabLabPage } from './CetakLabLabPage.tsx';
import { PaketLabMasterPage } from './PaketLabMasterPage.tsx';
import { PetugasLabPage } from './PetugasLabPage.tsx';
import { KlasifikasiPaketPage } from './KlasifikasiPaketPage.tsx';
import { HitunganLedPage } from './HitunganLedPage.tsx';
import { KaryawanPage } from './KaryawanPage.tsx';

const LABORATORIUM_TABS = [
  { id: 'lab', label: 'Registrasi Lab' },
  { id: 'lab-duplikat', label: 'Duplikat Registrasi' },
  { id: 'kwitansi-laboratorium', label: 'Kwitansi' },
  { id: 'sharing-lab', label: 'Sharing Lab' },
  { id: 'harga-pemeriksaan-lab', label: 'Harga Pemeriksaan Lab' },
  { id: 'cetak-amplop-lab', label: 'Cetak Amplop' },
  { id: 'cetak-label-lab', label: 'Cetak Label' },
  { id: 'paket-lab-master', label: 'Jenis Pemeriksaan Lab' },
  { id: 'petugas-lab-master', label: 'Analis' },
  { id: 'klasifikasi-paket', label: 'Klasifikasi Paket' },
  { id: 'hitungan-led', label: 'Hitungan LED' },
  { id: 'karyawan-laboratorium', label: 'Daftar Karyawan' },
] as const;

type LaboratoriumTabId = (typeof LABORATORIUM_TABS)[number]['id'];

function isLaboratoriumTabId(value: AppViewId): value is LaboratoriumTabId {
  return (LABORATORIUM_TABS as readonly { readonly id: string }[]).some((tab) => tab.id === value);
}

function renderTabContent(tabId: LaboratoriumTabId, goToTab: (tab: LaboratoriumTabId) => void) {
  switch (tabId) {
    case 'lab':
      return (
        <LaboratoriumPage
          onNavigate={(view) => {
            if (isLaboratoriumTabId(view)) goToTab(view);
          }}
        />
      );
    case 'lab-duplikat':
      return <LabDuplikatPage />;
    case 'kwitansi-laboratorium':
      return <KwitansiLaboratoriumPage />;
    case 'sharing-lab':
      return <SharingArsipPage modul="LABORATORIUM" />;
    case 'harga-pemeriksaan-lab':
      return <HargaPemeriksaanLabPage />;
    case 'cetak-amplop-lab':
      return <CetakLabLabPage mode="amplop" />;
    case 'cetak-label-lab':
      return <CetakLabLabPage mode="label" />;
    case 'paket-lab-master':
      return <PaketLabMasterPage />;
    case 'petugas-lab-master':
      return <PetugasLabPage />;
    case 'klasifikasi-paket':
      return <KlasifikasiPaketPage />;
    case 'hitungan-led':
      return <HitunganLedPage />;
    case 'karyawan-laboratorium':
      return <KaryawanPage departemen="LABORATORIUM" />;
    default: {
      const exhaustiveCheck: never = tabId;
      return exhaustiveCheck;
    }
  }
}

/** Menggabungkan seluruh sub-halaman modul Laboratorium ke dalam satu
 * halaman dengan tab, menggantikan dropdown navbar Laboratorium yang
 * sebelumnya membuka jendela terpisah per menu. */
export function LaboratoriumHubPage() {
  const [activeTab, setActiveTab] = useState<LaboratoriumTabId>('lab');

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        {LABORATORIUM_TABS.map((tab) => (
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
      {renderTabContent(activeTab, setActiveTab)}
    </>
  );
}
