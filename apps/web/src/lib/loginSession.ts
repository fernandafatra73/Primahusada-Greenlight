/**
 * Pencatatan sesi login untuk Mega Data > Tabel-login: satu baris per login,
 * foto webcam otomatis, dan tanda aktif berkala untuk menghitung durasi buka.
 * Semuanya "best effort": gagal mencatat tidak boleh menghalangi pemakaian aplikasi.
 */

import { useEffect } from 'react';
import { apiPost, apiPut } from './api.ts';
import type { AuthUser } from './auth.ts';

const SESSION_KEY = 'labprima.loginLogId';
const INTERVAL_TANDA_AKTIF_MS = 60_000;
const LEBAR_FOTO = 480;
const MUTU_JPEG = 0.8;
// Beri kamera waktu menyesuaikan cahaya; frame pertama sering gelap.
const JEDA_KAMERA_MS = 1200;

function bacaLogId(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function simpanLogId(id: string | null): void {
  try {
    if (id) window.sessionStorage.setItem(SESSION_KEY, id);
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // sessionStorage bisa diblokir; sesi tetap tercatat, hanya durasinya tidak diperbarui.
  }
}

/** Ambil satu foto dari webcam tanpa menampilkan apa pun; null bila kamera tidak ada atau ditolak. */
export async function ambilFotoWebcam(): Promise<string | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await new Promise((resolve) => window.setTimeout(resolve, JEDA_KAMERA_MS));
    if (!video.videoWidth) return null;

    const canvas = document.createElement('canvas');
    canvas.width = LEBAR_FOTO;
    canvas.height = Math.round(video.videoHeight * (LEBAR_FOTO / video.videoWidth));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', MUTU_JPEG);
  } catch {
    return null;
  } finally {
    // Wajib dihentikan supaya lampu kamera mati.
    for (const track of stream?.getTracks() ?? []) track.stop();
  }
}

/** Dipanggil tepat setelah login berhasil. */
export async function catatLogin(user: AuthUser): Promise<void> {
  try {
    const res = await apiPost<{ item: { id: string } }>('/api/login-log', {
      staffId: user.id,
      nama: user.nama,
      email: user.email,
    });
    simpanLogId(res.item.id);
    const foto = await ambilFotoWebcam();
    if (foto) await apiPut(`/api/login-log/${res.item.id}/foto`, { foto });
  } catch {
    // Riwayat login bersifat tambahan; kegagalan di sini tidak boleh mengganggu login.
  }
}

async function kirimTandaAktif(selesai: boolean): Promise<void> {
  const id = bacaLogId();
  if (!id) return;
  try {
    await apiPost(`/api/login-log/${id}/aktif`, { selesai });
  } catch {
    // Dicoba lagi pada interval berikutnya.
  }
}

/** Dipanggil saat logout (manual atau karena tidak aktif). */
export async function akhiriSesiLogin(): Promise<void> {
  await kirimTandaAktif(true);
  simpanLogId(null);
}

/** Selama `aktif`, kirim tanda aktif tiap menit dan sekali lagi saat jendela ditutup. */
export function useTandaAktifLogin(aktif: boolean): void {
  useEffect(() => {
    if (!aktif) return undefined;
    const id = window.setInterval(() => void kirimTandaAktif(false), INTERVAL_TANDA_AKTIF_MS);
    function saatDitutup(): void {
      const logId = bacaLogId();
      if (!logId) return;
      // sendBeacon tetap terkirim walau halaman sedang ditutup, tidak seperti fetch biasa.
      navigator.sendBeacon(
        `/api/login-log/${logId}/aktif`,
        new Blob([JSON.stringify({ selesai: false })], { type: 'application/json' }),
      );
    }
    window.addEventListener('pagehide', saatDitutup);
    return (): void => {
      window.clearInterval(id);
      window.removeEventListener('pagehide', saatDitutup);
    };
  }, [aktif]);
}
