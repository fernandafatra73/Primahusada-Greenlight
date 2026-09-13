import { useState } from 'react';
import { FatraPage } from './FatraPage.tsx';
import { MusikPage } from './MusikPage.tsx';
import { TempletPage } from './TempletPage.tsx';
import { TransferPage } from './TransferPage.tsx';
import { DaftarTelponPage } from './DaftarTelponPage.tsx';
import { KalenderPage } from './KalenderPage.tsx';
import { WhatsAppPage } from './WhatsAppPage.tsx';
import { TelegramPage } from './TelegramPage.tsx';
import { KalkulatorPage } from './KalkulatorPage.tsx';
import { AiGeminiPage } from './AiGeminiPage.tsx';

const MEGA_DATA_TABS = [
  { id: 'fatra', label: 'Fatra' },
  { id: 'musik-ph', label: 'Musik-PH' },
  { id: 'templet', label: 'Templet' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'daftar-telpon', label: 'Daftar Telpon' },
  { id: 'kalender', label: 'Kalender' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'kalkulator', label: 'Kalkulator' },
  { id: 'ai-gemini', label: 'AI Gemini' },
] as const;

type MegaDataTabId = (typeof MEGA_DATA_TABS)[number]['id'];

function renderTabContent(tabId: MegaDataTabId) {
  switch (tabId) {
    case 'fatra':
      return <FatraPage />;
    case 'musik-ph':
      return <MusikPage />;
    case 'templet':
      return <TempletPage />;
    case 'transfer':
      return <TransferPage />;
    case 'daftar-telpon':
      return <DaftarTelponPage />;
    case 'kalender':
      return <KalenderPage />;
    case 'whatsapp':
      return <WhatsAppPage />;
    case 'telegram':
      return <TelegramPage />;
    case 'kalkulator':
      return <KalkulatorPage />;
    case 'ai-gemini':
      return <AiGeminiPage />;
    default: {
      const exhaustiveCheck: never = tabId;
      return exhaustiveCheck;
    }
  }
}

/** Menggabungkan seluruh sub-halaman Mega Data ke dalam satu halaman
 * dengan tab, menggantikan dropdown navbar Mega Data yang sebelumnya
 * membuka jendela terpisah per menu. */
export function MegaDataHubPage() {
  const [activeTab, setActiveTab] = useState<MegaDataTabId>('fatra');

  return (
    <>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {MEGA_DATA_TABS.map((tab) => (
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
