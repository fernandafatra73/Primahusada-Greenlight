import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { MasjidGallery } from '../components/MasjidGallery.tsx';
import { AZAN_TRACKS, playAzanTrack, stopSound } from '../lib/azanTracks.ts';
import { fetchPrayerTimes, type PrayerTime } from '../lib/prayerTimes.ts';
import '../components/ui/ui.css';

interface Alarm {
  readonly id: string;
  readonly time: string;
  readonly label: string;
  readonly enabled: boolean;
}

const CUSTOM_SOUND_ID = 'custom';

const ALARMS_KEY = 'jam-alarms';
const LOKASI_KEY = 'jam-lokasi-sholat';
const SOUND_ID_KEY = 'jam-suara-terpilih';
const CUSTOM_SOUND_KEY = 'jam-suara-custom';
const AZAN_URUTAN_INDEX_KEY = 'jam-azan-urutan-index';
const OFFSET_MS_KEY = 'jam-offset-ms';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format untuk value <input type="datetime-local">: "YYYY-MM-DDTHH:mm:ss". */
function toDatetimeLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Penyimpanan browser penuh/diblokir — pengaturan cukup berlaku untuk sesi ini saja.
  }
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function todayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function JamPage() {
  // Browser tidak bisa mengubah jam sistem — "menyetel jam" di sini berarti
  // menyimpan selisih (offset) terhadap jam sistem, lalu menerapkannya ke
  // semua perhitungan waktu di halaman ini (alarm, azan, dst).
  const [offsetMs, setOffsetMs] = useState(() => loadJson(OFFSET_MS_KEY, 0));
  const [now, setNow] = useState(() => new Date(Date.now() + offsetMs));
  useEffect(() => {
    // Diset langsung (bukan cuma lewat interval) supaya perubahan offset —
    // mis. setelah "Setel Jam" atau "Samakan dengan Jam Sistem" — langsung
    // terlihat, tidak menunggu tik interval berikutnya (sampai 1 detik).
    setNow(new Date(Date.now() + offsetMs));
    const id = window.setInterval(() => setNow(new Date(Date.now() + offsetMs)), 1000);
    return () => window.clearInterval(id);
  }, [offsetMs]);

  const [editingClock, setEditingClock] = useState(false);
  const [clockDraft, setClockDraft] = useState('');

  function openEditClock() {
    setClockDraft(toDatetimeLocalValue(now));
    setEditingClock(true);
  }

  function saveClock(e: FormEvent) {
    e.preventDefault();
    const chosen = new Date(clockDraft);
    if (isNaN(chosen.getTime())) return;
    const nextOffset = chosen.getTime() - Date.now();
    setOffsetMs(nextOffset);
    saveJson(OFFSET_MS_KEY, nextOffset);
    setEditingClock(false);
  }

  function resetClock() {
    setOffsetMs(0);
    saveJson(OFFSET_MS_KEY, 0);
    setEditingClock(false);
  }

  // ── Suara alarm & azan (dipakai bersama oleh Alarm dan jadwal sholat) ───
  const [soundId, setSoundId] = useState(() => loadJson(SOUND_ID_KEY, AZAN_TRACKS[0]!.id));
  const [customSound, setCustomSound] = useState<string | null>(() => loadJson(CUSTOM_SOUND_KEY, null));

  function changeSoundId(id: string) {
    setSoundId(id);
    saveJson(SOUND_ID_KEY, id);
  }

  function handleCustomSoundChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setCustomSound(reader.result);
      saveJson(CUSTOM_SOUND_KEY, reader.result);
      changeSoundId(CUSTOM_SOUND_ID);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [soundPlaying, setSoundPlaying] = useState(false);

  const stopCurrentSound = useCallback(() => {
    stopSound(currentAudioRef.current);
    currentAudioRef.current = null;
    setSoundPlaying(false);
  }, []);

  const playSoundById = useCallback(
    (id: string) => {
      stopSound(currentAudioRef.current);
      const audio = id === CUSTOM_SOUND_ID && customSound ? new Audio(customSound) : playAzanTrack(id);
      if (id === CUSTOM_SOUND_ID && customSound) void audio.play();
      currentAudioRef.current = audio;
      setSoundPlaying(true);
      audio.addEventListener('ended', () => {
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
          setSoundPlaying(false);
        }
      });
      return audio;
    },
    [customSound],
  );

  const playSelectedSound = useCallback(() => playSoundById(soundId), [playSoundById, soundId]);

  // Ref supaya efek pemicu di bawah tidak perlu daftar ulang tiap kali
  // suara diganti — hanya boleh berjalan ulang saat waktu/data berubah.
  const playSelectedSoundRef = useRef(playSelectedSound);
  playSelectedSoundRef.current = playSelectedSound;

  // Azan waktu sholat berbunyi bergiliran mengikuti urutan Azan 1..9 (lalu
  // ulang dari awal) tiap kali jadwal sholat berikutnya masuk — bukan selalu
  // rekaman yang sama. Indeksnya disimpan supaya urutannya lanjut walau
  // halaman dimuat ulang.
  const playNextAzanInSequence = useCallback(() => {
    const idx = loadJson(AZAN_URUTAN_INDEX_KEY, 0) % AZAN_TRACKS.length;
    const track = AZAN_TRACKS[idx]!;
    playSoundById(track.id);
    saveJson(AZAN_URUTAN_INDEX_KEY, (idx + 1) % AZAN_TRACKS.length);
    return track;
  }, [playSoundById]);

  const playNextAzanInSequenceRef = useRef(playNextAzanInSequence);
  playNextAzanInSequenceRef.current = playNextAzanInSequence;

  // ── Alarm ──────────────────────────────────────────────────────────────
  const [alarms, setAlarms] = useState<readonly Alarm[]>(() => loadJson(ALARMS_KEY, []));
  const [alarmTime, setAlarmTime] = useState('06:00');
  const [alarmLabel, setAlarmLabel] = useState('');
  const [alarmRinging, setAlarmRinging] = useState<Alarm | null>(null);
  const firedAlarmKeyRef = useRef<string | null>(null);

  useEffect(() => saveJson(ALARMS_KEY, alarms), [alarms]);

  function addAlarm(e: FormEvent) {
    e.preventDefault();
    setAlarms((prev) => [...prev, { id: newId(), time: alarmTime, label: alarmLabel.trim(), enabled: true }]);
    setAlarmLabel('');
  }

  function toggleAlarm(id: string) {
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  }

  function removeAlarm(id: string) {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  }

  useEffect(() => {
    const hhmm = now.toTimeString().slice(0, 5);
    const match = alarms.find((a) => a.enabled && a.time === hhmm);
    const key = match ? `${todayKey(now)}-${match.id}-${hhmm}` : null;
    if (match && key && firedAlarmKeyRef.current !== key) {
      firedAlarmKeyRef.current = key;
      playSelectedSoundRef.current();
      setAlarmRinging(match);
    }
  }, [now, alarms]);

  // ── Jadwal sholat & azan ──────────────────────────────────────────────
  const [lokasi, setLokasi] = useState(() => loadJson(LOKASI_KEY, { city: 'Jakarta', country: 'Indonesia' }));
  const [lokasiForm, setLokasiForm] = useState(lokasi);
  const [prayerTimes, setPrayerTimes] = useState<readonly PrayerTime[]>([]);
  const [prayerLoading, setPrayerLoading] = useState(true);
  const [prayerError, setPrayerError] = useState<string | null>(null);
  const [azanRinging, setAzanRinging] = useState<PrayerTime | null>(null);
  const [azanRingingTrackLabel, setAzanRingingTrackLabel] = useState<string | null>(null);
  const firedAzanKeyRef = useRef<string | null>(null);

  const loadPrayerTimes = useCallback(async (loc: { city: string; country: string }) => {
    setPrayerLoading(true);
    setPrayerError(null);
    try {
      const items = await fetchPrayerTimes(loc.city, loc.country);
      setPrayerTimes(items);
    } catch (err: unknown) {
      setPrayerError(err instanceof Error ? err.message : 'Gagal mengambil jadwal sholat');
    } finally {
      setPrayerLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrayerTimes(lokasi);
  }, [lokasi, loadPrayerTimes]);

  // Muat ulang otomatis begitu berganti hari, supaya jadwalnya tetap hari ini.
  const lastFetchedDateRef = useRef(todayKey(now));
  useEffect(() => {
    const today = todayKey(now);
    if (today !== lastFetchedDateRef.current) {
      lastFetchedDateRef.current = today;
      void loadPrayerTimes(lokasi);
    }
  }, [now, lokasi, loadPrayerTimes]);

  function applyLokasi(e: FormEvent) {
    e.preventDefault();
    setLokasi(lokasiForm);
    saveJson(LOKASI_KEY, lokasiForm);
  }

  useEffect(() => {
    if (prayerTimes.length === 0) return;
    const hhmm = now.toTimeString().slice(0, 5);
    const match = prayerTimes.find((p) => p.time === hhmm);
    const key = match ? `${todayKey(now)}-${match.id}` : null;
    if (match && key && firedAzanKeyRef.current !== key) {
      firedAzanKeyRef.current = key;
      const track = playNextAzanInSequenceRef.current();
      setAzanRinging(match);
      setAzanRingingTrackLabel(track.label);
    }
  }, [now, prayerTimes]);

  const nextPrayer = useMemo(() => {
    const hhmm = now.toTimeString().slice(0, 5);
    return prayerTimes.find((p) => p.time > hhmm) ?? prayerTimes[0] ?? null;
  }, [now, prayerTimes]);

  const soundPicker = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>🕌 Suara alarm</span>
      <select
        value={soundId}
        onChange={(e) => changeSoundId(e.target.value)}
        style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
      >
        {AZAN_TRACKS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
        {customSound && <option value={CUSTOM_SOUND_ID}>🎧 File saya</option>}
      </select>
      <label className="btn btn--sm btn--secondary" style={{ cursor: 'pointer', margin: 0 }}>
        📁 Unggah azan lain
        <input type="file" accept="audio/*" onChange={handleCustomSoundChange} style={{ display: 'none' }} />
      </label>
      <button type="button" className="btn btn--sm btn--secondary" onClick={playSelectedSound}>
        ▶️ Coba
      </button>
      {soundPlaying && (
        <button type="button" className="btn btn--sm btn--danger" onClick={stopCurrentSound}>
          ⏹️ Stop
        </button>
      )}
    </div>
  );

  return (
    <>
      <ListPageShell title="Jam" subtitle="Jam digital, alarm azan, dan jadwal sholat dengan azan otomatis">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: '1.25rem' }}>
          {/* ── Kolom kiri: jam digital & alarm ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                background: '#0f172a',
                color: '#fff',
                borderRadius: '10px',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '3.2rem',
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.05em',
                }}
              >
                {now.toLocaleTimeString('id-ID', { hour12: false })}
              </div>
              <div style={{ color: '#cbd5e1', marginTop: '0.25rem' }}>
                {now.toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>

              {!editingClock ? (
                <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                  <button type="button" className="btn btn--sm btn--secondary" onClick={openEditClock}>
                    ✏️ Setel Jam
                  </button>
                  {offsetMs !== 0 && (
                    <button type="button" className="btn btn--sm btn--secondary" onClick={resetClock}>
                      ↺ Samakan dengan Jam Sistem
                    </button>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={saveClock}
                  style={{
                    marginTop: '0.85rem',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <input
                    type="datetime-local"
                    step="1"
                    required
                    value={clockDraft}
                    onChange={(e) => setClockDraft(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <button type="submit" className="btn btn--sm btn--primary">
                    Simpan
                  </button>
                  <button type="button" className="btn btn--sm btn--secondary" onClick={() => setEditingClock(false)}>
                    Batal
                  </button>
                </form>
              )}

              {offsetMs !== 0 && !editingClock && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                  Jam disetel manual ({offsetMs > 0 ? '+' : ''}
                  {Math.round(offsetMs / 60000)} menit dari jam sistem)
                </div>
              )}
            </div>

            {alarmRinging && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span>
                  ⏰ Alarm{alarmRinging.label ? ` — ${alarmRinging.label}` : ''} ({alarmRinging.time})
                </span>
                <button
                  type="button"
                  className="btn btn--sm btn--secondary"
                  onClick={() => {
                    stopCurrentSound();
                    setAlarmRinging(null);
                  }}
                >
                  ⏹️ Stop Azan
                </button>
              </div>
            )}

            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>⏰ Alarm</div>

              <form
                onSubmit={addAlarm}
                style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.85rem' }}
              >
                <div className="form-field" style={{ margin: 0 }}>
                  <label htmlFor="jam-alarm-time">Jam</label>
                  <input
                    id="jam-alarm-time"
                    type="time"
                    required
                    value={alarmTime}
                    onChange={(e) => setAlarmTime(e.target.value)}
                  />
                </div>
                <div className="form-field" style={{ margin: 0, flex: '1 1 160px' }}>
                  <label htmlFor="jam-alarm-label">Label</label>
                  <input
                    id="jam-alarm-label"
                    value={alarmLabel}
                    onChange={(e) => setAlarmLabel(e.target.value)}
                    placeholder="Opsional, mis. Minum obat"
                  />
                </div>
                <button type="submit" className="btn btn--sm btn--primary">
                  + Tambah Alarm
                </button>
              </form>

              <div style={{ marginBottom: '0.85rem' }}>{soundPicker}</div>

              {alarms.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Belum ada alarm.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5rem' }}>Jam</th>
                      <th>Label</th>
                      <th style={{ width: '9rem' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...alarms]
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((a) => (
                        <tr key={a.id} style={{ opacity: a.enabled ? 1 : 0.5 }}>
                          <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{a.time}</td>
                          <td>{a.label || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn btn--sm btn--secondary"
                                onClick={() => toggleAlarm(a.id)}
                                title={a.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                              >
                                {a.enabled ? '🔔' : '🔕'}
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm btn--danger"
                                onClick={() => removeAlarm(a.id)}
                                title="Hapus alarm"
                              >
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
          </div>

          {/* ── Kolom kanan: jadwal sholat, azan, & galeri masjid ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {azanRinging && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: '#dcfce7',
                  color: '#15803d',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span>
                  🕌 Waktu {azanRinging.id} telah masuk ({azanRinging.time})
                  {azanRingingTrackLabel ? ` — ${azanRingingTrackLabel}` : ''}
                </span>
                <button
                  type="button"
                  className="btn btn--sm btn--secondary"
                  onClick={() => {
                    stopCurrentSound();
                    setAzanRinging(null);
                  }}
                >
                  ⏹️ Stop Azan
                </button>
              </div>
            )}

            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0f172a' }}>🕌 Jadwal Sholat — {lokasi.city}</div>
                <form onSubmit={applyLokasi} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <input
                    value={lokasiForm.city}
                    onChange={(e) => setLokasiForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Kota"
                    style={{ width: '8rem', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <input
                    value={lokasiForm.country}
                    onChange={(e) => setLokasiForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="Negara"
                    style={{ width: '8rem', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <button type="submit" className="btn btn--sm btn--secondary">
                    Terapkan
                  </button>
                </form>
              </div>

              {prayerError && <div className="alert alert--error" style={{ marginBottom: '0.75rem' }}>{prayerError}</div>}

              {prayerLoading ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Memuat jadwal…</p>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {prayerTimes.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        flex: '1 1 90px',
                        textAlign: 'center',
                        padding: '0.6rem 0.4rem',
                        borderRadius: '8px',
                        background: nextPrayer?.id === p.id ? '#0f172a' : '#f1f5f9',
                        color: nextPrayer?.id === p.id ? '#fff' : '#0f172a',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{p.label}</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        {p.time}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="form-hint" style={{ margin: 0 }}>
                Azan berbunyi otomatis tiap masuk waktu sholat, bergiliran sesuai urutan Azan 1 → Azan{' '}
                {AZAN_TRACKS.length} lalu berulang dari awal — bukan rekaman yang sama terus-menerus.
              </p>
            </div>

            <MasjidGallery />
          </div>
        </div>
      </ListPageShell>
    </>
  );
}
