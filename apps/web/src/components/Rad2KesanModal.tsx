import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue.ts';
import { apiGet } from '../lib/api.ts';
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

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [templates, setTemplates] = useState<readonly KesanTemplateRow[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingTemplates(true);
    setTemplateError(null);
    const params = new URLSearchParams({ limit: '100' });
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    apiGet<{ items: KesanTemplateRow[] }>(`/api/kesan-template?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setTemplates(res.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setTemplateError(err instanceof Error ? err.message : 'Gagal memuat Master Kesan');
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave(kesan);
  }

  return (
    <Modal open={true} title={`Edit Kesan — ${nama}`} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="form-grid">
        {error && <div className="alert alert--error form-field--full">{error}</div>}
        <div className="form-field form-field--full">
          <label htmlFor="rad2-kesan-editor">Kesan</label>
          <textarea
            id="rad2-kesan-editor"
            ref={textareaRef}
            rows={8}
            value={kesan}
            onChange={(e) => setKesan(e.target.value)}
            placeholder="Ketik kesan, atau klik baris Master Kesan di bawah untuk menyisipkan teks"
          />
        </div>
        <ModalFormFooter onCancel={onClose} submitLabel="Simpan Kesan" loading={saving} />

        <div className="form-field form-field--full">
          <input
            id="rad2-kesan-cari"
            type="search"
            aria-label="Cari Master Kesan"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul atau isi kesan..."
          />
        </div>
        <div className="form-field form-field--full" style={{ maxHeight: '320px', overflowY: 'auto' }}>
          <table className="data-table">
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
                    Belum ada Master Kesan.
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
