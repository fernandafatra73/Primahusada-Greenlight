import type { AppViewId } from './navigation.ts';

// Menu yang tidak aktif sejak login sampai di-"Aktif"-kan lewat tombol Aktivasi.
// Catatan: pemeriksaan password ini hanya di sisi browser (gerbang tampilan menu),
// bukan pengaman data; API tetap dilindungi oleh peran akun masing-masing.
export const ACTIVATION_LOCKED_VIEW_IDS: ReadonlyArray<AppViewId> = ['pengaturan', 'mega-data', 'sosmed'];

const ACTIVATION_PASSWORD = 'Fernanda73/';

export function isActivationLocked(viewId: AppViewId, extrasActive: boolean): boolean {
  return !extrasActive && ACTIVATION_LOCKED_VIEW_IDS.includes(viewId);
}

export function isActivationPasswordValid(input: string): boolean {
  return input === ACTIVATION_PASSWORD;
}
