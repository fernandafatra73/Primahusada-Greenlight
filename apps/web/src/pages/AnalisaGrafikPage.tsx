import { useCallback, useEffect, useRef, useState } from 'react';
import { apiPost } from '../lib/api.ts';
import {
  formatAnalisaGrafik,
  sinyalPembalikan,
  sinyalTerbaru,
  urutkanPembalikanTerbaru,
  type AnalisaGrafikResult,
  type PembalikanArah,
} from '../lib/analisaGrafik.ts';
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

const OTOMATIS_INTERVAL_MS = 5 * 60 * 1000;

interface CapturedGrafik {
  readonly id: string;
  readonly gambarDataUrl: string;
  readonly keterangan: string;
}

interface GrafikItem {
  readonly id: string;
  readonly nama: string;
  readonly gambarDataUrl: string;
  readonly keterangan: string;
  readonly analisa: string;
  readonly pembalikan: ReadonlyArray<PembalikanArah>;
}

/** Panah penanda candle pembalikan arah di atas gambar grafik: hijau dari
 * bawah low candle (akan NAIK), merah dari atas high candle (akan TURUN). */
function ReversalMarker({ pembalikan }: { readonly pembalikan: PembalikanArah }) {
  const naik = pembalikan.arahSetelah === 'NAIK';
  const color = naik ? '#16a34a' : '#dc2626';
  return (
    <div
      title={pembalikan.alasan || `Pembalikan arah ${pembalikan.arahSetelah}`}
      style={{
        position: 'absolute',
        left: `${pembalikan.posisiX / 10}%`,
        top: `${pembalikan.posisiY / 10}%`,
        transform: naik ? 'translate(-50%, 4px)' : 'translate(-50%, calc(-100% - 4px))',
        display: 'flex',
        flexDirection: naik ? 'column' : 'column-reverse',
        alignItems: 'center',
        pointerEvents: 'auto',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))',
      }}
    >
      <svg width="28" height="40" viewBox="0 0 28 40" aria-hidden="true" style={{ transform: naik ? undefined : 'rotate(180deg)' }}>
        <path d="M14 0 L28 16 L19 16 L19 40 L9 40 L9 16 L0 16 Z" fill={color} stroke="#fff" strokeWidth="1.5" />
      </svg>
      <span
        style={{
          marginTop: naik ? 2 : 0,
          marginBottom: naik ? 0 : 2,
          padding: '1px 6px',
          borderRadius: 4,
          background: color,
          color: '#fff',
          fontSize: '0.7rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {naik ? '↑' : '↓'} {sinyalPembalikan(pembalikan.arahSetelah)}
      </span>
    </div>
  );
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
 * langsung; jalan satu-satunya adalah capture tab lewat getDisplayMedia. Browser
 * selalu meminta izin untuk itu, jadi stream dibuka sekali lalu dipakai ulang —
 * capture berikutnya langsung jadi tanpa dialog selama tab masih dibagikan. */
async function openCaptureVideo(onEnded: () => void): Promise<HTMLVideoElement> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Browser ini tidak mendukung capture layar. Gunakan unggah gambar atau tempel (Ctrl+V).');
  }
  const options: DisplayMediaStreamOptions & { preferCurrentTab?: boolean } = {
    video: true,
    audio: false,
    preferCurrentTab: true,
  };
  const stream = await navigator.mediaDevices.getDisplayMedia(options);
  stream.getVideoTracks().forEach((track) => track.addEventListener('ended', onEnded));
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  await video.play();
  // Beri jeda singkat supaya frame pertama bukan frame hitam.
  await new Promise((resolve) => setTimeout(resolve, 400));
  return video;
}

function stopCaptureVideo(video: HTMLVideoElement | null): void {
  const stream = video?.srcObject;
  if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
}

function isCaptureLive(video: HTMLVideoElement | null): video is HTMLVideoElement {
  const stream = video?.srcObject;
  return stream instanceof MediaStream && stream.getVideoTracks().some((track) => track.readyState === 'live');
}

/** Memotong frame sesuai posisi elemen. Jika pengguna membagikan layar/jendela
 * lain (rasio frame tidak cocok dengan viewport), frame dipakai utuh. */
function captureElementFrame(video: HTMLVideoElement, element: HTMLElement | null): string {
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
  // Siklus otomatis berjalan lintas render; ref ini selalu berisi daftar grafik terbaru.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chartBoxRef = useRef<HTMLDivElement>(null);
  const captureVideoRef = useRef<HTMLVideoElement | null>(null);
  const [captureAktif, setCaptureAktif] = useState(false);

  // Tutup stream capture saat keluar halaman supaya tab tidak terus dibagikan.
  useEffect(() => () => stopCaptureVideo(captureVideoRef.current), []);

  function handleStopCapture() {
    stopCaptureVideo(captureVideoRef.current);
    captureVideoRef.current = null;
    setCaptureAktif(false);
    // Tanpa stream capture, mode otomatis tidak bisa jalan.
    setOtomatis(false);
    setNextRunAt(null);
  }

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const intervalLabel = INTERVAL_OPTIONS.find((o) => o.id === interval)?.label ?? interval;

  const addGambar = useCallback((gambarDataUrl: string, nama: string, keterangan = ''): string => {
    const item: GrafikItem = { id: newId(), nama, gambarDataUrl, keterangan, analisa: '', pembalikan: [] };
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
    setError(null);
    return item.id;
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

  /** Membuka stream capture bila belum ada — hanya boleh dipanggil dari klik pengguna saat stream belum aktif. */
  async function ensureCaptureVideo(): Promise<HTMLVideoElement> {
    const current = captureVideoRef.current;
    if (isCaptureLive(current)) return current;
    const video = await openCaptureVideo(() => {
      captureVideoRef.current = null;
      setCaptureAktif(false);
    });
    captureVideoRef.current = video;
    setCaptureAktif(true);
    return video;
  }

  /** Tanpa replaceId: grafik baru ditambahkan ke Grafik Pilihan. Dengan
   * replaceId: gambar grafik itu diganti hasil capture terbaru. Mengembalikan
   * grafik hasil capture, atau null bila gagal/dibatalkan. */
  async function handleCapture(replaceId?: string, label = intervalLabel): Promise<CapturedGrafik | null> {
    setError(null);
    setCapturing(true);
    try {
      const video = await ensureCaptureVideo();
      const dataUrl = captureElementFrame(video, chartBoxRef.current);
      const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const nama = `${symbol.split(':').pop() ?? symbol} ${label} · ${waktu}`;
      const keterangan = `${symbol} timeframe ${label}`;
      if (replaceId && itemsRef.current.some((item) => item.id === replaceId)) {
        updateItem(replaceId, { gambarDataUrl: dataUrl, nama, keterangan, analisa: '', pembalikan: [] });
        setSelectedId(replaceId);
        return { id: replaceId, gambarDataUrl: dataUrl, keterangan };
      }
      return { id: addGambar(dataUrl, nama, keterangan), gambarDataUrl: dataUrl, keterangan };
    } catch (err) {
      // Pengguna membatalkan dialog pilih tab — bukan error.
      if (!(err instanceof DOMException && err.name === 'NotAllowedError')) {
        setError(err instanceof Error ? err.message : 'Gagal capture grafik');
      }
      return null;
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

  /** withSinyalHeader: mode otomatis menaruh ringkasan sinyal & jam update di baris paling atas. */
  async function handleAnalyze(item: CapturedGrafik, withSinyalHeader = false) {
    setAnalyzingId(item.id);
    setError(null);
    try {
      const res = await apiPost<AnalisaGrafikResult>('/api/analisa-grafik/analyze', {
        gambarDataUrl: item.gambarDataUrl,
        keterangan: item.keterangan || undefined,
      });
      const teks = formatAnalisaGrafik(res);
      const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const header = `🔁 OTOMATIS 5 MENIT · update ${waktu} — SINYAL: ${sinyalTerbaru(res.pembalikanArah)}`;
      updateItem(item.id, {
        analisa: withSinyalHeader ? `${header}\n\n${teks}` : teks,
        pembalikan: res.pembalikanArah,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menganalisa grafik dengan AI');
    } finally {
      setAnalyzingId(null);
    }
  }

  // Mode otomatis: tiap 5 menit capture grafik (timeframe 5 menit) lalu analisa,
  // selalu memperbarui grafik & teks analisa yang sama.
  const [otomatis, setOtomatis] = useState(false);
  const [nextRunAt, setNextRunAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const otomatisItemIdRef = useRef<string | null>(null);
  const siklusBerjalanRef = useRef(false);

  async function jalankanSiklusOtomatis() {
    if (siklusBerjalanRef.current) return;
    if (!isCaptureLive(captureVideoRef.current)) {
      // Stream berhenti (mis. "Stop sharing"); membuka ulang butuh klik pengguna.
      setOtomatis(false);
      setNextRunAt(null);
      setError('Mode otomatis berhenti karena capture tab dihentikan. Klik Otomatis 5 Menit lagi untuk melanjutkan.');
      return;
    }
    siklusBerjalanRef.current = true;
    try {
      const captured = await handleCapture(otomatisItemIdRef.current ?? undefined, '5 Menit');
      if (captured) {
        otomatisItemIdRef.current = captured.id;
        await handleAnalyze(captured, true);
      }
    } finally {
      siklusBerjalanRef.current = false;
      setNextRunAt(Date.now() + OTOMATIS_INTERVAL_MS);
    }
  }
  const siklusRef = useRef(jalankanSiklusOtomatis);
  siklusRef.current = jalankanSiklusOtomatis;

  async function mulaiOtomatis() {
    setError(null);
    try {
      // Minta izin capture di dalam klik ini, sebelum ada jeda apa pun.
      await ensureCaptureVideo();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'NotAllowedError')) {
        setError(err instanceof Error ? err.message : 'Gagal memulai capture');
      }
      return;
    }
    const perluGantiTimeframe = interval !== '5';
    setInterval_('5');
    otomatisItemIdRef.current = null;
    setOtomatis(true);
    // Beri waktu grafik TradingView memuat ulang setelah timeframe diganti.
    setNextRunAt(Date.now() + (perluGantiTimeframe ? 6000 : 1500));
  }

  function hentikanOtomatis() {
    setOtomatis(false);
    setNextRunAt(null);
  }

  useEffect(() => {
    if (!otomatis) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [otomatis]);

  useEffect(() => {
    if (!otomatis || nextRunAt === null || now < nextRunAt || siklusBerjalanRef.current) return;
    setNextRunAt(null);
    void siklusRef.current();
  }, [otomatis, nextRunAt, now]);

  const sisaDetik = nextRunAt === null ? null : Math.max(0, Math.ceil((nextRunAt - now) / 1000));

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
            <select
              aria-label="Timeframe"
              value={interval}
              disabled={otomatis}
              title={otomatis ? 'Mode otomatis memakai timeframe 5 menit' : undefined}
              onChange={(e) => setInterval_(e.target.value)}
            >
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
            {otomatis ? (
              <button type="button" className="btn btn--primary" style={{ background: '#dc2626' }} onClick={hentikanOtomatis}>
                ⏸ Stop Otomatis
              </button>
            ) : (
              <button type="button" className="btn btn--ghost" style={outlineBtn} onClick={() => void mulaiOtomatis()}>
                🔁 Otomatis 5 Menit
              </button>
            )}
            {captureAktif && (
              <button type="button" className="btn btn--ghost" style={outlineBtn} onClick={handleStopCapture}>
                ⏹ Hentikan Capture
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </div>
          {otomatis && (
            <div className="alert" role="status" style={{ margin: 0 }}>
              🔁 <strong>Mode otomatis aktif</strong> (timeframe 5 menit) —{' '}
              {sisaDetik === null
                ? 'sedang capture & analisa...'
                : `capture & analisa berikutnya dalam ${Math.floor(sisaDetik / 60)}:${String(sisaDetik % 60).padStart(2, '0')}`}
              . Biarkan tab ini tetap terbuka.
            </div>
          )}
          <small style={{ color: 'var(--color-text-muted)' }}>
            {captureAktif
              ? '🟢 Capture aktif — klik Capture Grafik kapan saja, gambar langsung masuk tanpa dialog.'
              : 'Capture pertama: pilih tab ini di dialog browser (sekali saja). Setelah itu Capture Grafik langsung masuk tanpa dialog. Bisa juga tempel screenshot dengan Ctrl+V.'}
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
              {urutkanPembalikanTerbaru(selected.pembalikan).map((p, i) => (
                <div
                  key={`${p.arahSetelah}-${p.posisiX}-${p.posisiY}`}
                  role="status"
                  style={{
                    padding: i === 0 ? '0.6rem 0.8rem' : '0.4rem 0.8rem',
                    borderRadius: '6px',
                    background: p.arahSetelah === 'NAIK' ? '#16a34a' : '#dc2626',
                    color: '#fff',
                    opacity: i === 0 ? 1 : 0.85,
                  }}
                >
                  <div style={{ fontSize: i === 0 ? '1.15rem' : '0.95rem', fontWeight: 800 }}>
                    {p.arahSetelah === 'NAIK' ? '🟢 ' : '🔴 '}
                    {sinyalPembalikan(p.arahSetelah)}
                    {i === 0 && selected.pembalikan.length > 1 ? ' — TERBARU' : ''}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.95 }}>
                    Pembalikan arah {p.arahSetelah}
                    {p.alasan ? ` — ${p.alasan}` : ''}
                    {i === 0 ? '. Estimasi AI, tetap pakai stop loss.' : ''}
                  </div>
                </div>
              ))}
              {/* Gambar tanpa objectFit supaya koordinat panah (0-1000) pas dengan area gambar. */}
              <div style={{ position: 'relative', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden', background: '#fff' }}>
                <img src={selected.gambarDataUrl} alt={selected.nama} style={{ display: 'block', width: '100%', height: 'auto' }} />
                {selected.pembalikan.map((p) => (
                  <ReversalMarker key={`${p.arahSetelah}-${p.posisiX}-${p.posisiY}`} pembalikan={p} />
                ))}
              </div>
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
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  style={outlineBtn}
                  disabled={!selected?.analisa}
                  onClick={() => selected && void handleCopy(selected.analisa)}
                >
                  📋 Salin
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  style={outlineBtn}
                  disabled={!selected || capturing}
                  title="Kosongkan analisa lalu langsung capture ulang grafik TradingView untuk mengganti gambar grafik ini"
                  onClick={() => {
                    if (!selected) return;
                    updateItem(selected.id, { analisa: '', pembalikan: [] });
                    // Dipanggil langsung di handler klik: getDisplayMedia butuh gestur pengguna.
                    void handleCapture(selected.id);
                  }}
                >
                  🧹 Bersihkan Analisa
                </button>
              </div>
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
