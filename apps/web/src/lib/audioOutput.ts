declare global {
  interface Window {
    /** Ada hanya saat berjalan di dalam aplikasi desktop (Electron) — lihat
     * apps/desktop/electron/preload.cjs. Tidak ada saat dibuka di browser biasa. */
    electronDesktop?: {
      openBluetoothSettings: () => Promise<void>;
    };
  }
}

export interface AudioOutputDevice {
  readonly deviceId: string;
  readonly label: string;
}

/** Elemen <audio>/<video> yang mendukung `setSinkId` (Chromium) untuk memilih
 * perangkat output — belum masuk lib.dom.d.ts bawaan TypeScript. */
export interface MediaElementWithSinkId extends HTMLMediaElement {
  setSinkId(sinkId: string): Promise<void>;
}

export function supportsSinkId(el: HTMLMediaElement): el is MediaElementWithSinkId {
  return typeof (el as Partial<MediaElementWithSinkId>).setSinkId === 'function';
}

/** Mendaftar perangkat output audio yang sudah dikenal Windows (termasuk
 * speaker/headset Bluetooth yang SUDAH dipasangkan). Ini tidak bisa mencari
 * perangkat Bluetooth baru — pemasangan awal wajib lewat pengaturan OS,
 * lihat `openBluetoothSettings`. */
export async function listAudioOutputDevices(): Promise<readonly AudioOutputDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    throw new Error('Browser ini tidak mendukung pemilihan perangkat audio.');
  }
  try {
    // Chromium menyembunyikan label perangkat sampai ada izin media yang pernah
    // diberikan di origin ini — minta sebentar lalu langsung matikan mic-nya.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // Ditolak/tidak ada mic — lanjut saja, labelnya mungkin kosong.
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === 'audiooutput')
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Perangkat audio ${i + 1}` }));
}

/** Mengarahkan output elemen media ke perangkat tertentu (mis. speaker
 * Bluetooth yang dipilih pengguna). `deviceId: ''` mengembalikan ke default. */
export async function setMediaOutputDevice(el: HTMLMediaElement | null, deviceId: string): Promise<void> {
  if (!el) return;
  if (!supportsSinkId(el)) {
    throw new Error('Browser ini tidak mendukung pemilihan output audio (setSinkId).');
  }
  await el.setSinkId(deviceId);
}

/** Membuka panel "Bluetooth & devices" bawaan Windows untuk mencari &
 * memasangkan perangkat baru. Hanya berfungsi di aplikasi desktop — di
 * browser biasa, web page tidak diizinkan membuka pengaturan OS. */
export function canOpenBluetoothSettings(): boolean {
  return typeof window.electronDesktop?.openBluetoothSettings === 'function';
}

export async function openBluetoothSettings(): Promise<void> {
  if (!window.electronDesktop) {
    throw new Error('Fitur ini hanya tersedia di aplikasi desktop Klinik Prima Husada.');
  }
  await window.electronDesktop.openBluetoothSettings();
}
