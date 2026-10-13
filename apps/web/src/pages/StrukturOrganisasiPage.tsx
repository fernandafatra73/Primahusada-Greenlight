import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { apiGet, apiPut } from '../lib/api.ts';
import { readFileAsDataUrl, validateFotoFile } from '../lib/fotoUpload.ts';
import {
  fotoToPngDataUrl,
  printStrukturOrganisasiPdf,
  printStrukturOrganisasiWord,
  type StrukturOrganisasiPrintInput,
} from '../pdf/printStrukturOrganisasi.tsx';
import '../components/ui/ui.css';

interface Anggota {
  readonly jabatan: string;
  readonly nama: string;
  readonly foto: string | null;
}

const JABATAN_LABEL: Readonly<Record<string, string>> = {
  pimpinan: 'Pimpinan Klinik Prima Husada',
  'dokter-penanggung-jawab': 'Dokter Penanggung Jawab',
  hrd: 'HRD',
  radiologi: 'Radiologi',
  laboratorium: 'Laboratorium',
  kebersihan: 'Kebersihan',
  admin: 'Admin',
};

const URUTAN_ISI = [
  'pimpinan',
  'dokter-penanggung-jawab',
  'hrd',
  'radiologi',
  'laboratorium',
  'kebersihan',
  'admin',
] as const;

const UNIT_KERJA = ['hrd', 'radiologi', 'laboratorium', 'kebersihan', 'admin'] as const;

const kotakStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface, #fff)',
  minWidth: '15rem',
} as const;

const garisStyle = {
  width: '2px',
  height: '1.25rem',
  background: 'var(--color-border)',
} as const;

function fotoStyle(ukuran: number) {
  return {
    width: ukuran,
    height: ukuran,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
    background: 'var(--color-border)',
  } as const;
}

function labelJabatan(jabatan: string): string {
  return JABATAN_LABEL[jabatan] ?? jabatan;
}

function Kotak({ anggota, utama = false }: { readonly anggota: Anggota; readonly utama?: boolean }) {
  return (
    <div style={{ ...kotakStyle, ...(utama ? { borderColor: 'var(--color-primary)' } : {}) }}>
      {anggota.foto ? (
        <img src={anggota.foto} alt={anggota.nama || labelJabatan(anggota.jabatan)} style={fotoStyle(64)} />
      ) : (
        <div style={fotoStyle(64)} aria-hidden="true" />
      )}
      <div>
        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{labelJabatan(anggota.jabatan)}</div>
        <div style={{ fontWeight: 600 }}>{anggota.nama || '-'}</div>
      </div>
    </div>
  );
}

interface Draft {
  readonly nama: string;
  readonly foto: string | null;
}

/** Struktur organisasi Klinik Prima Husada. Kiri: pengisian nama dan foto
 * tiap posisi. Kanan: bagan (pimpinan di puncak, dokter penanggung jawab di
 * bawahnya, lalu unit kerja sejajar). */
export function StrukturOrganisasiPage() {
  const [items, setItems] = useState<readonly Anggota[]>([]);
  const [drafts, setDrafts] = useState<Readonly<Record<string, Draft>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [printing, setPrinting] = useState<'pdf' | 'word' | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ items: Anggota[] }>('/api/struktur-organisasi');
      setItems(res.items);
      setDrafts(Object.fromEntries(res.items.map((a) => [a.jabatan, { nama: a.nama, foto: a.foto }])));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat struktur organisasi');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function ubahDraft(jabatan: string, perubahan: Partial<Draft>) {
    setDrafts((d) => {
      const lama = d[jabatan] ?? { nama: '', foto: null };
      return { ...d, [jabatan]: { ...lama, ...perubahan } };
    });
  }

  async function handleFotoChange(jabatan: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const invalid = validateFotoFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    try {
      ubahDraft(jabatan, { foto: await readFileAsDataUrl(file) });
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membaca foto');
    }
  }

  async function handleSimpan(jabatan: string) {
    const draft = drafts[jabatan];
    if (!draft) return;
    setSaving(jabatan);
    setError(null);
    try {
      await apiPut(`/api/struktur-organisasi/${jabatan}`, { nama: draft.nama, foto: draft.foto ?? '' });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(null);
    }
  }

  const byJabatan = new Map(items.map((a) => [a.jabatan, a]));
  const pimpinan = byJabatan.get('pimpinan');
  const dokter = byJabatan.get('dokter-penanggung-jawab');

  async function buildPrintInput(): Promise<StrukturOrganisasiPrintInput> {
    const toAnggota = async (jabatan: string) => {
      const a = byJabatan.get(jabatan);
      return {
        jabatan: labelJabatan(jabatan),
        nama: a?.nama ?? '',
        fotoSrc: await fotoToPngDataUrl(a?.foto ?? null),
      };
    };
    return {
      pimpinan: await toAnggota('pimpinan'),
      penanggungJawab: await toAnggota('dokter-penanggung-jawab'),
      unitKerja: await Promise.all(UNIT_KERJA.map(toAnggota)),
    };
  }

  async function handlePrint(format: 'pdf' | 'word') {
    setPrinting(format);
    setError(null);
    try {
      const input = await buildPrintInput();
      if (format === 'pdf') await printStrukturOrganisasiPdf(input);
      else await printStrukturOrganisasiWord(input);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mencetak struktur organisasi');
    } finally {
      setPrinting(null);
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <h2>Struktur Organisasi</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={printing !== null}
            onClick={() => void handlePrint('pdf')}
          >
            {printing === 'pdf' ? 'Membuat PDF...' : 'Cetak PDF'}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={printing !== null}
            onClick={() => void handlePrint('word')}
          >
            {printing === 'word' ? 'Membuat Word...' : 'Cetak Word'}
          </button>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div
          style={{
            flex: '0 0 20rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
          }}
        >
          {URUTAN_ISI.map((jabatan) => {
            const draft = drafts[jabatan] ?? { nama: '', foto: null };
            return (
              <div key={jabatan} className="form-field">
                <label htmlFor={`struktur-${jabatan}`}>{labelJabatan(jabatan)}</label>
                <input
                  id={`struktur-${jabatan}`}
                  value={draft.nama}
                  maxLength={100}
                  placeholder="Nama"
                  onChange={(e) => ubahDraft(jabatan, { nama: e.target.value })}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                  {draft.foto && <img src={draft.foto} alt="" style={fotoStyle(36)} />}
                  <input
                    type="file"
                    aria-label={`Foto ${labelJabatan(jabatan)}`}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => void handleFotoChange(jabatan, e)}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  {draft.foto && (
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => ubahDraft(jabatan, { foto: null })}
                    >
                      Hapus
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  disabled={saving !== null}
                  onClick={() => void handleSimpan(jabatan)}
                  style={{ marginTop: '0.35rem', alignSelf: 'flex-start' }}
                >
                  {saving === jabatan ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: '18rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {pimpinan && <Kotak anggota={pimpinan} utama />}
          <div style={garisStyle} />
          {dokter && <Kotak anggota={dokter} utama />}
          <div style={garisStyle} />
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              borderTop: '2px solid var(--color-border)',
              paddingTop: '1.25rem',
            }}
          >
            {UNIT_KERJA.map((jabatan) => {
              const anggota = byJabatan.get(jabatan);
              return anggota ? <Kotak key={jabatan} anggota={anggota} /> : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
