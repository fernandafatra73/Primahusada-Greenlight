import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useListRefresh } from '../context/ListRefreshContext.tsx';
import { apiGet, apiPut } from '../lib/api.ts';
import '../components/ui/ui.css';

interface AutoTextItem {
  readonly id: string;
  readonly text: string;
}

interface AutoTextResponse {
  readonly item: AutoTextItem | null;
}

export function AutotextPage() {
  const { bump } = useListRefresh();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<AutoTextResponse>('/api/autotext');
      setText(res.item?.text ?? '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat autotext');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiPut('/api/autotext', { text });
      setSaved(true);
      bump();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan autotext');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <h2 className="page-heading__title">Autote1</h2>
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {loading ? (
        <p className="loading-text">Memuat data…</p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
          <div className="form-field form-field--full">
            <label htmlFor="autotext-text">Teks band bawah</label>
            <textarea
              id="autotext-text"
              rows={3}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setSaved(false);
              }}
              placeholder="Teks yang berjalan pada band di bawah aplikasi"
            />
          </div>
          <div className="form-field form-field--full" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
            {saved && <span style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}>Tersimpan.</span>}
          </div>
        </form>
      )}
    </>
  );
}
