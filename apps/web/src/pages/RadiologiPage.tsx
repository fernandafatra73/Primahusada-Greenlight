import { useState } from 'react';
import { PasienPage } from './PasienPage.tsx';
import { RadiologWorkPage } from './RadiologWorkPage.tsx';
import { Radiologi2Page } from './Radiologi2Page.tsx';
import { RadiologDuplikatPage } from './RadiologDuplikatPage.tsx';
import { KwitansiRadiologiPage } from './KwitansiRadiologiPage.tsx';
import { SharingArsipPage } from './SharingArsipPage.tsx';
import { SharingRadiologPage } from './SharingRadiologPage.tsx';
import { CetakALPage } from './CetakALPage.tsx';
import { JenisPemeriksaanPage } from './JenisPemeriksaanPage.tsx';
import { KesanPage } from './KesanPage.tsx';
import { RadiologMasterPage } from './RadiologMasterPage.tsx';
import { RadiograferPage } from './RadiograferPage.tsx';
import { KondisiAlatPage } from './KondisiAlatPage.tsx';
import { LogbookPasienPage } from './LogbookPasienPage.tsx';
import { GajiKaryawanPage } from './GajiKaryawanPage.tsx';
import { KaryawanPage } from './KaryawanPage.tsx';
import { AdvantagePage } from './AdvantagePage.tsx';
import { BhpRadiologiPage } from './BhpRadiologiPage.tsx';
import { AnalisaFotoRontgenPage } from './AnalisaFotoRontgenPage.tsx';
import { PemakaianFilmPage } from './PemakaianFilmPage.tsx';
import { AiRadiologiPage } from './AiRadiologiPage.tsx';

const RADIOLOGI_TABS = [
  { id: 'pasien', label: 'Registrasi Radiologi' },
  { id: 'radiolog', label: 'Pekerjaan Radiolog' },
  { id: 'radiologi2', label: 'Radiologi2' },
  { id: 'radiolog-duplikat', label: 'Duplikat Radiologi' },
  { id: 'kwitansi-radiologi', label: 'Kwitansi' },
  { id: 'sharing-radiologi', label: 'Sharing Radiologi' },
  { id: 'sharing-radiolog', label: 'Sharing Radiolog' },
  { id: 'cetak-al', label: 'Cetak A+L' },
  { id: 'jenis-pemeriksaan', label: 'Jenis Pemeriksaan' },
  { id: 'kesan', label: 'Master Kesan' },
  { id: 'radiolog-master', label: 'Master Radiolog' },
  { id: 'radiografer', label: 'Radiografer' },
  { id: 'kondisi-alat', label: 'Kondisi Alat' },
  { id: 'logbook-pasien', label: 'Logbook Pasien' },
  { id: 'gaji-karyawan', label: 'Gaji Karyawan' },
  { id: 'karyawan-radiologi', label: 'Daftar Karyawan' },
  { id: 'advantage', label: 'Advantage' },
  { id: 'bhp-radiologi', label: 'BHP' },
  { id: 'analisa-foto-rontgen', label: 'Analisa Foto Rontgen' },
  { id: 'pemakaian-film', label: 'Pemakaian Film' },
  { id: 'ai-radiologi', label: 'AI Radiologi' },
] as const;

type RadiologiTabId = (typeof RADIOLOGI_TABS)[number]['id'];

function renderTabContent(tabId: RadiologiTabId) {
  switch (tabId) {
    case 'pasien':
      return <PasienPage />;
    case 'radiolog':
      return <RadiologWorkPage />;
    case 'radiologi2':
      return <Radiologi2Page />;
    case 'radiolog-duplikat':
      return <RadiologDuplikatPage />;
    case 'kwitansi-radiologi':
      return <KwitansiRadiologiPage />;
    case 'sharing-radiologi':
      return <SharingArsipPage modul="RADIOLOGI" />;
    case 'sharing-radiolog':
      return <SharingRadiologPage />;
    case 'cetak-al':
      return <CetakALPage />;
    case 'jenis-pemeriksaan':
      return <JenisPemeriksaanPage />;
    case 'kesan':
      return <KesanPage />;
    case 'radiolog-master':
      return <RadiologMasterPage />;
    case 'radiografer':
      return <RadiograferPage />;
    case 'kondisi-alat':
      return <KondisiAlatPage />;
    case 'logbook-pasien':
      return <LogbookPasienPage />;
    case 'gaji-karyawan':
      return <GajiKaryawanPage />;
    case 'karyawan-radiologi':
      return <KaryawanPage departemen="RADIOLOGI" />;
    case 'advantage':
      return <AdvantagePage />;
    case 'bhp-radiologi':
      return <BhpRadiologiPage />;
    case 'analisa-foto-rontgen':
      return <AnalisaFotoRontgenPage />;
    case 'pemakaian-film':
      return <PemakaianFilmPage />;
    case 'ai-radiologi':
      return <AiRadiologiPage />;
    default: {
      const exhaustiveCheck: never = tabId;
      return exhaustiveCheck;
    }
  }
}

/** Menggabungkan seluruh sub-halaman modul Radiologi ke dalam satu halaman
 * dengan tab, menggantikan dropdown navbar Radiologi yang sebelumnya
 * membuka jendela terpisah per menu. */
export function RadiologiPage() {
  const [activeTab, setActiveTab] = useState<RadiologiTabId>('pasien');

  return (
    <div className="frame-biru-hitam">
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {RADIOLOGI_TABS.map((tab) => (
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
