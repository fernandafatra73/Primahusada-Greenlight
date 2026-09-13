import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { withIndonesianVoice } from '../lib/speechVoice.ts';

interface JadwalItem {
  readonly id: string;
  readonly tanggal: string;
  readonly namaEvent: string;
  readonly keterangan: string | null;
}

interface AnalisaItem {
  readonly id: string;
  readonly tanggal: string;
  readonly analisa: string;
  readonly support: string | null;
  readonly resistance: string | null;
}

interface TradingLevelItem {
  readonly id: string;
  readonly resistance: string;
  readonly support: string;
  readonly keterangan: string | null;
  readonly createdAt: string;
}

interface TradingMinPlusItem {
  readonly id: string;
  readonly hargaAcuan: string;
  readonly keterangan: string | null;
  readonly createdAt: string;
}

interface TradingHargaBeliItem {
  readonly id: string;
  readonly hargaBeli: string;
  readonly keterangan: string | null;
  readonly createdAt: string;
}

/** Ekstrak Sinyal/High/Low/Close/Pivot dari teks "[Analisa Otomatis Harian]"
 * yang dibuat job pivot harian — dipakai supaya data ini bisa disimpan
 * sebagai tabel (Export Excel), bukan cuma teks bebas. Entri manual yang
 * tidak cocok formatnya akan menghasilkan kolom kosong. */
function parseAutoAnalisa(text: string): {
  sinyal: string;
  high: string;
  low: string;
  close: string;
  pivot: string;
} {
  const sinyal = /Sinyal:\s*(\w+)/.exec(text)?.[1] ?? '';
  const high = /H=([\d.]+)/.exec(text)?.[1] ?? '';
  const low = /L=([\d.]+)/.exec(text)?.[1] ?? '';
  const close = /C=([\d.]+)/.exec(text)?.[1] ?? '';
  const pivot = /Pivot=([\d.]+)/.exec(text)?.[1] ?? '';
  return { sinyal, high, low, close, pivot };
}

const TIMEFRAMES = [
  { id: '15', label: '15 Menit' },
  { id: '30', label: '30 Menit' },
  { id: '60', label: '1 Jam' },
  { id: 'D', label: '1 Hari' },
  { id: 'W', label: '1 Minggu' },
] as const;

const TEHNIK_TIMELINE = [
  {
    waktu: '06:00–14:00',
    poin: ['Lihat arah besar dari H1/H4', 'Tandai support & resistance'],
  },
  {
    waktu: '14:00–19:00',
    poin: ['Lihat apakah London mengubah struktur', 'Jangan buru-buru mengikuti candle pertama'],
  },
  {
    waktu: '19:00–23:00',
    poin: ['Periode utama', 'Perhatikan reaksi harga terhadap level yang sudah ditandai'],
  },
  {
    waktu: '±15–30 menit sebelum berita besar',
    poin: ['Tandai kalender', 'Waspadai spread/volatilitas'],
  },
  {
    waktu: 'Setelah berita',
    poin: ['Jangan langsung menyimpulkan dari satu candle', 'Tunggu struktur baru terbentuk'],
  },
] as const;

const TEHNIK_RILIS_MINGGUAN = [
  { hari: 'Selasa 21:00', label: 'JOLTS + ISM', penting: false },
  { hari: 'Kamis 21:00', label: 'ISM Services', penting: false },
  { hari: 'Jumat 19:30', label: 'NFP 🚨', penting: true },
] as const;

const BLUE = '#1d4ed8';
const YELLOW = '#eab308';
const GREEN = '#16a34a';

function formatTanggalDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Sama seperti formatTanggalDisplay, tapi termasuk jam — dipakai khusus
 * untuk jurnal Analisa & Level (yang tanggalnya bisa diisi manual sampai ke
 * jam), bukan untuk Jadwal Trading yang cuma tanggal tanpa jam. */
function formatTanggalJamDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const tanggal = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `${tanggal}, ${jam} WIB`;
  } catch {
    return dateStr;
  }
}

/** Format Date lokal jadi string yang dipahami <input type="datetime-local">
 * (YYYY-MM-DDTHH:mm) — pakai komponen tanggal/jam lokal, bukan toISOString
 * yang berbasis UTC dan bisa geser tanggalnya. */
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface PivotResult {
  readonly pivot: number;
  readonly r1: number;
  readonly r2: number;
  readonly r3: number;
  readonly s1: number;
  readonly s2: number;
  readonly s3: number;
  readonly signal: 'BELI' | 'JUAL' | 'NETRAL';
  readonly alasan: string;
}

/** Kalkulator Pivot Point standar (High/Low/Close) — dipakai untuk
 * menghasilkan level support/resistance & sinyal beli/jual sederhana
 * berdasarkan posisi harga saat ini terhadap pivot & level R1/S1.
 * Bukan rekomendasi finansial — hanya bantu baca level teknikal umum. */
function computePivot(high: number, low: number, close: number, current: number): PivotResult {
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  const r3 = high + 2 * (pivot - low);
  const s3 = low - 2 * (high - pivot);

  let signal: PivotResult['signal'] = 'NETRAL';
  let alasan = 'Harga berada di sekitar pivot, belum ada bias arah yang jelas.';
  if (current >= r1) {
    signal = 'JUAL';
    alasan = 'Harga sudah menyentuh/melewati resistance R1 — rawan koreksi turun.';
  } else if (current <= s1) {
    signal = 'BELI';
    alasan = 'Harga sudah menyentuh/melewati support S1 — berpotensi pantul naik.';
  } else if (current > pivot) {
    signal = 'BELI';
    alasan = 'Harga di atas pivot — bias jangka pendek cenderung bullish (naik).';
  } else if (current < pivot) {
    signal = 'JUAL';
    alasan = 'Harga di bawah pivot — bias jangka pendek cenderung bearish (turun).';
  }

  return { pivot, r1, r2, r3, s1, s2, s3, signal, alasan };
}

const LEVEL_ALERT_TEXT =
  'May day, may day. Leo dan Kenzo, sudah menyentuh resisten atau support, dan harus berhati-hati, harus analisa ulang.';

/** Ucapkan peringatan harga menyentuh resisten/support 3 kali berturut-turut
 * (sama seperti pola peringatan stok film di PemakaianFilmPage, tapi
 * diulang via callback onend karena harus dibunyikan 3 kali). */
function speakLevelAlert(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  withIndonesianVoice((voice) => {
    window.speechSynthesis.cancel();
    let sisaPengulangan = 3;
    const ucapkan = () => {
      if (sisaPengulangan <= 0) return;
      sisaPengulangan -= 1;
      const utter = new SpeechSynthesisUtterance(LEVEL_ALERT_TEXT);
      utter.lang = voice?.lang ?? 'id-ID';
      utter.rate = 0.95;
      utter.pitch = 1;
      utter.volume = 1;
      if (voice) utter.voice = voice;
      utter.onend = ucapkan;
      window.speechSynthesis.speak(utter);
    };
    ucapkan();
  });
}

const MINPLUS_ALERT_TEXT = 'Santai, santai. Diteruskan atau dijual, sedang menunggu keputusan yang tepat.';

/** Ucapkan peringatan MinPlus (harga bergerak kelipatan $10 dari acuan). */
function speakMinPlusAlert(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  withIndonesianVoice((voice) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(MINPLUS_ALERT_TEXT);
    utter.lang = voice?.lang ?? 'id-ID';
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.volume = 1;
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  });
}

const HARGA_BELI_ALERT_TEXT = 'Perhatian. Harga sudah menyentuh harga pembelian. Silakan lakukan pembelian sekarang.';

/** Ucapkan peringatan begitu harga live turun menyentuh target harga beli. */
function speakHargaBeliAlert(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  withIndonesianVoice((voice) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(HARGA_BELI_ALERT_TEXT);
    utter.lang = voice?.lang ?? 'id-ID';
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.volume = 1;
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  });
}

function chartSrc(interval: string): string {
  const config = {
    autosize: true,
    symbol: 'OANDA:XAUUSD',
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

/** Kalender ekonomi live (TradingView) — sumber jadwal FOMC/NFP/dll yang
 * update sendiri, dipasangkan dengan simbol XAUUSD supaya jadwal yang
 * relevan untuk emas ikut ditandai penting. */
function economicCalendarSrc(): string {
  const config = {
    colorTheme: 'light',
    isTransparent: false,
    width: '100%',
    height: '460',
    locale: 'id',
    importanceFilter: '-1,0,1',
    currencyFilter: 'USD',
  };
  return `https://s.tradingview.com/embed-widget/events/?locale=id#${encodeURIComponent(JSON.stringify(config))}`;
}

const cardStyle: React.CSSProperties = {
  border: `1px solid ${BLUE}`,
  borderRadius: 'var(--radius-card)',
  background: '#ffffff',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
  marginBottom: '1.25rem',
};

const cardTitlebarStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  background: `linear-gradient(90deg, ${BLUE}, #3b82f6)`,
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.9rem',
};

const cardBodyStyle: React.CSSProperties = { padding: '1rem' };

/** Halaman Trading XAU/USD — grafik live (TradingView), jurnal analisa &
 * level support/resistance sebelum beli, dan kalender event tahunan. */
export function TradingPage() {
  const [interval, setInterval_] = useState<string>('60');

  const [jadwal, setJadwal] = useState<JadwalItem[]>([]);
  const [jadwalTanggal, setJadwalTanggal] = useState(new Date().toISOString().split('T')[0]!);
  const [jadwalNama, setJadwalNama] = useState('');
  const [jadwalKeterangan, setJadwalKeterangan] = useState('');
  const [jadwalSubmitting, setJadwalSubmitting] = useState(false);

  const [analisaList, setAnalisaList] = useState<AnalisaItem[]>([]);
  const [analisaText, setAnalisaText] = useState('');
  const [support, setSupport] = useState('');
  const [resistance, setResistance] = useState('');
  const [analisaTanggalJam, setAnalisaTanggalJam] = useState(() => toDatetimeLocalValue(new Date()));
  const [analisaSubmitting, setAnalisaSubmitting] = useState(false);
  const [exportingAnalisaExcel, setExportingAnalisaExcel] = useState(false);

  function handleExportAnalisaExcel() {
    setExportingAnalisaExcel(true);
    try {
      const rows = analisaList.map((item) => {
        const parsed = parseAutoAnalisa(item.analisa);
        return {
          Tanggal: formatTanggalJamDisplay(item.tanggal),
          Sinyal: parsed.sinyal,
          High: parsed.high,
          Low: parsed.low,
          Close: parsed.close,
          Pivot: parsed.pivot,
          Support: item.support ?? '',
          Resistance: item.resistance ?? '',
          Catatan: item.analisa,
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Analisa XAU');
      XLSX.writeFile(workbook, 'Analisa_Trading_XAU.xlsx');
    } finally {
      setExportingAnalisaExcel(false);
    }
  }

  const [editingAnalisaId, setEditingAnalisaId] = useState<string | null>(null);
  const [editAnalisaText, setEditAnalisaText] = useState('');
  const [editSupport, setEditSupport] = useState('');
  const [editResistance, setEditResistance] = useState('');
  const [editTanggalJam, setEditTanggalJam] = useState('');
  const [editAnalisaSaving, setEditAnalisaSaving] = useState(false);

  const [levelList, setLevelList] = useState<TradingLevelItem[]>([]);
  const [levelResistance, setLevelResistance] = useState('');
  const [levelSupport, setLevelSupport] = useState('');
  const [levelKeterangan, setLevelKeterangan] = useState('');
  const [levelSubmitting, setLevelSubmitting] = useState(false);
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editLevelResistance, setEditLevelResistance] = useState('');
  const [editLevelSupport, setEditLevelSupport] = useState('');
  const [editLevelKeterangan, setEditLevelKeterangan] = useState('');
  const [editLevelSaving, setEditLevelSaving] = useState(false);

  const [minPlusList, setMinPlusList] = useState<TradingMinPlusItem[]>([]);
  const [minPlusHargaAcuan, setMinPlusHargaAcuan] = useState('');
  const [minPlusKeterangan, setMinPlusKeterangan] = useState('');
  const [minPlusSubmitting, setMinPlusSubmitting] = useState(false);
  const [editingMinPlusId, setEditingMinPlusId] = useState<string | null>(null);
  const [editMinPlusHargaAcuan, setEditMinPlusHargaAcuan] = useState('');
  const [editMinPlusKeterangan, setEditMinPlusKeterangan] = useState('');
  const [editMinPlusSaving, setEditMinPlusSaving] = useState(false);

  const [hargaBeliList, setHargaBeliList] = useState<TradingHargaBeliItem[]>([]);
  const [hargaBeliInput, setHargaBeliInput] = useState('');
  const [hargaBeliKeterangan, setHargaBeliKeterangan] = useState('');
  const [hargaBeliSubmitting, setHargaBeliSubmitting] = useState(false);
  const [editingHargaBeliId, setEditingHargaBeliId] = useState<string | null>(null);
  const [editHargaBeliInput, setEditHargaBeliInput] = useState('');
  const [editHargaBeliKeterangan, setEditHargaBeliKeterangan] = useState('');
  const [editHargaBeliSaving, setEditHargaBeliSaving] = useState(false);

  const [showKalkulator, setShowKalkulator] = useState(false);
  const [highInput, setHighInput] = useState('');
  const [lowInput, setLowInput] = useState('');
  const [closeInput, setCloseInput] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [pivotResult, setPivotResult] = useState<PivotResult | null>(null);
  const [kalkulatorError, setKalkulatorError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [hargaXau, setHargaXau] = useState<{ price: number; updatedAt: string } | null>(null);
  const [hargaBinance, setHargaBinance] = useState<{
    price: number;
    updatedAt: string;
    sumber?: string;
  } | null>(null);

  async function loadJadwal() {
    try {
      const res = await apiGet<{ items: JadwalItem[] }>('/api/trading-jadwal?limit=200');
      setJadwal(res.items);
    } catch {
      setJadwal([]);
    }
  }

  async function loadAnalisa() {
    try {
      const res = await apiGet<{ items: AnalisaItem[] }>('/api/trading-analisa?limit=50');
      setAnalisaList(res.items);
    } catch {
      setAnalisaList([]);
    }
  }

  async function loadHargaXau() {
    try {
      const res = await apiGet<{ price: number; updatedAt: string }>('/api/trading-harga-xau');
      setHargaXau(res);
    } catch {
      // Kartu harga live cuma pemanis di atas grafik — kalau gagal, biarkan
      // kosong saja, jangan ganggu bagian lain halaman.
    }
  }

  async function loadHargaBinance() {
    try {
      const res = await apiGet<{ price: number; updatedAt: string; sumber?: string }>(
        '/api/trading-harga-binance',
      );
      setHargaBinance(res);
    } catch {
      // Kalau sumber harga sedang bermasalah, badge ini disembunyikan saja,
      // jangan ganggu bagian lain halaman.
      setHargaBinance(null);
    }
  }

  async function loadLevel() {
    try {
      const res = await apiGet<{ items: TradingLevelItem[] }>('/api/trading-level?limit=50');
      setLevelList(res.items);
    } catch {
      setLevelList([]);
    }
  }

  async function loadMinPlus() {
    try {
      const res = await apiGet<{ items: TradingMinPlusItem[] }>('/api/trading-minplus?limit=50');
      setMinPlusList(res.items);
    } catch {
      setMinPlusList([]);
    }
  }

  async function loadHargaBeliTarget() {
    try {
      const res = await apiGet<{ items: TradingHargaBeliItem[] }>('/api/trading-harga-beli?limit=50');
      setHargaBeliList(res.items);
    } catch {
      setHargaBeliList([]);
    }
  }

  useEffect(() => {
    void loadJadwal();
    void loadAnalisa();
    void loadHargaXau();
    void loadHargaBinance();
    void loadLevel();
    void loadMinPlus();
    void loadHargaBeliTarget();
    const timer = setInterval(() => {
      void loadHargaXau();
      void loadHargaBinance();
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  // Level teraktif = entri Resistance/Support paling baru — dibandingkan
  // terhadap harga XAU/USD live yang sudah di-poll tiap 30 detik di atas.
  const activeLevel = levelList[0] ?? null;
  const hargaSaatIni = hargaXau?.price ?? null;
  const isTouchingResistance =
    activeLevel !== null && hargaSaatIni !== null && hargaSaatIni >= Number(activeLevel.resistance);
  const isTouchingSupport =
    activeLevel !== null && hargaSaatIni !== null && hargaSaatIni <= Number(activeLevel.support);
  const isTouchingLevel = isTouchingResistance || isTouchingSupport;

  // Bunyikan peringatan hanya saat status berpindah dari aman ke tersentuh
  // (bukan tiap poll 30 detik), sama seperti pola peringatan stok film.
  const levelTouchSebelumnyaRef = useRef(false);
  useEffect(() => {
    if (isTouchingLevel && !levelTouchSebelumnyaRef.current) {
      speakLevelAlert();
    }
    levelTouchSebelumnyaRef.current = isTouchingLevel;
  }, [isTouchingLevel]);

  async function handleLevelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!levelSupport.trim() || !levelResistance.trim()) return;
    setLevelSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/trading-level', {
        resistance: levelResistance.trim(),
        support: levelSupport.trim(),
        keterangan: levelKeterangan.trim() || undefined,
      });
      setLevelResistance('');
      setLevelSupport('');
      setLevelKeterangan('');
      await loadLevel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan level');
    } finally {
      setLevelSubmitting(false);
    }
  }

  async function handleLevelDelete(id: string) {
    await apiDelete(`/api/trading-level/${id}`);
    await loadLevel();
  }

  function openEditLevel(item: TradingLevelItem) {
    setEditingLevelId(item.id);
    setEditLevelResistance(item.resistance);
    setEditLevelSupport(item.support);
    setEditLevelKeterangan(item.keterangan ?? '');
  }

  function cancelEditLevel() {
    setEditingLevelId(null);
  }

  async function handleLevelEditSave(id: string) {
    setEditLevelSaving(true);
    setError(null);
    try {
      await apiPatch(`/api/trading-level/${id}`, {
        resistance: editLevelResistance.trim(),
        support: editLevelSupport.trim(),
        keterangan: editLevelKeterangan.trim() || undefined,
      });
      setEditingLevelId(null);
      await loadLevel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan level');
    } finally {
      setEditLevelSaving(false);
    }
  }

  // Acuan aktif = entri MinPlus paling baru. Selisih harga live terhadap
  // acuan dibagi $10 (dibulatkan ke bawah) menghasilkan "step" — tiap kali
  // step berubah (naik ATAU turun kelipatan $10, dari kedua arah plus/minus),
  // peringatan dibunyikan sekali, lalu reset begitu harga kembali ke bawah $10.
  const activeMinPlus = minPlusList[0] ?? null;
  const minPlusSelisih =
    activeMinPlus !== null && hargaSaatIni !== null ? hargaSaatIni - Number(activeMinPlus.hargaAcuan) : null;
  const minPlusStep = minPlusSelisih !== null ? Math.floor(Math.abs(minPlusSelisih) / 10) : 0;
  const isMinPlusTriggering = minPlusStep >= 1;

  const minPlusStepSebelumnyaRef = useRef(0);
  useEffect(() => {
    if (minPlusStep >= 1 && minPlusStep !== minPlusStepSebelumnyaRef.current) {
      speakMinPlusAlert();
    }
    minPlusStepSebelumnyaRef.current = minPlusStep;
  }, [minPlusStep]);

  async function handleMinPlusSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!minPlusHargaAcuan.trim()) return;
    setMinPlusSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/trading-minplus', {
        hargaAcuan: minPlusHargaAcuan.trim(),
        keterangan: minPlusKeterangan.trim() || undefined,
      });
      setMinPlusHargaAcuan('');
      setMinPlusKeterangan('');
      await loadMinPlus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan acuan MinPlus');
    } finally {
      setMinPlusSubmitting(false);
    }
  }

  async function handleMinPlusDelete(id: string) {
    await apiDelete(`/api/trading-minplus/${id}`);
    await loadMinPlus();
  }

  function openEditMinPlus(item: TradingMinPlusItem) {
    setEditingMinPlusId(item.id);
    setEditMinPlusHargaAcuan(item.hargaAcuan);
    setEditMinPlusKeterangan(item.keterangan ?? '');
  }

  function cancelEditMinPlus() {
    setEditingMinPlusId(null);
  }

  async function handleMinPlusEditSave(id: string) {
    setEditMinPlusSaving(true);
    setError(null);
    try {
      await apiPatch(`/api/trading-minplus/${id}`, {
        hargaAcuan: editMinPlusHargaAcuan.trim(),
        keterangan: editMinPlusKeterangan.trim() || undefined,
      });
      setEditingMinPlusId(null);
      await loadMinPlus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan acuan MinPlus');
    } finally {
      setEditMinPlusSaving(false);
    }
  }

  // Target aktif = entri Harga Beli paling baru. "Tersentuh" berarti harga
  // live sudah turun sampai ke (atau di bawah) target ini — sama seperti
  // logika Support pada fitur Resisten & Support di atas.
  const activeHargaBeli = hargaBeliList[0] ?? null;
  const isHargaBeliTersentuh =
    activeHargaBeli !== null && hargaSaatIni !== null && hargaSaatIni <= Number(activeHargaBeli.hargaBeli);

  const hargaBeliTersentuhSebelumnyaRef = useRef(false);
  useEffect(() => {
    if (isHargaBeliTersentuh && !hargaBeliTersentuhSebelumnyaRef.current) {
      speakHargaBeliAlert();
    }
    hargaBeliTersentuhSebelumnyaRef.current = isHargaBeliTersentuh;
  }, [isHargaBeliTersentuh]);

  async function handleHargaBeliSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hargaBeliInput.trim()) return;
    setHargaBeliSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/trading-harga-beli', {
        hargaBeli: hargaBeliInput.trim(),
        keterangan: hargaBeliKeterangan.trim() || undefined,
      });
      setHargaBeliInput('');
      setHargaBeliKeterangan('');
      await loadHargaBeliTarget();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan target harga beli');
    } finally {
      setHargaBeliSubmitting(false);
    }
  }

  async function handleHargaBeliDelete(id: string) {
    await apiDelete(`/api/trading-harga-beli/${id}`);
    await loadHargaBeliTarget();
  }

  function openEditHargaBeli(item: TradingHargaBeliItem) {
    setEditingHargaBeliId(item.id);
    setEditHargaBeliInput(item.hargaBeli);
    setEditHargaBeliKeterangan(item.keterangan ?? '');
  }

  function cancelEditHargaBeli() {
    setEditingHargaBeliId(null);
  }

  async function handleHargaBeliEditSave(id: string) {
    setEditHargaBeliSaving(true);
    setError(null);
    try {
      await apiPatch(`/api/trading-harga-beli/${id}`, {
        hargaBeli: editHargaBeliInput.trim(),
        keterangan: editHargaBeliKeterangan.trim() || undefined,
      });
      setEditingHargaBeliId(null);
      await loadHargaBeliTarget();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan target harga beli');
    } finally {
      setEditHargaBeliSaving(false);
    }
  }

  async function handleJadwalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jadwalNama.trim()) return;
    setJadwalSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/trading-jadwal', {
        tanggal: jadwalTanggal,
        namaEvent: jadwalNama.trim(),
        keterangan: jadwalKeterangan.trim() || undefined,
      });
      setJadwalNama('');
      setJadwalKeterangan('');
      await loadJadwal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan jadwal');
    } finally {
      setJadwalSubmitting(false);
    }
  }

  async function handleJadwalDelete(id: string) {
    await apiDelete(`/api/trading-jadwal/${id}`);
    await loadJadwal();
  }

  async function handleAnalisaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!analisaText.trim()) return;
    setAnalisaSubmitting(true);
    setError(null);
    try {
      const tanggalIso = analisaTanggalJam ? new Date(analisaTanggalJam).toISOString() : undefined;
      await apiPost('/api/trading-analisa', {
        analisa: analisaText.trim(),
        support: support.trim() || undefined,
        resistance: resistance.trim() || undefined,
        tanggal: tanggalIso,
      });
      setAnalisaText('');
      setSupport('');
      setResistance('');
      setAnalisaTanggalJam(toDatetimeLocalValue(new Date()));
      await loadAnalisa();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan analisa');
    } finally {
      setAnalisaSubmitting(false);
    }
  }

  async function handleAnalisaDelete(id: string) {
    await apiDelete(`/api/trading-analisa/${id}`);
    await loadAnalisa();
  }

  function openEditAnalisa(item: AnalisaItem) {
    setEditingAnalisaId(item.id);
    setEditAnalisaText(item.analisa);
    setEditSupport(item.support ?? '');
    setEditResistance(item.resistance ?? '');
    const parsed = new Date(item.tanggal);
    setEditTanggalJam(isNaN(parsed.getTime()) ? '' : toDatetimeLocalValue(parsed));
  }

  function cancelEditAnalisa() {
    setEditingAnalisaId(null);
  }

  async function handleAnalisaEditSave(id: string) {
    setEditAnalisaSaving(true);
    try {
      await apiPatch(`/api/trading-analisa/${id}`, {
        analisa: editAnalisaText.trim(),
        support: editSupport.trim() || undefined,
        resistance: editResistance.trim() || undefined,
        tanggal: editTanggalJam ? new Date(editTanggalJam).toISOString() : undefined,
      });
      setEditingAnalisaId(null);
      await loadAnalisa();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan analisa');
    } finally {
      setEditAnalisaSaving(false);
    }
  }

  function handleHitungAnalisa(e: React.FormEvent) {
    e.preventDefault();
    const h = Number(highInput);
    const l = Number(lowInput);
    const c = Number(closeInput);
    const cur = Number(currentInput);
    if (!highInput || !lowInput || !closeInput || !currentInput || [h, l, c, cur].some((n) => isNaN(n))) {
      setKalkulatorError('Isi High, Low, Close, dan Harga Saat Ini dengan angka yang valid.');
      setPivotResult(null);
      return;
    }
    if (l > h) {
      setKalkulatorError('Low tidak boleh lebih besar dari High.');
      setPivotResult(null);
      return;
    }
    setKalkulatorError(null);
    setPivotResult(computePivot(h, l, c, cur));
  }

  function handleGunakanUntukJurnal() {
    if (!pivotResult) return;
    const { s1, s2, s3, r1, r2, r3, pivot, signal, alasan } = pivotResult;
    const ringkas =
      `Sinyal: ${signal} — ${alasan} ` +
      `(H=${highInput}, L=${lowInput}, C=${closeInput}, Harga saat ini=${currentInput}, Pivot=${pivot.toFixed(2)}) ` +
      `Rencana: BELI di area Support (S1 ${s1.toFixed(2)}, S2 ${s2.toFixed(2)}, S3 ${s3.toFixed(2)}); ` +
      `JUAL di area Resistance (R1 ${r1.toFixed(2)}, R2 ${r2.toFixed(2)}, R3 ${r3.toFixed(2)}).`;
    setAnalisaText(ringkas);
    setSupport(`S1 ${s1.toFixed(2)} · S2 ${s2.toFixed(2)} · S3 ${s3.toFixed(2)}`);
    setResistance(`R1 ${r1.toFixed(2)} · R2 ${r2.toFixed(2)} · R3 ${r3.toFixed(2)}`);
    document.getElementById('tr-analisa')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          borderRadius: 'var(--radius-card)',
          background: `linear-gradient(120deg, ${BLUE}, #3b82f6 55%, ${YELLOW})`,
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(29, 78, 216, 0.28)',
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.18)', fontSize: '1.6rem',
          }}
        >
          🪙
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Trading XAU/USD</h2>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>
            Harga XAU/USD &amp; harga{' '}
            <a
              href="https://finance.yahoo.com/quote/GC=F/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#ffffff', textDecoration: 'underline' }}
            >
              emas berjangka COMEX
            </a>{' '}
            — update setiap saat.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={cardStyle}>
        <div style={cardTitlebarStyle}>📈 Grafik XAU/USD</div>
        <div style={cardBodyStyle}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setInterval_(tf.id)}
                style={{
                  padding: '0.35rem 0.9rem',
                  borderRadius: '999px',
                  border: `1px solid ${interval === tf.id ? YELLOW : 'var(--color-border)'}`,
                  background: interval === tf.id ? YELLOW : 'transparent',
                  color: interval === tf.id ? '#1a1a1a' : 'var(--color-text)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {tf.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                document.getElementById('tr-jadwal-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: `1px solid ${YELLOW}`,
                background: 'transparent',
                color: 'var(--color-text)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              📅 Jadwal Trading
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById('tr-tehnik-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: `1px solid ${YELLOW}`,
                background: 'transparent',
                color: 'var(--color-text)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              🎯 Tehnik Trading
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById('tr-beli-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: `1px solid ${GREEN}`,
                background: 'transparent',
                color: 'var(--color-text)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              🛒 Beli
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById('tr-minplus-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: '1px solid #7c3aed',
                background: isMinPlusTriggering ? '#7c3aed' : 'transparent',
                color: isMinPlusTriggering ? '#ffffff' : 'var(--color-text)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              ⚖️ MinPlus{isMinPlusTriggering ? '!' : ''}
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById('tr-harga-beli-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: `1px solid ${GREEN}`,
                background: isHargaBeliTersentuh ? GREEN : 'transparent',
                color: isHargaBeliTersentuh ? '#ffffff' : 'var(--color-text)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              💰 {isHargaBeliTersentuh ? 'Harga Beli Tersentuh!' : 'Harga Pembelian'}
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById('tr-level-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: '1px solid #dc2626',
                background: isTouchingLevel ? '#dc2626' : 'transparent',
                color: isTouchingLevel ? '#ffffff' : 'var(--color-text)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              🎯 {isTouchingLevel ? 'Resisten/Support Tersentuh!' : 'Resisten & Support'}
            </button>
            {hargaXau && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '999px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                }}
                title={`Update ${formatTanggalJamDisplay(hargaXau.updatedAt)}`}
              >
                <span style={{ fontWeight: 700, color: YELLOW }}>🪙 XAU/USD</span>
                <span style={{ fontWeight: 800 }}>
                  ${hargaXau.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {hargaBinance && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '999px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                }}
                title={`Update ${formatTanggalJamDisplay(hargaBinance.updatedAt)}`}
              >
                <span style={{ fontWeight: 700, color: '#f0b90b' }}>
                  🟡 {hargaBinance.sumber ?? 'Emas Berjangka'}
                </span>
                <span style={{ fontWeight: 800 }}>
                  ${hargaBinance.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowKalkulator((v) => !v)}
              style={{
                marginLeft: 'auto',
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: `1px solid ${BLUE}`,
                background: BLUE,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              🔍 {showKalkulator ? 'Tutup Analisa' : 'Analisa Grafik (Beli/Jual)'}
            </button>
          </div>
          <div
            style={{
              position: 'relative',
              height: 480,
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <iframe
              key={interval}
              title="Grafik XAU/USD"
              src={chartSrc(interval)}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
            {analisaList.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  maxWidth: 230,
                  padding: '0.6rem 0.7rem',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  lineHeight: 1.5,
                  pointerEvents: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: YELLOW }}>
                  📊 Analisa Terakhir — {formatTanggalJamDisplay(analisaList[0]!.tanggal)}
                </div>
                {analisaList[0]!.support && (
                  <div style={{ color: '#86efac' }}>Support: {analisaList[0]!.support}</div>
                )}
                {analisaList[0]!.resistance && (
                  <div style={{ color: '#fca5a5' }}>Resistance: {analisaList[0]!.resistance}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showKalkulator && (
        <div style={cardStyle}>
          <div style={cardTitlebarStyle}>🔍 Analisa Grafik — Sinyal Beli/Jual &amp; Support/Resistance</div>
          <div style={cardBodyStyle}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Lihat nilai High, Low, Close (dari periode di grafik atas) dan harga saat ini, lalu masukkan di
              bawah. Sinyal dihitung dengan rumus Pivot Point standar — bukan rekomendasi finansial, hanya
              bantuan baca level teknikal.
            </p>
            <form onSubmit={handleHitungAnalisa} className="form-grid">
              <div className="form-field">
                <label htmlFor="tr-high" style={{ color: BLUE, fontWeight: 700 }}>High</label>
                <input
                  id="tr-high"
                  value={highInput}
                  onChange={(e) => setHighInput(e.target.value)}
                  placeholder="Contoh: 2405.30"
                  style={{ borderLeft: `3px solid ${YELLOW}` }}
                />
              </div>
              <div className="form-field">
                <label htmlFor="tr-low" style={{ color: BLUE, fontWeight: 700 }}>Low</label>
                <input
                  id="tr-low"
                  value={lowInput}
                  onChange={(e) => setLowInput(e.target.value)}
                  placeholder="Contoh: 2385.10"
                  style={{ borderLeft: `3px solid ${YELLOW}` }}
                />
              </div>
              <div className="form-field">
                <label htmlFor="tr-close" style={{ color: BLUE, fontWeight: 700 }}>Close</label>
                <input
                  id="tr-close"
                  value={closeInput}
                  onChange={(e) => setCloseInput(e.target.value)}
                  placeholder="Contoh: 2398.00"
                  style={{ borderLeft: `3px solid ${YELLOW}` }}
                />
              </div>
              <div className="form-field">
                <label htmlFor="tr-current" style={{ color: BLUE, fontWeight: 700 }}>Harga Saat Ini</label>
                <input
                  id="tr-current"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Contoh: 2401.50"
                  style={{ borderLeft: `3px solid ${YELLOW}` }}
                />
              </div>
              <div className="form-grid--full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn--primary">
                  Hitung Analisa
                </button>
              </div>
            </form>

            {kalkulatorError && (
              <div className="alert alert--error" style={{ marginTop: '0.75rem' }}>
                {kalkulatorError}
              </div>
            )}

            {pivotResult && (
              <div style={{ marginTop: '1rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.9rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '0.85rem',
                    background:
                      pivotResult.signal === 'BELI' ? '#dcfce7' : pivotResult.signal === 'JUAL' ? '#fee2e2' : '#f1f5f9',
                    border: `1px solid ${
                      pivotResult.signal === 'BELI' ? '#16a34a' : pivotResult.signal === 'JUAL' ? '#dc2626' : '#94a3b8'
                    }`,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color:
                        pivotResult.signal === 'BELI' ? '#16a34a' : pivotResult.signal === 'JUAL' ? '#dc2626' : '#475569',
                    }}
                  >
                    {pivotResult.signal === 'BELI' ? '📈 BELI' : pivotResult.signal === 'JUAL' ? '📉 JUAL' : '➖ NETRAL'}
                  </span>
                  <span style={{ fontSize: '0.85rem' }}>{pivotResult.alasan}</span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '0.6rem',
                    marginBottom: '0.85rem',
                  }}
                >
                  {[
                    { label: 'Resistance 3', value: pivotResult.r3, tone: '#dc2626' },
                    { label: 'Resistance 2', value: pivotResult.r2, tone: '#dc2626' },
                    { label: 'Resistance 1', value: pivotResult.r1, tone: '#dc2626' },
                    { label: 'Pivot', value: pivotResult.pivot, tone: BLUE },
                    { label: 'Support 1', value: pivotResult.s1, tone: '#16a34a' },
                    { label: 'Support 2', value: pivotResult.s2, tone: '#16a34a' },
                    { label: 'Support 3', value: pivotResult.s3, tone: '#16a34a' },
                  ].map((row) => (
                    <div
                      key={row.label}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{row.label}</div>
                      <div style={{ fontWeight: 700, color: row.tone }}>{row.value.toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <button type="button" className="btn btn--sm btn--primary" onClick={handleGunakanUntukJurnal}>
                  💾 Gunakan untuk Jurnal Analisa
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div id="tr-beli-section" style={cardStyle}>
        <div style={cardTitlebarStyle}>📝 Analisa &amp; Level Sebelum Beli XAU</div>
        <div style={cardBodyStyle}>
          <form onSubmit={(e) => void handleAnalisaSubmit(e)} className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="tr-analisa" style={{ color: BLUE, fontWeight: 700 }}>Analisa</label>
              <textarea
                id="tr-analisa"
                rows={3}
                value={analisaText}
                onChange={(e) => setAnalisaText(e.target.value)}
                placeholder="Contoh: Harga mendekati support kuat, momentum RSI oversold, rencana entry buy..."
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="tr-tanggal-jam" style={{ color: BLUE, fontWeight: 700 }}>Tanggal &amp; Jam</label>
              <input
                id="tr-tanggal-jam"
                type="datetime-local"
                value={analisaTanggalJam}
                onChange={(e) => setAnalisaTanggalJam(e.target.value)}
                style={{ borderLeft: `3px solid ${YELLOW}` }}
              />
            </div>
            <div className="form-field">
              <label htmlFor="tr-support" style={{ color: BLUE, fontWeight: 700 }}>Support</label>
              <input
                id="tr-support"
                value={support}
                onChange={(e) => setSupport(e.target.value)}
                placeholder="Contoh: 2380.50"
                style={{ borderLeft: `3px solid ${YELLOW}` }}
              />
            </div>
            <div className="form-field">
              <label htmlFor="tr-resistance" style={{ color: BLUE, fontWeight: 700 }}>Resistance</label>
              <input
                id="tr-resistance"
                value={resistance}
                onChange={(e) => setResistance(e.target.value)}
                placeholder="Contoh: 2410.00"
                style={{ borderLeft: `3px solid ${YELLOW}` }}
              />
            </div>
            <div className="form-grid--full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn--primary" disabled={analisaSubmitting}>
                {analisaSubmitting ? 'Menyimpan…' : '+ Simpan Analisa'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={handleExportAnalisaExcel}
              disabled={exportingAnalisaExcel || analisaList.length === 0}
              style={{ border: '1px solid var(--color-border)' }}
            >
              📊 {exportingAnalisaExcel ? 'Memproses…' : 'Simpan Tabel (Excel)'}
            </button>
          </div>

          <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {analisaList.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Belum ada catatan analisa.</p>
            ) : (
              analisaList.map((item) => {
                const isEditing = editingAnalisaId === item.id;
                return (
                <div
                  key={item.id}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid var(--color-border)',
                    borderLeft: `4px solid ${YELLOW}`,
                    borderRadius: '6px',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <strong style={{ fontSize: '0.78rem', color: BLUE }}>{formatTanggalJamDisplay(item.tanggal)}</strong>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="btn btn--xs btn--primary"
                            onClick={() => void handleAnalisaEditSave(item.id)}
                            disabled={editAnalisaSaving}
                          >
                            {editAnalisaSaving ? 'Menyimpan…' : '💾 Simpan'}
                          </button>
                          <button
                            type="button"
                            className="btn btn--xs btn--ghost"
                            onClick={cancelEditAnalisa}
                            disabled={editAnalisaSaving}
                          >
                            Batal
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn--xs btn--ghost"
                            onClick={() => openEditAnalisa(item)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn--xs btn--ghost"
                            onClick={() => void handleAnalisaDelete(item.id)}
                            style={{ color: '#dc2626' }}
                          >
                            Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input
                        type="datetime-local"
                        value={editTanggalJam}
                        onChange={(e) => setEditTanggalJam(e.target.value)}
                        style={{ borderLeft: `3px solid ${YELLOW}` }}
                      />
                      <textarea
                        rows={3}
                        value={editAnalisaText}
                        onChange={(e) => setEditAnalisaText(e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          value={editSupport}
                          onChange={(e) => setEditSupport(e.target.value)}
                          placeholder="Support"
                          style={{ flex: 1, borderLeft: '3px solid #16a34a' }}
                        />
                        <input
                          value={editResistance}
                          onChange={(e) => setEditResistance(e.target.value)}
                          placeholder="Resistance"
                          style={{ flex: 1, borderLeft: '3px solid #dc2626' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>{item.analisa}</p>
                      <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <div
                          style={{
                            border: '1px solid #86efac',
                            borderRadius: '6px',
                            background: '#f0fdf4',
                            padding: '0.3rem 0.6rem',
                          }}
                        >
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a' }}>SUPPORT</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#15803d' }}>
                            {item.support || '—'}
                          </div>
                        </div>
                        <div
                          style={{
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            background: '#fef2f2',
                            padding: '0.3rem 0.6rem',
                          }}
                        >
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626' }}>RESISTANCE</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b91c1c' }}>
                            {item.resistance || '—'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div id="tr-level-section" style={cardStyle}>
        <div
          style={{
            ...cardTitlebarStyle,
            background: isTouchingLevel ? 'linear-gradient(90deg, #dc2626, #f87171)' : cardTitlebarStyle.background,
          }}
        >
          🎯 Update Resisten &amp; Support (Peringatan Otomatis)
        </div>
        <div style={cardBodyStyle}>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Simpan level Support &amp; Resistance terbaru di sini. Begitu harga XAU/USD live (dipantau tiap 30
            detik di atas) menyentuh salah satu level, suara peringatan akan diucapkan 3 kali berturut-turut.
          </p>

          {activeLevel && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                background: isTouchingLevel ? '#fee2e2' : '#f0fdf4',
                border: `1px solid ${isTouchingLevel ? '#dc2626' : '#16a34a'}`,
              }}
            >
              <span style={{ fontWeight: 800, color: isTouchingLevel ? '#dc2626' : '#16a34a' }}>
                {isTouchingLevel
                  ? isTouchingResistance
                    ? '🚨 HARGA MENYENTUH RESISTANCE!'
                    : '🚨 HARGA MENYENTUH SUPPORT!'
                  : '✅ Harga masih di antara Support & Resistance'}
              </span>
              <span style={{ fontSize: '0.8rem' }}>
                Level aktif: Support {activeLevel.support} · Resistance {activeLevel.resistance}
                {hargaSaatIni !== null &&
                  ` · Harga saat ini $${hargaSaatIni.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
          )}

          <form onSubmit={(e) => void handleLevelSubmit(e)} className="form-grid">
            <div className="form-field">
              <label htmlFor="tr-level-support" style={{ color: BLUE, fontWeight: 700 }}>Support</label>
              <input
                id="tr-level-support"
                value={levelSupport}
                onChange={(e) => setLevelSupport(e.target.value)}
                placeholder="Contoh: 2380.50"
                style={{ borderLeft: '3px solid #16a34a' }}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="tr-level-resistance" style={{ color: BLUE, fontWeight: 700 }}>Resistance</label>
              <input
                id="tr-level-resistance"
                value={levelResistance}
                onChange={(e) => setLevelResistance(e.target.value)}
                placeholder="Contoh: 2410.00"
                style={{ borderLeft: '3px solid #dc2626' }}
                required
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="tr-level-ket" style={{ color: BLUE, fontWeight: 700 }}>Keterangan (Opsional)</label>
              <input
                id="tr-level-ket"
                value={levelKeterangan}
                onChange={(e) => setLevelKeterangan(e.target.value)}
                placeholder="Catatan tambahan..."
              />
            </div>
            <div className="form-grid--full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn--primary" disabled={levelSubmitting}>
                {levelSubmitting ? 'Menyimpan…' : '+ Simpan Level'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {levelList.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                Belum ada level resistance/support tersimpan.
              </p>
            ) : (
              levelList.map((item, idx) => {
                const isEditingLevel = editingLevelId === item.id;
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid var(--color-border)',
                      borderLeft: `4px solid ${idx === 0 ? '#dc2626' : 'var(--color-border)'}`,
                      borderRadius: '6px',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <strong style={{ fontSize: '0.78rem', color: BLUE }}>
                        {formatTanggalJamDisplay(item.createdAt)}
                        {idx === 0 && ' · (Aktif dipantau)'}
                      </strong>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {isEditingLevel ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--xs btn--primary"
                              onClick={() => void handleLevelEditSave(item.id)}
                              disabled={editLevelSaving}
                            >
                              {editLevelSaving ? 'Menyimpan…' : '💾 Simpan'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--xs btn--ghost"
                              onClick={cancelEditLevel}
                              disabled={editLevelSaving}
                            >
                              Batal
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn--xs btn--ghost"
                              onClick={() => openEditLevel(item)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn--xs btn--ghost"
                              onClick={() => void handleLevelDelete(item.id)}
                              style={{ color: '#dc2626' }}
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditingLevel ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input
                          value={editLevelSupport}
                          onChange={(e) => setEditLevelSupport(e.target.value)}
                          placeholder="Support"
                          style={{ flex: 1, borderLeft: '3px solid #16a34a' }}
                        />
                        <input
                          value={editLevelResistance}
                          onChange={(e) => setEditLevelResistance(e.target.value)}
                          placeholder="Resistance"
                          style={{ flex: 1, borderLeft: '3px solid #dc2626' }}
                        />
                        <input
                          value={editLevelKeterangan}
                          onChange={(e) => setEditLevelKeterangan(e.target.value)}
                          placeholder="Keterangan"
                          style={{ flex: 2 }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div
                          style={{
                            border: '1px solid #86efac',
                            borderRadius: '6px',
                            background: '#f0fdf4',
                            padding: '0.3rem 0.6rem',
                          }}
                        >
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a' }}>SUPPORT</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#15803d' }}>{item.support}</div>
                        </div>
                        <div
                          style={{
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            background: '#fef2f2',
                            padding: '0.3rem 0.6rem',
                          }}
                        >
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626' }}>RESISTANCE</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b91c1c' }}>
                            {item.resistance}
                          </div>
                        </div>
                        {item.keterangan && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {item.keterangan}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div id="tr-minplus-section" style={cardStyle}>
        <div
          style={{
            ...cardTitlebarStyle,
            background: isMinPlusTriggering ? 'linear-gradient(90deg, #7c3aed, #a78bfa)' : cardTitlebarStyle.background,
          }}
        >
          ⚖️ MinPlus — Peringatan Tiap Kelipatan $10 dari Harga Acuan
        </div>
        <div style={cardBodyStyle}>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Simpan harga acuan (entry) di sini. Setiap kali harga XAU/USD live bergerak minus atau plus
            kelipatan $10 dari acuan ini, suara "Santai, santai. Diteruskan atau dijual, sedang menunggu
            keputusan yang tepat." akan diucapkan.
          </p>

          {activeMinPlus && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                background: isMinPlusTriggering ? '#f3e8ff' : '#f0fdf4',
                border: `1px solid ${isMinPlusTriggering ? '#7c3aed' : '#16a34a'}`,
              }}
            >
              <span style={{ fontWeight: 800, color: isMinPlusTriggering ? '#7c3aed' : '#16a34a' }}>
                {isMinPlusTriggering ? '⚖️ SUDAH BERGERAK ≥ $10!' : '✅ Masih di bawah $10 dari acuan'}
              </span>
              <span style={{ fontSize: '0.8rem' }}>
                Harga acuan: ${Number(activeMinPlus.hargaAcuan).toFixed(2)}
                {minPlusSelisih !== null &&
                  ` · Selisih: ${minPlusSelisih >= 0 ? '+' : ''}${minPlusSelisih.toFixed(2)} USD (${minPlusSelisih >= 0 ? 'PLUS' : 'MINUS'})`}
              </span>
            </div>
          )}

          <form onSubmit={(e) => void handleMinPlusSubmit(e)} className="form-grid">
            <div className="form-field">
              <label htmlFor="tr-minplus-acuan" style={{ color: BLUE, fontWeight: 700 }}>Harga Acuan (Entry)</label>
              <input
                id="tr-minplus-acuan"
                value={minPlusHargaAcuan}
                onChange={(e) => setMinPlusHargaAcuan(e.target.value)}
                placeholder="Contoh: 2400.00"
                style={{ borderLeft: '3px solid #7c3aed' }}
                required
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="tr-minplus-ket" style={{ color: BLUE, fontWeight: 700 }}>Keterangan (Opsional)</label>
              <input
                id="tr-minplus-ket"
                value={minPlusKeterangan}
                onChange={(e) => setMinPlusKeterangan(e.target.value)}
                placeholder="Catatan tambahan..."
              />
            </div>
            <div className="form-grid--full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn--primary" disabled={minPlusSubmitting}>
                {minPlusSubmitting ? 'Menyimpan…' : '+ Tambah Acuan'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {minPlusList.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Belum ada harga acuan tersimpan.</p>
            ) : (
              minPlusList.map((item, idx) => {
                const isEditingMinPlus = editingMinPlusId === item.id;
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid var(--color-border)',
                      borderLeft: `4px solid ${idx === 0 ? '#7c3aed' : 'var(--color-border)'}`,
                      borderRadius: '6px',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <strong style={{ fontSize: '0.78rem', color: BLUE }}>
                        {formatTanggalJamDisplay(item.createdAt)}
                        {idx === 0 && ' · (Aktif dipantau)'}
                      </strong>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {isEditingMinPlus ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--xs btn--primary"
                              onClick={() => void handleMinPlusEditSave(item.id)}
                              disabled={editMinPlusSaving}
                            >
                              {editMinPlusSaving ? 'Menyimpan…' : '💾 Simpan'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--xs btn--ghost"
                              onClick={cancelEditMinPlus}
                              disabled={editMinPlusSaving}
                            >
                              Batal
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn--xs btn--ghost"
                              onClick={() => openEditMinPlus(item)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn--xs btn--ghost"
                              onClick={() => void handleMinPlusDelete(item.id)}
                              style={{ color: '#dc2626' }}
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditingMinPlus ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input
                          value={editMinPlusHargaAcuan}
                          onChange={(e) => setEditMinPlusHargaAcuan(e.target.value)}
                          placeholder="Harga Acuan"
                          style={{ flex: 1, borderLeft: '3px solid #7c3aed' }}
                        />
                        <input
                          value={editMinPlusKeterangan}
                          onChange={(e) => setEditMinPlusKeterangan(e.target.value)}
                          placeholder="Keterangan"
                          style={{ flex: 2 }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div
                          style={{
                            border: '1px solid #c4b5fd',
                            borderRadius: '6px',
                            background: '#f5f3ff',
                            padding: '0.3rem 0.6rem',
                          }}
                        >
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#7c3aed' }}>HARGA ACUAN</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#6d28d9' }}>
                            ${Number(item.hargaAcuan).toFixed(2)}
                          </div>
                        </div>
                        {item.keterangan && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {item.keterangan}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div id="tr-harga-beli-section" style={cardStyle}>
        <div
          style={{
            ...cardTitlebarStyle,
            background: isHargaBeliTersentuh ? `linear-gradient(90deg, ${GREEN}, #4ade80)` : cardTitlebarStyle.background,
          }}
        >
          💰 Target Harga Pembelian (Peringatan "Beli" Saat Tersentuh)
        </div>
        <div style={cardBodyStyle}>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Simpan target harga pembelian di sini. Begitu harga XAU/USD live turun menyentuh (atau di bawah)
            target ini, suara "Beli" akan diucapkan.
          </p>

          {activeHargaBeli && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                background: isHargaBeliTersentuh ? '#dcfce7' : '#f8fafc',
                border: `1px solid ${isHargaBeliTersentuh ? GREEN : 'var(--color-border)'}`,
              }}
            >
              <span style={{ fontWeight: 800, color: isHargaBeliTersentuh ? '#15803d' : 'var(--color-text)' }}>
                {isHargaBeliTersentuh ? '🚨 HARGA SUDAH MENYENTUH TARGET BELI!' : '⏳ Menunggu harga turun ke target'}
              </span>
              <span style={{ fontSize: '0.8rem' }}>
                Target beli: ${Number(activeHargaBeli.hargaBeli).toFixed(2)}
                {hargaSaatIni !== null &&
                  ` · Harga saat ini: $${hargaSaatIni.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
          )}

          <form onSubmit={(e) => void handleHargaBeliSubmit(e)} className="form-grid">
            <div className="form-field">
              <label htmlFor="tr-hargabeli-input" style={{ color: BLUE, fontWeight: 700 }}>Target Harga Beli</label>
              <input
                id="tr-hargabeli-input"
                value={hargaBeliInput}
                onChange={(e) => setHargaBeliInput(e.target.value)}
                placeholder="Contoh: 2390.00"
                style={{ borderLeft: `3px solid ${GREEN}` }}
                required
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="tr-hargabeli-ket" style={{ color: BLUE, fontWeight: 700 }}>Keterangan (Opsional)</label>
              <input
                id="tr-hargabeli-ket"
                value={hargaBeliKeterangan}
                onChange={(e) => setHargaBeliKeterangan(e.target.value)}
                placeholder="Catatan tambahan..."
              />
            </div>
            <div className="form-grid--full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn--primary" disabled={hargaBeliSubmitting}>
                {hargaBeliSubmitting ? 'Menyimpan…' : '+ Tambah Target'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {hargaBeliList.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Belum ada target harga beli tersimpan.</p>
            ) : (
              hargaBeliList.map((item, idx) => {
                const isEditingHargaBeli = editingHargaBeliId === item.id;
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid var(--color-border)',
                      borderLeft: `4px solid ${idx === 0 ? GREEN : 'var(--color-border)'}`,
                      borderRadius: '6px',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <strong style={{ fontSize: '0.78rem', color: BLUE }}>
                        {formatTanggalJamDisplay(item.createdAt)}
                        {idx === 0 && ' · (Aktif dipantau)'}
                      </strong>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {isEditingHargaBeli ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--xs btn--primary"
                              onClick={() => void handleHargaBeliEditSave(item.id)}
                              disabled={editHargaBeliSaving}
                            >
                              {editHargaBeliSaving ? 'Menyimpan…' : '💾 Simpan'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--xs btn--ghost"
                              onClick={cancelEditHargaBeli}
                              disabled={editHargaBeliSaving}
                            >
                              Batal
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn--xs btn--ghost"
                              onClick={() => openEditHargaBeli(item)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn--xs btn--ghost"
                              onClick={() => void handleHargaBeliDelete(item.id)}
                              style={{ color: '#dc2626' }}
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditingHargaBeli ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input
                          value={editHargaBeliInput}
                          onChange={(e) => setEditHargaBeliInput(e.target.value)}
                          placeholder="Target Harga Beli"
                          style={{ flex: 1, borderLeft: `3px solid ${GREEN}` }}
                        />
                        <input
                          value={editHargaBeliKeterangan}
                          onChange={(e) => setEditHargaBeliKeterangan(e.target.value)}
                          placeholder="Keterangan"
                          style={{ flex: 2 }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div
                          style={{
                            border: '1px solid #86efac',
                            borderRadius: '6px',
                            background: '#f0fdf4',
                            padding: '0.3rem 0.6rem',
                          }}
                        >
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#15803d' }}>TARGET BELI</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#15803d' }}>
                            ${Number(item.hargaBeli).toFixed(2)}
                          </div>
                        </div>
                        {item.keterangan && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {item.keterangan}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div id="tr-jadwal-section" style={cardStyle}>
        <div style={cardTitlebarStyle}>📅 Jadwal Tahunan (Event Ekonomi)</div>
        <div style={cardBodyStyle}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: BLUE }}>
            🔴 Kalender Live (konek TradingView, update otomatis)
          </p>
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '1.25rem',
              borderLeft: `4px solid ${YELLOW}`,
            }}
          >
            <iframe
              title="Kalender Ekonomi Live"
              src={economicCalendarSrc()}
              style={{ width: '100%', height: 460, border: 'none', display: 'block' }}
            />
          </div>

          <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: BLUE }}>📝 Catatan Jadwal Saya (manual)</p>
          <form onSubmit={(e) => void handleJadwalSubmit(e)} className="form-grid">
            <div className="form-field">
              <label htmlFor="tr-jadwal-tanggal" style={{ color: BLUE, fontWeight: 700 }}>Tanggal</label>
              <input
                id="tr-jadwal-tanggal"
                type="date"
                value={jadwalTanggal}
                onChange={(e) => setJadwalTanggal(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="tr-jadwal-nama" style={{ color: BLUE, fontWeight: 700 }}>Nama Event</label>
              <input
                id="tr-jadwal-nama"
                value={jadwalNama}
                onChange={(e) => setJadwalNama(e.target.value)}
                placeholder="Contoh: FOMC Meeting, Rilis NFP"
                required
              />
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="tr-jadwal-ket" style={{ color: BLUE, fontWeight: 700 }}>Keterangan (Opsional)</label>
              <input
                id="tr-jadwal-ket"
                value={jadwalKeterangan}
                onChange={(e) => setJadwalKeterangan(e.target.value)}
                placeholder="Catatan tambahan..."
              />
            </div>
            <div className="form-grid--full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn--primary" disabled={jadwalSubmitting}>
                {jadwalSubmitting ? 'Menyimpan…' : '+ Tambah Jadwal'}
              </button>
            </div>
          </form>

          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Event</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jadwal.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem' }}>
                      Belum ada jadwal event.
                    </td>
                  </tr>
                ) : (
                  jadwal.map((item) => (
                    <tr key={item.id}>
                      <td>{formatTanggalDisplay(item.tanggal)}</td>
                      <td style={{ fontWeight: 600 }}>{item.namaEvent}</td>
                      <td>{item.keterangan || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--xs btn--ghost"
                          onClick={() => void handleJadwalDelete(item.id)}
                          style={{ color: '#dc2626' }}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="tr-tehnik-section" style={cardStyle}>
        <div style={cardTitlebarStyle}>🎯 Tehnik Trading</div>
        <div style={cardBodyStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {TEHNIK_TIMELINE.map((step) => (
              <div
                key={step.waktu}
                style={{
                  display: 'flex',
                  gap: '0.9rem',
                  padding: '0.75rem 0.9rem',
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${YELLOW}`,
                  borderRadius: '6px',
                  background: '#f8fafc',
                }}
              >
                <div style={{ flex: '0 0 200px', fontWeight: 800, color: BLUE, fontSize: '0.85rem' }}>
                  ⏰ {step.waktu}
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
                  {step.poin.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: BLUE }}>🗓️ Rilis Data Mingguan Penting</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {TEHNIK_RILIS_MINGGUAN.map((rilis) => (
              <div
                key={rilis.hari}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '6px',
                  border: `1px solid ${rilis.penting ? '#dc2626' : 'var(--color-border)'}`,
                  background: rilis.penting ? '#fee2e2' : '#ffffff',
                }}
              >
                <span style={{ fontWeight: 700, color: BLUE }}>{rilis.hari}</span>
                <span style={{ fontWeight: rilis.penting ? 800 : 600, color: rilis.penting ? '#dc2626' : 'var(--color-text)' }}>
                  {rilis.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
