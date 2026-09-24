import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { useMutationReload } from '../hooks/useMutationReload.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiPatch, apiPost } from '../lib/api.ts';
import { VOLUME_STEP, stepPlayerVolume, toVolumePercent } from '../lib/playerVolume.ts';
import { resolveSiaranTvPlayable, type SiaranTvPlayable } from '../lib/siaranTv.ts';
import '../components/ui/ui.css';

interface KaraokeLagu {
  readonly id: string;
  readonly judul: string;
  readonly penyanyi: string | null;
  readonly url: string | null;
  readonly hasFile: boolean;
}

/** Lagu dari file (tombol USB) diputar lewat endpoint file di server, bukan
 * dari field url — supaya tersimpan permanen dan tidak hilang saat reload. */
function getPlayableForLagu(lagu: KaraokeLagu): SiaranTvPlayable {
  if (lagu.hasFile) {
    return { kind: 'video', src: `/api/karaoke-lagu/${lagu.id}/file` };
  }
  return resolveSiaranTvPlayable(lagu.url ?? '');
}

interface AntrianItem {
  readonly id: string;
  readonly namaPenyanyi: string;
  readonly lagu: KaraokeLagu;
}

function newAntrianId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function KaraokePage() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload: reloadList } =
    usePaginatedList<KaraokeLagu>('/api/karaoke-lagu', queryParams);
  const reload = useMutationReload(reloadList);

  const [nowPlaying, setNowPlaying] = useState<AntrianItem | null>(null);
  const [antrian, setAntrian] = useState<readonly AntrianItem[]>([]);
  const [replayKey, setReplayKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setIsPaused(false);
  }, [nowPlaying?.id, replayKey]);

  const [usbModalOpen, setUsbModalOpen] = useState(false);
  const [usbFile, setUsbFile] = useState<File | null>(null);
  const [usbJudul, setUsbJudul] = useState('');
  const [usbPenyanyi, setUsbPenyanyi] = useState('');
  const [usbError, setUsbError] = useState<string | null>(null);
  const [uploadingUsb, setUploadingUsb] = useState(false);

  const [queueTarget, setQueueTarget] = useState<KaraokeLagu | null>(null);
  const [namaPenyanyiDraft, setNamaPenyanyiDraft] = useState('');

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [judul, setJudul] = useState('');
  const [penyanyi, setPenyanyi] = useState('');
  const [url, setUrl] = useState('');

  function resetForm() {
    setJudul('');
    setPenyanyi('');
    setUrl('');
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setModalMode('add');
  }

  function openEdit(item: KaraokeLagu) {
    setEditingId(item.id);
    setJudul(item.judul);
    setPenyanyi(item.penyanyi ?? '');
    setUrl(item.url ?? '');
    setModalMode('edit');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = { judul, penyanyi, url };
    try {
      if (modalMode === 'add') {
        await apiPost('/api/karaoke-lagu', body);
      } else if (editingId) {
        await apiPatch(`/api/karaoke-lagu/${editingId}`, body);
      }
      setModalMode(null);
      resetForm();
      await reload({ resetPage: modalMode === 'add' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await apiDelete(`/api/karaoke-lagu/${deleteTarget.id}`);
      setAntrian((prev) => prev.filter((a) => a.lagu.id !== deleteTarget.id));
      if (nowPlaying?.lagu.id === deleteTarget.id) setNowPlaying(null);
      setDeleteTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setDeleteLoading(false);
    }
  }

  function openQueueForm(lagu: KaraokeLagu) {
    setQueueTarget(lagu);
    setNamaPenyanyiDraft('');
  }

  function confirmAddToQueue(e: FormEvent) {
    e.preventDefault();
    if (!queueTarget) return;
    const entry: AntrianItem = {
      id: newAntrianId(),
      namaPenyanyi: namaPenyanyiDraft.trim() || 'Tanpa nama',
      lagu: queueTarget,
    };
    setAntrian((prev) => [...prev, entry]);
    setQueueTarget(null);
    if (!nowPlaying) {
      setNowPlaying(entry);
    }
  }

  function playNow(lagu: KaraokeLagu) {
    setAntrian((prev) => prev.filter((a) => a.lagu.id !== lagu.id));
    setNowPlaying({ id: newAntrianId(), namaPenyanyi: 'Anda', lagu });
  }

  function playFromQueue(entry: AntrianItem) {
    setAntrian((prev) => prev.filter((a) => a.id !== entry.id));
    setNowPlaying(entry);
  }

  function nextInQueue() {
    const [next, ...rest] = antrian;
    setAntrian(rest);
    setNowPlaying(next ?? null);
  }

  function removeFromQueue(id: string) {
    setAntrian((prev) => prev.filter((a) => a.id !== id));
  }

  function openUsbModal() {
    setUsbFile(null);
    setUsbJudul('');
    setUsbPenyanyi('');
    setUsbError(null);
    setUsbModalOpen(true);
  }

  function handleUsbFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUsbFile(file);
    if (!usbJudul.trim()) {
      setUsbJudul(file.name.replace(/\.[^/.]+$/, ''));
    }
  }

  function submitUsbForm(e: FormEvent) {
    e.preventDefault();
    if (!usbFile || !usbJudul.trim()) return;
    setUsbError(null);
    setUploadingUsb(true);
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          if (typeof reader.result !== 'string') throw new Error('Gagal membaca file');
          await apiPost('/api/karaoke-lagu', {
            judul: usbJudul.trim(),
            penyanyi: usbPenyanyi.trim() || undefined,
            fileData: reader.result,
          });
          setUsbModalOpen(false);
          await reload({ resetPage: true });
        } catch (err: unknown) {
          setUsbError(err instanceof Error ? err.message : 'Gagal mengunggah lagu');
        } finally {
          setUploadingUsb(false);
        }
      })();
    };
    reader.onerror = () => {
      setUsbError('Gagal membaca file');
      setUploadingUsb(false);
    };
    reader.readAsDataURL(usbFile);
  }

  function shuffleQueue() {
    setAntrian((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }
      return shuffled;
    });
  }

  const playable = nowPlaying ? getPlayableForLagu(nowPlaying.lagu) : null;

  function togglePause() {
    if (!playable) return;
    if (playable.kind === 'video') {
      if (isPaused) {
        videoRef.current?.play();
      } else {
        videoRef.current?.pause();
      }
      return;
    }
    // Kontrol YouTube lewat postMessage bawaan (butuh enablejsapi=1 di src iframe).
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: isPaused ? 'playVideo' : 'pauseVideo', args: [] }),
      '*',
    );
    setIsPaused((p) => !p);
  }

  function postVolumeToYouTube(value: number) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'setVolume', args: [toVolumePercent(value)] }),
      '*',
    );
  }

  const playableKind = playable?.kind;
  const playableSrc = playable?.src;

  // Volume dipasang lewat efek, bukan atribut: elemen <video> dibuat ulang tiap
  // ganti lagu/ulangi (key berubah) sehingga nilainya harus dipasang lagi.
  useEffect(() => {
    if (playableKind === 'video') {
      if (videoRef.current) videoRef.current.volume = volume;
      return;
    }
    if (playableKind === 'youtube') postVolumeToYouTube(volume);
  }, [volume, playableKind, playableSrc, replayKey]);

  function changeVolume(delta: number) {
    setVolume((prev) => stepPlayerVolume(prev, delta));
  }

  const form = (
    <form onSubmit={(e) => void onSubmit(e)} className="form-grid">
      <div className="form-field form-grid--full">
        <label htmlFor="ka-judul">Judul Lagu *</label>
        <input id="ka-judul" required value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Contoh: Bengawan Solo" />
      </div>
      <div className="form-field form-grid--full">
        <label htmlFor="ka-penyanyi">Penyanyi Asli</label>
        <input id="ka-penyanyi" value={penyanyi} onChange={(e) => setPenyanyi(e.target.value)} placeholder="Opsional" />
      </div>
      <div className="form-field form-grid--full">
        <label htmlFor="ka-url">Link Video Karaoke{modalMode === 'add' ? ' *' : ''}</label>
        <input
          id="ka-url"
          type="url"
          required={modalMode === 'add'}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Link YouTube karaoke, atau alamat embed/stream (.m3u8, dsb.)"
        />
        <p className="form-hint">
          Pakai video karaoke yang sudah ada lirik berjalannya (mis. link YouTube karaoke).
          {modalMode === 'edit' && ' Kosongkan jika lagu ini berasal dari file USB.'}
        </p>
      </div>
      <ModalFormFooter onCancel={() => setModalMode(null)} submitLabel="Simpan" loading={saving} />
    </form>
  );

  return (
    <>
      <div
        style={{
          background: '#0f172a',
          borderRadius: '10px',
          padding: nowPlaying ? '0' : '2rem',
          marginBottom: '1.25rem',
          overflow: 'hidden',
          color: '#fff',
        }}
      >
        {nowPlaying && playable ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                flexWrap: 'wrap',
                padding: '0.75rem 1rem',
                background: '#1e293b',
              }}
            >
              <div style={{ fontWeight: 700 }}>
                🎤 {nowPlaying.namaPenyanyi} — {nowPlaying.lagu.judul}
                {nowPlaying.lagu.penyanyi && (
                  <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#94a3b8' }}>
                    {' '}
                    ({nowPlaying.lagu.penyanyi})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {playable.kind !== 'iframe' && (
                  <>
                    <button type="button" className="btn btn--sm btn--secondary" onClick={togglePause}>
                      {isPaused ? '▶️ Lanjutkan' : '⏸️ Jeda'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--secondary"
                      onClick={() => changeVolume(-VOLUME_STEP)}
                      disabled={volume === 0}
                      title="Volume turun"
                    >
                      🔉 −
                    </button>
                    <span
                      style={{ alignSelf: 'center', minWidth: '3rem', textAlign: 'center', fontSize: '0.8rem' }}
                      aria-live="polite"
                    >
                      {toVolumePercent(volume)}%
                    </span>
                    <button
                      type="button"
                      className="btn btn--sm btn--secondary"
                      onClick={() => changeVolume(VOLUME_STEP)}
                      disabled={volume === 1}
                      title="Volume naik"
                    >
                      🔊 +
                    </button>
                  </>
                )}
                <button type="button" className="btn btn--sm btn--secondary" onClick={() => setReplayKey((k) => k + 1)}>
                  🔁 Ulangi
                </button>
                <button type="button" className="btn btn--sm btn--secondary" onClick={nextInQueue}>
                  ⏭️ Lagu Berikutnya
                </button>
                <button type="button" className="btn btn--sm btn--danger" onClick={() => setNowPlaying(null)}>
                  ⏹️ Berhenti
                </button>
              </div>
            </div>
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
              {playable.kind === 'video' ? (
                <video
                  key={`${playable.src}-${replayKey}`}
                  ref={videoRef}
                  src={playable.src}
                  controls
                  autoPlay
                  onPlay={() => setIsPaused(false)}
                  onPause={() => setIsPaused(true)}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                />
              ) : (
                <iframe
                  key={`${playable.src}-${replayKey}`}
                  ref={iframeRef}
                  src={playable.src}
                  onLoad={() => postVolumeToYouTube(volume)}
                  title={nowPlaying.lagu.judul}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                />
              )}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, textAlign: 'center', color: '#cbd5e1' }}>
            🎤 Pilih lagu di daftar bawah untuk mulai bernyanyi — layar ini jadi TV karaoke-nya.
          </p>
        )}
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontWeight: 700, color: '#0f172a' }}>
            Antrian Bernyanyi {antrian.length > 0 && `(${antrian.length})`}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="button" className="btn btn--sm btn--secondary" disabled={antrian.length < 2} onClick={shuffleQueue}>
              🔀 Acak Antrian
            </button>
            <button type="button" className="btn btn--sm btn--ghost" disabled={antrian.length === 0} onClick={() => setAntrian([])}>
              🧹 Kosongkan
            </button>
          </div>
        </div>
        {antrian.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Antrian kosong. Klik "➕ Antrian" pada daftar lagu untuk menambahkan penyanyi berikutnya.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>No</th>
                <th>Penyanyi</th>
                <th>Judul Lagu</th>
                <th style={{ width: '160px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {antrian.map((entry, idx) => (
                <tr key={entry.id}>
                  <td>{idx + 1}</td>
                  <td>{entry.namaPenyanyi}</td>
                  <td>{entry.lagu.judul}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button type="button" className="btn btn--sm btn--secondary" onClick={() => playFromQueue(entry)}>
                        ▶️ Putar
                      </button>
                      <button type="button" className="btn btn--sm btn--danger" onClick={() => removeFromQueue(entry.id)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ListPageShell
        title="Daftar Lagu Karaoke"
        subtitle="Kelola koleksi lagu karaoke dan tambahkan ke antrian bernyanyi"
        action={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn--secondary" onClick={openUsbModal}>
              💾 USB
            </button>
            <button type="button" className="btn btn--primary" onClick={openAdd}>
              + Tambah Lagu
            </button>
          </div>
        }
        metrics={[
          {
            label: 'Total lagu',
            value: String(pagination.total),
            tone: 'blue',
            iconKind: 'clipboard',
          },
        ]}
        searchPlaceholder="Cari judul lagu, penyanyi…"
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => void reload()}
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Judul Lagu</th>
              <th>Penyanyi Asli</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3}>Belum ada lagu karaoke. Klik "+ Tambah Lagu" untuk menambahkan.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.judul}
                    {item.hasFile && (
                      <span title="Lagu dari file/USB" style={{ marginLeft: '0.35rem' }}>
                        💾
                      </span>
                    )}
                  </td>
                  <td>{item.penyanyi ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button type="button" className="btn btn--sm btn--primary" onClick={() => playNow(item)}>
                        ▶️ Nyanyikan
                      </button>
                      <button type="button" className="btn btn--sm btn--secondary" onClick={() => openQueueForm(item)}>
                        ➕ Antrian
                      </button>
                      <TableRowActions
                        onEdit={() => openEdit(item)}
                        onDelete={() => setDeleteTarget({ id: item.id, label: item.judul })}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListPageShell>

      <Modal open={modalMode === 'add'} title="Tambah Lagu Karaoke" onClose={() => setModalMode(null)}>
        {form}
      </Modal>
      <Modal open={modalMode === 'edit'} title="Ubah Lagu Karaoke" onClose={() => setModalMode(null)}>
        {form}
      </Modal>

      <Modal open={usbModalOpen} title="Tambah Lagu dari USB" onClose={() => setUsbModalOpen(false)}>
        <form onSubmit={submitUsbForm} className="form-grid">
          {usbError && <div className="alert alert--error form-grid--full">{usbError}</div>}
          <div className="form-field form-grid--full">
            <label htmlFor="usb-file">File Video/Audio Karaoke *</label>
            <input id="usb-file" type="file" accept="video/*,audio/*" required onChange={handleUsbFileChange} />
          </div>
          <div className="form-field form-grid--full">
            <label htmlFor="usb-judul">Judul Lagu *</label>
            <input
              id="usb-judul"
              required
              value={usbJudul}
              onChange={(e) => setUsbJudul(e.target.value)}
              placeholder="Judul lagu…"
            />
          </div>
          <div className="form-field form-grid--full">
            <label htmlFor="usb-penyanyi">Penyanyi Asli</label>
            <input
              id="usb-penyanyi"
              value={usbPenyanyi}
              onChange={(e) => setUsbPenyanyi(e.target.value)}
              placeholder="Opsional"
            />
          </div>
          <p className="form-hint form-grid--full">
            Pilih file video/audio karaoke dari komputer atau flashdisk (USB) yang tersambung. Lagu ini
            tersimpan di server seperti lagu lainnya, jadi tidak akan hilang setelah dimuat ulang.
          </p>
          <ModalFormFooter
            onCancel={() => setUsbModalOpen(false)}
            submitLabel={uploadingUsb ? 'Mengunggah…' : 'Tambah'}
            loading={uploadingUsb}
          />
        </form>
      </Modal>

      <Modal open={queueTarget !== null} title={`Tambah ke Antrian — ${queueTarget?.judul ?? ''}`} onClose={() => setQueueTarget(null)}>
        <form onSubmit={confirmAddToQueue} className="form-grid">
          <div className="form-field form-grid--full">
            <label htmlFor="ka-nama-penyanyi">Nama Penyanyi</label>
            <input
              id="ka-nama-penyanyi"
              value={namaPenyanyiDraft}
              onChange={(e) => setNamaPenyanyiDraft(e.target.value)}
              placeholder="Opsional — mis. nama giliran bernyanyi"
              autoFocus
            />
          </div>
          <ModalFormFooter onCancel={() => setQueueTarget(null)} submitLabel="Tambah ke Antrian" />
        </form>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus lagu karaoke"
        message={`Yakin hapus "${deleteTarget?.label ?? ''}"?`}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
