import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { apiGet, apiPost } from '../lib/api.ts';
import { insertTextAt } from '../lib/insertText.ts';
import { Modal } from './ui/Modal.tsx';
import { ModalFormFooter } from './ui/ModalFormFooter.tsx';
import './ui/ui.css';

interface KesanTemplateRow {
  readonly id: string;
  readonly judul: string;
  readonly isi: string;
}

interface Rad2KesanModalProps {
  readonly nama: string;
  readonly initialKesan: string;
  readonly saving: boolean;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onSave: (kesan: string) => void;
}

/** Editor khusus kolom Kesan Rad2: klik baris Master Kesan di tabel bawah untuk
 * menyisipkan isinya ke posisi kursor pada kotak teks. */
export function Rad2KesanModal({ nama, initialKesan, saving, error, onClose, onSave }: Rad2KesanModalProps) {
  const [kesan, setKesan] = useState(initialKesan);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorRef = useRef<number | null>(null);

  const [templates, setTemplates] = useState<readonly KesanTemplateRow[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newJudul, setNewJudul] = useState('');
  const [newIsi, setNewIsi] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplateError(null);
    try {
      const res = await apiGet<{ items: KesanTemplateRow[] }>('/api/kesan-template?limit=100');
      setTemplates(res.items);
    } catch (err: unknown) {
      setTemplateError(err instanceof Error ? err.message : 'Gagal memuat Master Kesan');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    const cursor = pendingCursorRef.current;
    const el = textareaRef.current;
    if (cursor === null || !el) return;
    pendingCursorRef.current = null;
    el.focus();
    el.setSelectionRange(cursor, cursor);
  }, [kesan]);

  function handlePick(isi: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? kesan.length;
    const end = el?.selectionEnd ?? kesan.length;
    const result = insertTextAt(kesan, isi, start, end);
    pendingCursorRef.current = result.cursor;
    setKesan(result.text);
  }

  function openAdd() {
    setNewJudul('');
    // Isi awal diambil dari kotak teks supaya kesan yang baru diketik bisa langsung dijadikan template.
    setNewIsi(kesan);
    setAddError(null);
    setAddOpen(true);
  }

  async function handleAdd() {
    if (!newJudul.trim() || !newIsi.trim()) {
      setAddError('Judul dan isi kesan wajib diisi');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await apiPost('/api/kesan-template', { judul: newJudul.trim(), isi: newIsi.trim() });
      setAddOpen(false);
      await loadTemplates();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Gagal menambah kesan');
    } finally {
      setAdding(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave(kesan);
  }

  return (
    <Modal open={true} title={`Edit Kesan — ${nama}`} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="form-grid">
        {error && <div className="alert alert--error form-grid--full">{error}</div>}
        <div className="form-field form-grid--full">
          <label htmlFor="rad2-kesan-editor">Kesan</label>
          <textarea
            id="rad2-kesan-editor"
            ref={textareaRef}
            rows={8}
            value={kesan}
            onChange={(e) => setKesan(e.target.value)}
            placeholder="Ketik kesan, atau klik baris tabel di bawah untuk menyisipkan teks"
          />
        </div>
        <ModalFormFooter onCancel={onClose} submitLabel="Simpan Kesan" loading={saving} />

        <div className="form-grid--full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {!addOpen && (
            <button type="button" className="btn btn--sm btn--secondary" onClick={openAdd}>
              + Tambah Kesan
            </button>
          )}
        </div>

        {addOpen && (
          <div
            className="form-grid--full"
            style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.75rem' }}
          >
            {addError && (
              <p className="alert alert--error" style={{ marginTop: 0 }}>
                {addError}
              </p>
            )}
            <div className="form-field">
              <label htmlFor="rad2-kesan-baru-judul">Judul *</label>
              <input id="rad2-kesan-baru-judul" value={newJudul} onChange={(e) => setNewJudul(e.target.value)} />
            </div>
            <div className="form-field" style={{ marginTop: '0.5rem' }}>
              <label htmlFor="rad2-kesan-baru-isi">Isi Kesan *</label>
              <textarea id="rad2-kesan-baru-isi" rows={4} value={newIsi} onChange={(e) => setNewIsi(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => setAddOpen(false)} disabled={adding}>
                Batal
              </button>
              <button type="button" className="btn btn--sm btn--primary" onClick={() => void handleAdd()} disabled={adding}>
                {adding ? 'Menyimpan...' : 'Simpan Kesan Baru'}
              </button>
            </div>
          </div>
        )}

        <div className="form-grid--full" style={{ maxHeight: '320px', overflowY: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '48px' }}>No</th>
                <th style={{ width: '30%' }}>Judul</th>
                <th>Isi</th>
              </tr>
            </thead>
            <tbody>
              {templateError ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: '#b91c1c' }}>
                    {templateError}
                  </td>
                </tr>
              ) : loadingTemplates && templates.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '1rem' }}>
                    Memuat...
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '1rem' }}>
                    Belum ada kesan.
                  </td>
                </tr>
              ) : (
                templates.map((t, idx) => (
                  <tr
                    key={t.id}
                    onClick={() => handlePick(t.isi)}
                    title="Klik untuk memasukkan ke kotak teks"
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{t.judul}</td>
                    <td style={{ whiteSpace: 'pre-wrap' }}>{t.isi}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </form>
    </Modal>
  );
}
