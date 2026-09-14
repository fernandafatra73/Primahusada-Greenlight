import { useCallback, useEffect, useRef, useState } from 'react';
import { apiPost } from '../lib/api.ts';
import { formatAnalisaGrafik, type AnalisaGrafikResult } from '../lib/analisaGrafik.ts';
import { FOTO_ALLOWED_TYPES, readFileAsDataUrl } from '../lib/fotoUpload.ts';
import '../components/ui/ui.css';

const INTERVAL_OPTIONS: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
  { id: '5', label: '5 Menit' },
  { id: '15', label: '15 Menit' },
  { id: '30', label: '30 Menit' },
  { id: '60', label: '1 Jam' },
  { id: '240', label: '4 Jam' },
  { id: 'D', label: 'Harian' },
  { id: 'W', label: 'Mingguan' },
];

/** Screenshot bisa berukuran besar; diperkecil agar request ke AI tetap ringan. */
const MAX_GAMBAR_WIDTH = 1920;

interface GrafikItem {
  readonly id: string;
  readonly nama: string;
  readonly gambarDataUrl: string;
  readonly keterangan: string;
  readonly analisa: string;
}

interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function chartSrc(symbol: string, interval: string): string {
  const config = {
    autosize: true,
    symbol,
    interval,
    timezone: 'Asia/Jakarta',
    theme: 'light',
    style: '1',
    locale: 'id',
    toolbar_bg: '#f8fafc',
    withdateranges: true,
    hide_side_toolbar: false,
  };
  return `https://s.tradingview.com/embed-widget/advanced-chart/?locale=id#${encodeURIComponent(JSON.stringify(config))}`;
}

function drawToJpegDataUrl(source: CanvasImageSource, crop: CropRect): string {
  const scale = crop.width > MAX_GAMBAR_WIDTH ? MAX_GAMBAR_WIDTH / crop.width : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(crop.width * scale);
  canvas.height = Math.round(crop.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung canvas');
  ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

async function normalizeImageDataUrl(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  return drawToJpegDataUrl(img, { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
}

/** Grafik TradingView ada di iframe lintas-domain sehingga tidak bisa dibaca
 * langsung; jalan satu-satunya adalah capture tab lewat getDisplayMedia lalu
 * memotong frame sesuai posisi iframe. Jika pengguna memilih layar/jendela lain
 * (rasio frame tidak cocok dengan viewport), frame dipakai utuh tanpa dipotong. */
async function captureElement(element: HTMLElement | null): Promise<string> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Browser ini tidak mendukung capture layar. Gunakan unggah gambar atau tempel (Ctrl+V).');
  }
  const options: DisplayMediaStreamOptions & { preferCurrentTab?: boolean } = {
    video: true,
    audio: false,
    preferCurrentTab: true,
  };
  const stream = await navigator.mediaDevices.getDisplayMedia(options);
  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    // Beri jeda singkat supaya frame pertama bukan frame hitam.
    await new Promise((resolve) => setTimeout(resolve, 400));

    const full: CropRect = { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight };
    const viewportRatio = window.innerWidth / window.innerHeight;
    const frameRatio = video.videoWidth / video.videoHeight;
    if (!element || Math.abs(frameRatio - viewportRatio) / viewportRatio > 0.03) {
      return drawToJpegDataUrl(video, full);
    }
    const rect = element.getBoundingClientRect();
    const scale = video.videoWidth / window.innerWidth;
    const x = Math.max(0, rect.left * scale);
    const y = Math.max(0, rect.top * scale);
    const crop: CropRect = {
      x,
      y,
      width: Math.min(rect.width * scale, video.videoWidth - x),
      height: Math.min(rect.height * scale, video.videoHeight - y),
    };
    return drawToJpegDataUrl(video, crop.width > 0 && crop.height > 0 ? crop : full);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Analisa grafik trading: grafik TradingView tampil di kiri, hasil analisa AI
 * di kanan. Grafik hasil capture hanya disimpan sementara di halaman ini —
 * hilang saat halaman dimuat ulang. */
export function AnalisaGrafikPage() {
  const [symbolInput, setSymbolInput] = useState('OANDA:XAUUSD');
  const [symbol, setSymbol] = useState('OANDA:XAUUSD');
  const [interval, setInterval_] = useState('60');
  const [items, setItems] = useState<GrafikItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chartBoxRef = useRef<HTMLDivElement>(null);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const intervalLabel = INTERVAL_OPTIONS.find((o) => o.id === interval)?.label ?? interval;

  const addGambar = useCallback((gambarDataUrl: string, nama: string, keterangan = '') => {
    const item: GrafikItem = { id: newId(), nama, gambarDataUrl, keterangan, analisa: '' };
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
    setError(null);
  }, []);

  function updateItem(id: string, patch: Partial<Omit<GrafikItem, 'id'>>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    if (selectedId === id) setSelectedId(next[next.length - 1]?.id ?? null);
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!FOTO_ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}" bukan gambar JPEG/PNG/GIF/WEBP.`);
        continue;
      }
      try {
        addGambar(await normalizeImageDataUrl(await readFileAsDataUrl(file)), file.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal membaca gambar');
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleCapture() {
    setError(null);
    setCapturing(true);
    try {
      const dataUrl = await captureElement(chartBoxRef.current);
      const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      addGambar(dataUrl, `${symbol.split(':').pop() ?? symbol} ${intervalLabel} · ${waktu}`, `${symbol} timeframe ${intervalLabel}`);
    } catch (err) {
      // Pengguna membatalkan dialog pilih tab — bukan error.
      if (err instanceof DOMException && err.name === 'NotAllowedError') return;
      setError(err instanceof Error ? err.message : 'Gagal capture grafik');
    } finally {
      setCapturing(false);
    }
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = Array.from(e.clipboardData?.items ?? [])
        .find((clip) => clip.kind === 'file' && clip.type.startsWith('image/'))
        ?.getAsFile();
      if (!file) return;
      e.preventDefault();
      void readFileAsDataUrl(file)
        .then(normalizeImageDataUrl)
        .then((dataUrl) => addGambar(dataUrl, `Tempel ${new Date().toLocaleTimeString('id-ID')}`))
        .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Gagal menempel gambar'));
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addGambar]);

  async function handleAnalyze(item: GrafikItem) {
    setAnalyzingId(item.id);
    setError(null);
    try {
      const res = await apiPost<AnalisaGrafikResult>('/api/analisa-grafik/analyze', {
        gambarDataUrl: item.gambarDataUrl,
        keterangan: item.keterangan || undefined,
      });
      updateItem(item.id, { analisa: formatAnalisaGrafik(res) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menganalisa grafik dengan AI');
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setInfo('Analisa disalin ke clipboard.');
      setTimeout(() => setInfo(null), 2000);
    } catch {
      setError('Gagal menyalin ke clipboard.');
    }
  }

  const outlineBtn: React.CSSProperties = { border: '1px solid var(--color-border)' };

  return (
    <div className="page-frame page-frame--pink">
      <h2 style={{ margin: '0 0 0.35rem' }}>Analisa Grafik</h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--color-text-muted)' }}>
        Atur grafik TradingView di kiri, klik <strong>Capture Grafik</strong>, lalu klik <strong>Analisa</strong> —
        hasilnya masuk ke kolom Analisa di kanan. Hasil AI hanya estimasi, bukan nasihat keuangan.
      </p>

      {error && <p className="alert alert--error">{error}</p>}
      {info && <p className="alert">{info}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '1rem', alignItems: 'start' }}>
        {/* Kiri: grafik TradingView */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 0 }}>
          <form
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}
            onSubmit={(e) => {
              e.preventDefault();
              if (symbolInput.trim()) setSymbol(symbolInput.trim().toUpperCase());
            }}
          >
            <input
              aria-label="Simbol"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              placeholder="mis. OANDA:XAUUSD, BINANCE:BTCUSDT"
              style={{ flex: '1 1 180px', minWidth: 0 }}
            />
            <button type="submit" className="btn btn--ghost" style={outlineBtn}>
              Tampilkan
            </button>
            <select aria-label="Timeframe" value={interval} onChange={(e) => setInterval_(e.target.value)}>
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </form>

          <div
            ref={chartBoxRef}
            style={{
              height: '65vh',
              minHeight: 380,
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <iframe
              key={`${symbol}-${interval}`}
              title={`Grafik TradingView ${symbol}`}
              src={chartSrc(symbol, interval)}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" className="btn btn--primary" disabled={capturing} onClick={() => void handleCapture()}>
              {capturing ? '⏳ Capture...' : '📸 Capture Grafik'}
            </button>
            <button type="button" className="btn btn--ghost" style={outlineBtn} onClick={() => fileInputRef.current?.click()}>
              📁 Unggah Gambar
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </div>
          <small style={{ color: 'var(--color-text-muted)' }}>
            Saat Capture, pilih tab ini di dialog browser — gambar otomatis dipotong ke area grafik. Bisa juga tempel
            screenshot dengan Ctrl+V.
          </small>
        </div>

        {/* Kanan: grafik pilihan + hasil analisa */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 0 }}>
          <strong>Grafik Pilihan ({items.length})</strong>
          {items.length === 0 ? (
            <div
              style={{
                padding: '1.25rem 1rem',
                textAlign: 'center',
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-card)',
                color: 'var(--color-text-muted)',
              }}
            >
              Belum ada grafik. Klik <strong>Capture Grafik</strong> di sebelah kiri.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.3rem' }}>
              {items.map((item) => (
                <div key={item.id} style={{ position: 'relative', flex: '0 0 auto' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    title={item.nama}
                    style={{
                      display: 'block',
                      padding: 0,
                      width: 130,
                      border: item.id === selectedId ? '3px solid var(--color-primary)' : '1px solid var(--color-border)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: 'var(--color-bg-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <img src={item.gambarDataUrl} alt={item.nama} style={{ display: 'block', width: '100%', height: 76, objectFit: 'cover' }} />
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.3rem',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.analisa ? '✅ ' : ''}
                      {item.nama}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus ${item.nama}`}
                    onClick={() => removeItem(item.id)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <>
              <img
                src={selected.gambarDataUrl}
                alt={selected.nama}
                style={{ width: '100%', maxHeight: 220, objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: '6px', background: '#fff' }}
              />
              <div className="form-field">
                <label htmlFor="ag-keterangan">Keterangan (opsional)</label>
                <input
                  id="ag-keterangan"
                  placeholder="mis. XAUUSD timeframe 1 Jam, cari entry buy"
                  value={selected.keterangan}
                  onChange={(e) => updateItem(selected.id, { keterangan: e.target.value })}
                />
              </div>
              <button
                type="button"
                className="aifoto-analyze-btn"
                disabled={analyzingId !== null}
                onClick={() => void handleAnalyze(selected)}
              >
                {analyzingId === selected.id ? '⏳ Menganalisa grafik...' : '✨ Analisa Grafik dengan AI'}
              </button>
            </>
          )}

          <div className="form-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="ag-analisa" style={{ margin: 0 }}>
                Analisa
              </label>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                style={outlineBtn}
                disabled={!selected?.analisa}
                onClick={() => selected && void handleCopy(selected.analisa)}
              >
                📋 Salin
              </button>
            </div>
            <textarea
              id="ag-analisa"
              rows={14}
              disabled={!selected}
              placeholder={
                selected
                  ? 'Hasil analisa akan muncul di sini — bisa juga diketik/diedit manual.'
                  : 'Capture atau pilih grafik dulu.'
              }
              value={selected?.analisa ?? ''}
              onChange={(e) => selected && updateItem(selected.id, { analisa: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
