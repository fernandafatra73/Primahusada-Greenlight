import { useState } from 'react';
import {
  canOpenBluetoothSettings,
  listAudioOutputDevices,
  openBluetoothSettings,
  type AudioOutputDevice,
} from '../lib/audioOutput.ts';
import { useKaraokePlayer } from '../context/KaraokePlayerContext.tsx';

/** Panel pemilihan speaker Bluetooth untuk halaman Bernyanyi.
 *
 * Browser tidak bisa memasangkan perangkat audio Bluetooth baru (itu urusan
 * OS) — tombol "Cari & Pasangkan" hanya membuka panel Bluetooth Windows di
 * aplikasi desktop. Yang benar-benar bisa dilakukan dari sini: mendaftar
 * speaker/headset yang SUDAH dipasangkan, lalu mengarahkan suara karaoke ke
 * salah satunya. */
export function BluetoothAudioPanel() {
  const { outputDeviceId, setOutputDeviceId } = useKaraokePlayer();
  const [devices, setDevices] = useState<readonly AudioOutputDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function scanDevices() {
    setScanning(true);
    setError(null);
    setInfo(null);
    try {
      const list = await listAudioOutputDevices();
      setDevices(list);
      if (list.length === 0) {
        setInfo('Belum ada speaker/headset yang terdaftar di Windows.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membaca daftar perangkat audio');
    } finally {
      setScanning(false);
    }
  }

  async function handlePasangkan() {
    setError(null);
    setInfo(null);
    if (!canOpenBluetoothSettings()) {
      setInfo(
        'Pemasangan Bluetooth baru harus lewat pengaturan OS: di Windows buka Pengaturan → Bluetooth & perangkat, di HP buka Pengaturan → Bluetooth. Setelah tersambung, klik "🔍 Cari Perangkat" di sini untuk memilihnya.',
      );
      return;
    }
    try {
      await openBluetoothSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuka pengaturan Bluetooth');
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
        padding: '0.75rem 1rem',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        marginBottom: '1.25rem',
      }}
    >
      <span style={{ fontWeight: 700, color: '#0f172a' }}>🔵 Speaker Bluetooth</span>

      <button type="button" className="btn btn--sm btn--secondary" onClick={handlePasangkan}>
        🔍 Cari &amp; Pasangkan Perangkat Baru
      </button>

      <button type="button" className="btn btn--sm btn--secondary" onClick={() => void scanDevices()} disabled={scanning}>
        {scanning ? '⏳ Memuat…' : '🔄 Muat Daftar Speaker'}
      </button>

      {devices.length > 0 && (
        <select
          value={outputDeviceId}
          onChange={(e) => setOutputDeviceId(e.target.value)}
          style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        >
          <option value="">Speaker/output default</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      )}

      {error && <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>{error}</span>}
      {info && <span style={{ fontSize: '0.8rem', color: '#64748b', flexBasis: '100%' }}>{info}</span>}
    </div>
  );
}
