import { useState } from 'react';
import { apiPost } from '../lib/api.ts';
import './ui/ui.css';

interface AiHasilActionsProps {
  /** Nama pasien, ikut dicatat sebagai keterangan bila sudah terisi. */
  readonly namaPasien: string;
  /** Modal asal hasil ini, dipakai membedakan barisnya di tabel. */
  readonly pemeriksaan: string;
  readonly namaPenyakit: string;
  readonly fotoDataUrl: string;
  /** Teks bacaan yang disalin dan disimpan. */
  readonly kesan: string;
}

/** Tombol salin dan simpan untuk hasil pembacaan AI.
 *
 * "Simpan ke Tabel AI" mengarsipkan foto beserta hasil analisanya ke tabel AI
 * tersendiri, yang dibuka lewat tombol "Tabel AI" di halaman Pasien — berbeda
 * dari tombol Simpan yang sudah ada di modal, yang hanya menyalin bacaan ke
 * formulir pasien. */
export function AiHasilActions({
  namaPasien,
  pemeriksaan,
  namaPenyakit,
  fotoDataUrl,
  kesan,
}: AiHasilActionsProps) {
  const [disalin, setDisalin] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adaIsi = kesan.trim() !== '' || namaPenyakit.trim() !== '';

  async function salin() {
    const teks = namaPenyakit.trim() ? `${namaPenyakit.trim()}\n\n${kesan}` : kesan;
    try {
      await navigator.clipboard.writeText(teks.trim());
      setDisalin(true);
      setError(null);
      setTimeout(() => setDisalin(false), 2000);
    } catch {
      setError('Tidak bisa menyalin otomatis — silakan blok teksnya lalu salin manual.');
    }
  }

  async function simpan() {
    if (!fotoDataUrl) {
      setError('Belum ada foto untuk disimpan.');
      return;
    }
    setMenyimpan(true);
    try {
      await apiPost('/api/tabel-ai', {
        namaPasien,
        asal: pemeriksaan,
        namaPenyakit,
        foto: fotoDataUrl,
        hasilAnalisa: kesan,
      });
      setTersimpan(true);
      setError(null);
      setTimeout(() => setTersimpan(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan ke Tabel AI');
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="form-field form-grid--full">
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => void salin()}
          disabled={!adaIsi}
        >
          {disalin ? '✅ Tersalin' : '📋 Salin Bacaan'}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => void simpan()}
          disabled={!adaIsi || menyimpan}
        >
          {menyimpan ? 'Menyimpan…' : tersimpan ? '✅ Tersimpan' : '💾 Simpan ke Tabel AI'}
        </button>
      </div>
      {error && (
        <div className="alert alert--error" style={{ marginTop: '0.4rem' }}>
          {error}
        </div>
      )}
      {tersimpan && !error && (
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#166534' }}>
          Foto dan hasil analisanya tersimpan — buka lewat tombol “Tabel AI”.
        </p>
      )}
    </div>
  );
}
