import { useEffect, useRef, useState } from 'react';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { HADITH_COLLECTIONS } from '../lib/hadithApi.ts';
import { useHadithReader } from '../context/HadithReaderContext.tsx';
import {
  KISAH_25_NABI,
  KISAH_KARBALA,
  PERANG_RASULULLAH,
  SIRAH_NABAWIYAH,
  type KisahEntry,
} from '../lib/kisahContent.ts';
import { fetchSurahList, type QuranSurahListItem } from '../lib/quranApi.ts';
import { fetchTafsir, TAFSIR_EDITIONS, type TafsirAyah } from '../lib/tafsirApi.ts';
import { toSpeakableText, withIndonesianVoice } from '../lib/speechVoice.ts';
import '../components/ui/ui.css';

const KATEGORI = [
  { id: 'sirah', label: 'Sirah Nabawiyah' },
  { id: 'nabi', label: '25 Nabi & Rasul' },
  { id: 'perang', label: 'Perang Rasulullah' },
  { id: 'karbala', label: 'Perang Karbala' },
  { id: 'hadits', label: 'Bukhari & Muslim' },
  { id: 'tafsir', label: 'Tafsir Al-Qur\'an' },
] as const;

type KategoriId = (typeof KATEGORI)[number]['id'];

function KisahEntryList({ items }: { readonly items: readonly KisahEntry[] }) {
  return (
    <div>
      {items.map((item) => (
        <div key={item.judul} style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ color: '#0f172a', marginBottom: '0.4rem' }}>{item.judul}</h3>
          <p style={{ color: '#334155', lineHeight: 1.7, margin: 0 }}>{item.isi}</p>
        </div>
      ))}
    </div>
  );
}

function HaditsSection() {
  const { collection, current, isSpeaking, loading, error, startReading, showOnce, stop } = useHadithReader();
  const [collectionInput, setCollectionInput] = useState(collection ?? HADITH_COLLECTIONS[0]!.id);
  const [nomor, setNomor] = useState(current ? String(current.number) : '1');

  function tampilkan() {
    const n = Number(nomor);
    if (!n || n < 1) return;
    showOnce(collectionInput, n);
  }

  function toggleSpeak() {
    if (isSpeaking) {
      stop();
      return;
    }
    if (!current) return;
    startReading(collectionInput, current.number);
  }

  return (
    <div>
      <p className="form-hint" style={{ marginBottom: '1rem' }}>
        Teks hadits diambil langsung dari database terbuka{' '}
        <a href="https://github.com/fawazahmed0/hadith-api" target="_blank" rel="noopener noreferrer">
          fawazahmed0/hadith-api
        </a>{' '}
        (terjemahan Indonesia) — bukan dari kutipan ingatan, supaya nomor & teksnya akurat. Tombol
        "🔊 Bacakan & Lanjut" akan terus membacakan nomor berikutnya walau Anda pindah ke menu lain — baru
        berhenti kalau ditekan "⏹️ Stop".
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div className="form-field" style={{ margin: 0 }}>
          <label htmlFor="kisah-kitab">Kitab</label>
          <select
            id="kisah-kitab"
            value={collectionInput}
            onChange={(e) => setCollectionInput(e.target.value as typeof collectionInput)}
          >
            {HADITH_COLLECTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field" style={{ margin: 0, width: '8rem' }}>
          <label htmlFor="kisah-nomor">Nomor Hadits</label>
          <input id="kisah-nomor" type="number" min={1} value={nomor} onChange={(e) => setNomor(e.target.value)} />
        </div>
        <button type="button" className="btn btn--primary" onClick={tampilkan} disabled={loading}>
          {loading ? '⏳ Memuat…' : '📖 Tampilkan'}
        </button>
        {current && (
          <button
            type="button"
            className={`btn btn--sm ${isSpeaking ? 'btn--danger' : 'btn--secondary'}`}
            onClick={toggleSpeak}
            title="Bacakan hadits ini, lalu lanjut otomatis ke nomor berikutnya — jalan terus walau pindah menu"
          >
            {isSpeaking ? '⏹️ Stop' : '🔊 Bacakan & Lanjut'}
          </button>
        )}
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {current && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.35rem' }}>
            {current.collectionName}
            {current.sectionName ? ` — Bab: ${current.sectionName}` : ''} — No. {current.number}
          </div>
          <p style={{ margin: 0, color: '#334155', lineHeight: 1.8 }}>{current.text}</p>
        </div>
      )}
    </div>
  );
}

function TafsirSection() {
  const [surahList, setSurahList] = useState<readonly QuranSurahListItem[]>([]);
  const [surahLoading, setSurahLoading] = useState(true);
  const [surahNumber, setSurahNumber] = useState(1);
  const [edition, setEdition] = useState(TAFSIR_EDITIONS[0]!.id);
  const [ayat, setAyat] = useState<readonly TafsirAyah[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speakIndex, setSpeakIndex] = useState<number | null>(null);
  // Ref supaya callback onEnd dari speechSynthesis tahu persis apakah mode
  // lanjut-otomatis masih aktif saat itu terpicu.
  const autoPlayRef = useRef(false);

  useEffect(() => {
    fetchSurahList()
      .then(setSurahList)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Gagal memuat daftar surah'))
      .finally(() => setSurahLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      autoPlayRef.current = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  function stopSpeak() {
    autoPlayRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeakIndex(null);
  }

  function speakFrom(list: readonly TafsirAyah[], index: number) {
    const item = list[index];
    if (!item) {
      autoPlayRef.current = false;
      setSpeakIndex(null);
      return;
    }
    setSpeakIndex(index);
    withIndonesianVoice((voice) => {
      if (!autoPlayRef.current) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(toSpeakableText(item.tafsir));
      utter.lang = voice?.lang ?? 'id-ID';
      if (voice) utter.voice = voice;
      const onDone = () => {
        if (autoPlayRef.current) speakFrom(list, index + 1);
      };
      utter.onend = onDone;
      utter.onerror = onDone;
      window.speechSynthesis.speak(utter);
    });
  }

  function toggleSpeakTafsir() {
    if (speakIndex !== null) {
      stopSpeak();
      return;
    }
    if (!ayat || ayat.length === 0) return;
    autoPlayRef.current = true;
    speakFrom(ayat, 0);
  }

  async function tampilkan() {
    stopSpeak();
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTafsir(surahNumber, edition);
      setAyat(res.ayat);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil tafsir');
      setAyat(null);
    } finally {
      setLoading(false);
    }
  }

  const currentSurah = surahList.find((s) => s.number === surahNumber);

  return (
    <div>
      <p className="form-hint" style={{ marginBottom: '1rem' }}>
        Tafsir diambil dari API publik{' '}
        <a href="https://alquran.cloud" target="_blank" rel="noopener noreferrer">
          alquran.cloud
        </a>
        . Tombol "🔊 Bacakan & Lanjut" membacakan tafsirnya ayat demi ayat secara berurutan.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div className="form-field" style={{ margin: 0, minWidth: '14rem' }}>
          <label htmlFor="kisah-surah">Surah</label>
          <select
            id="kisah-surah"
            value={surahNumber}
            onChange={(e) => setSurahNumber(Number(e.target.value))}
            disabled={surahLoading}
          >
            {surahList.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.englishName} ({s.numberOfAyahs} ayat)
              </option>
            ))}
          </select>
        </div>
        <div className="form-field" style={{ margin: 0, minWidth: '16rem' }}>
          <label htmlFor="kisah-tafsir-edisi">Tafsir menurut</label>
          <select id="kisah-tafsir-edisi" value={edition} onChange={(e) => setEdition(e.target.value)}>
            {TAFSIR_EDITIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => void tampilkan()} disabled={loading || surahLoading}>
          {loading ? '⏳ Memuat…' : '📖 Tampilkan'}
        </button>
        {ayat && ayat.length > 0 && (
          <button
            type="button"
            className={`btn btn--sm ${speakIndex !== null ? 'btn--danger' : 'btn--secondary'}`}
            onClick={toggleSpeakTafsir}
            title="Bacakan tafsirnya ayat demi ayat"
          >
            {speakIndex !== null ? '⏹️ Stop' : '🔊 Bacakan & Lanjut'}
          </button>
        )}
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {ayat && (
        <div>
          {currentSurah && (
            <h3 style={{ color: '#0f172a', marginBottom: '0.75rem' }}>
              {currentSurah.number}. {currentSurah.englishName} — {currentSurah.name}
            </h3>
          )}
          {ayat.map((a, i) => (
            <div
              key={a.numberInSurah}
              style={{
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #f1f5f9',
                background: speakIndex === i ? '#eff6ff' : 'transparent',
              }}
            >
              <div style={{ fontSize: '1.3rem', direction: 'rtl', lineHeight: 1.9, marginBottom: '0.4rem' }}>
                {a.arab} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>({a.numberInSurah})</span>
              </div>
              <p style={{ margin: 0, color: '#334155', fontSize: '0.9rem' }}>{a.tafsir}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function KisahPage() {
  const [kategori, setKategori] = useState<KategoriId>('sirah');

  return (
    <ListPageShell title="Kisah" subtitle="Sirah Nabawiyah, kisah para nabi, peperangan, hadits, dan tafsir">
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {KATEGORI.map((k) => (
            <button
              key={k.id}
              type="button"
              className={`btn btn--sm ${kategori === k.id ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setKategori(k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: '860px' }}>
          {kategori === 'sirah' && <KisahEntryList items={SIRAH_NABAWIYAH} />}
          {kategori === 'nabi' && <KisahEntryList items={KISAH_25_NABI} />}
          {kategori === 'perang' && <KisahEntryList items={PERANG_RASULULLAH} />}
          {kategori === 'karbala' && <KisahEntryList items={KISAH_KARBALA} />}
          {kategori === 'hadits' && <HaditsSection />}
          {kategori === 'tafsir' && <TafsirSection />}
        </div>
      </div>
    </ListPageShell>
  );
}
