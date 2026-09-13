import { useState } from 'react';
import { PendaftaranUmumPage } from './PendaftaranUmumPage.tsx';
import { AdminKlinikPage } from './AdminKlinikPage.tsx';
import { AbsensiAdminKlinikPage } from './AbsensiAdminKlinikPage.tsx';
import { withIndonesianVoice } from '../lib/speechVoice.ts';

const PENDAFTARAN_TABS = [
  { id: 'pendaftaran-umum', label: 'Pendaftaran Umum' },
  { id: 'admin-klinik', label: 'Admin Klinik' },
  { id: 'absensi-admin-klinik', label: 'Absensi' },
] as const;

type PendaftaranTabId = (typeof PENDAFTARAN_TABS)[number]['id'];

/** Ucapkan teks panggilan lewat speaker. */
function speakPanggilan(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  withIndonesianVoice((voice) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(trimmed);
    utter.lang = voice?.lang ?? 'id-ID';
    utter.rate = 0.9;
    utter.pitch = 1;
    utter.volume = 1;
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  });
}

function renderTabContent(tabId: PendaftaranTabId) {
  switch (tabId) {
    case 'pendaftaran-umum':
      return <PendaftaranUmumPage />;
    case 'admin-klinik':
      return <AdminKlinikPage />;
    case 'absensi-admin-klinik':
      return <AbsensiAdminKlinikPage />;
    default: {
      const exhaustiveCheck: never = tabId;
      return exhaustiveCheck;
    }
  }
}

/** Menggabungkan Pendaftaran Umum dan Admin Klinik ke dalam satu halaman
 * dengan tab. */
export function PendaftaranHubPage() {
  const [activeTab, setActiveTab] = useState<PendaftaranTabId>('pendaftaran-umum');
  const [panggilanText, setPanggilanText] = useState('');

  return (
    <>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {PENDAFTARAN_TABS.map((tab) => (
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
        <input
          type="text"
          className="filter-control"
          value={panggilanText}
          onChange={(e) => setPanggilanText(e.target.value)}
          placeholder="Tulis teks panggilan..."
          aria-label="Teks panggilan"
          style={{ width: '360px' }}
        />
        <button
          type="button"
          className="btn btn--sm btn--primary"
          onClick={() => speakPanggilan(panggilanText)}
          disabled={!panggilanText.trim()}
          title="Ucapkan teks panggilan"
        >
          🔊 Panggilan
        </button>
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() => setPanggilanText('')}
          disabled={!panggilanText}
          title="Hapus teks panggilan"
          style={{ border: '1px solid var(--color-border)' }}
        >
          ✕ Hapus
        </button>
      </div>
      {renderTabContent(activeTab)}
    </>
  );
}
