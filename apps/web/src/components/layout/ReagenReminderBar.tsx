import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal.tsx';
import { ModalFormFooter } from '../ui/ModalFormFooter.tsx';
import { apiGet, apiPut } from '../../lib/api.ts';
import { withIndonesianVoice } from '../../lib/speechVoice.ts';

const REAGEN_REMINDER_STORAGE_KEY = 'labprima-reagen-stock-opname-reminder-tanggal';

const DEFAULT_REAGEN_REMINDER_PESAN =
  'Perhatian, sudah tanggal 20. Segera hitung stock opname laboratorium, dan lakukan pembelian jika stok kurang.';

interface ReagenReminderSetting {
  readonly tanggal: number;
  readonly pesan: string;
}

/** Ucapkan teks lewat speaker, pola sama seperti peringatan stok film di
 * PemakaianFilmPage. */
function speakText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
  withIndonesianVoice((voice) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voice?.lang ?? 'id-ID';
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.volume = 1;
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  });
}

/** Tombol & pengaturan pengingat stock opname reagen — ditampilkan di
 * AppShell untuk semua halaman modul Laboratorium (bukan cuma LaboratoriumHubPage),
 * supaya tetap terlihat & tetap bicara sekalipun staff membuka menu lab lewat
 * link langsung (mis. "Registrasi Lab") bukan lewat tab Hub. */
export function ReagenReminderBar() {
  const [reminderSetting, setReminderSetting] = useState<ReagenReminderSetting | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form, setForm] = useState({ tanggal: '20', pesan: DEFAULT_REAGEN_REMINDER_PESAN });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ item: ReagenReminderSetting }>('/api/reagen-reminder-setting');
        setReminderSetting(res.item);
      } catch {
        // Gagal memuat pengaturan — pakai default (tanggal 20) sampai berhasil dimuat ulang.
        setReminderSetting({ tanggal: 20, pesan: DEFAULT_REAGEN_REMINDER_PESAN });
      }
    })();
  }, []);

  // Ucapkan pengingat stock opname reagen sekali per hari, pada tanggal &
  // dengan isi teks sesuai pengaturan (bukan setiap kali halaman Laboratorium
  // dibuka di hari yang sama).
  useEffect(() => {
    if (!reminderSetting) return;
    const now = new Date();
    if (now.getDate() !== reminderSetting.tanggal) return;
    const todayKey = now.toISOString().split('T')[0] ?? '';
    try {
      if (window.localStorage.getItem(REAGEN_REMINDER_STORAGE_KEY) === todayKey) return;
      window.localStorage.setItem(REAGEN_REMINDER_STORAGE_KEY, todayKey);
    } catch {
      // localStorage tidak tersedia (mis. private mode) — tetap ucapkan sekali.
    }
    speakText(reminderSetting.pesan);
  }, [reminderSetting]);

  function openSettings() {
    setForm({
      tanggal: String(reminderSetting?.tanggal ?? 20),
      pesan: reminderSetting?.pesan ?? DEFAULT_REAGEN_REMINDER_PESAN,
    });
    setSaveError(null);
    setSettingsOpen(true);
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiPut<{ item: ReagenReminderSetting }>('/api/reagen-reminder-setting', {
        tanggal: Number(form.tanggal) || 20,
        pesan: form.pesan,
      });
      setReminderSetting(res.item);
      setSettingsOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan pengingat');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0.5rem 1rem 0' }}>
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={openSettings}
          style={{ border: '1px solid var(--color-border)' }}
          title="Atur tanggal & isi suara pengingat stock opname reagen"
        >
          🔊 Pengingat Reagen
        </button>
      </div>

      <Modal open={settingsOpen} title="Pengaturan Pengingat Stock Opname Reagen" onClose={() => setSettingsOpen(false)}>
        <form onSubmit={(e) => void handleSaveSettings(e)} className="form-grid">
          {saveError && <p className="alert alert--error form-field--full">{saveError}</p>}
          <div className="form-field">
            <label htmlFor="reagen-tanggal">Tanggal Pengingat (1-31)</label>
            <input
              id="reagen-tanggal"
              type="number"
              min="1"
              max="31"
              required
              value={form.tanggal}
              onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
            />
          </div>
          <div className="form-field form-field--full">
            <label htmlFor="reagen-pesan">Isi Suara Pengingat</label>
            <textarea
              id="reagen-pesan"
              rows={4}
              required
              value={form.pesan}
              onChange={(e) => setForm((f) => ({ ...f, pesan: e.target.value }))}
            />
          </div>
          <div className="form-field form-field--full">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => speakText(form.pesan)}
              style={{ border: '1px solid var(--color-border)' }}
            >
              🔊 Tes Suara
            </button>
          </div>
          <ModalFormFooter onCancel={() => setSettingsOpen(false)} submitLabel="Simpan" loading={saving} />
        </form>
      </Modal>
    </>
  );
}
