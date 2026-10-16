export type LoginPresetId = 'umum' | 'radiologi' | 'laboratorium';

/** Tombol pintas di halaman login: membuka panel dengan email akun bagian tersebut sudah terisi. */
export interface LoginPreset {
  readonly id: LoginPresetId;
  /** Teks tombol saat panel tertutup. */
  readonly label: string;
  /** Judul panel login saat preset ini aktif. */
  readonly title: string;
  readonly email: string;
}

// Email harus sama dengan akun di prisma/seed.ts dan seedDesktopTemplate.ts.
export const LOGIN_PRESETS: readonly LoginPreset[] = [
  { id: 'umum', label: 'Login', title: 'Masuk ke sistem', email: 'admin@primahusada.local' },
  {
    id: 'radiologi',
    label: 'Login Radiologi',
    title: 'Masuk — Radiologi',
    email: 'radiologi@primahusada.local',
  },
  {
    id: 'laboratorium',
    label: 'Login Laboratorium',
    title: 'Masuk — Laboratorium',
    email: 'lab@primahusada.local',
  },
];

export interface LoginPanelState {
  readonly open: boolean;
  readonly preset: LoginPresetId;
}

/**
 * Menekan tombol preset yang sedang terbuka menutup panel; tombol lain membuka
 * (atau berpindah ke) preset itu.
 */
export function toggleLoginPanel(state: LoginPanelState, clicked: LoginPresetId): LoginPanelState {
  if (state.open && state.preset === clicked) return { open: false, preset: clicked };
  return { open: true, preset: clicked };
}

export function findLoginPreset(id: LoginPresetId): LoginPreset {
  const preset = LOGIN_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Preset login tidak dikenal: ${id}`);
  return preset;
}
