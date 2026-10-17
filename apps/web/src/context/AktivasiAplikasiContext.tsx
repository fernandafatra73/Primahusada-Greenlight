import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGet } from '../lib/api.ts';
import {
  isAplikasiTerkunci,
  PENGUNCIAN_AKTIVASI_AKTIF,
  statusAktivasi,
  tanggalHariIni,
  type AktivasiAplikasi,
  type StatusAktivasi,
} from '../lib/aktivasiAplikasi.ts';

interface AktivasiAplikasiContextValue {
  readonly aktivasi: AktivasiAplikasi | null;
  readonly status: StatusAktivasi;
  /** True bila status sudah dimuat dan aplikasi belum diaktifkan atau masa aktivasinya berakhir. */
  readonly terkunci: boolean;
  readonly memuat: boolean;
  readonly setAktivasi: (aktivasi: AktivasiAplikasi) => void;
}

const AktivasiAplikasiContext = createContext<AktivasiAplikasiContextValue | null>(null);

// Hari diperiksa ulang tiap menit supaya aplikasi yang dibiarkan terbuka tetap terkunci tepat saat berganti hari.
const INTERVAL_CEK_HARI_MS = 60_000;

export function AktivasiAplikasiProvider({ children }: { readonly children: ReactNode }) {
  const [aktivasi, setAktivasiState] = useState<AktivasiAplikasi | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [gagal, setGagal] = useState(false);
  const [hariIni, setHariIni] = useState(() => tanggalHariIni());

  useEffect(() => {
    let batal = false;
    void (async () => {
      try {
        const res = await apiGet<{ aktivasi: AktivasiAplikasi | null }>('/api/aktivasi-aplikasi');
        if (!batal) setAktivasiState(res.aktivasi);
      } catch {
        // Bila server tidak bisa dihubungi, jangan mengunci: halaman lain juga tidak akan
        // bisa memuat data, dan kunci akan berlaku lagi begitu status berhasil dibaca.
        if (!batal) setGagal(true);
      } finally {
        if (!batal) setMemuat(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setHariIni(tanggalHariIni()), INTERVAL_CEK_HARI_MS);
    return () => window.clearInterval(id);
  }, []);

  const setAktivasi = useCallback((baru: AktivasiAplikasi) => {
    setAktivasiState(baru);
    setGagal(false);
  }, []);

  const value = useMemo(() => {
    const status = statusAktivasi(aktivasi, hariIni);
    return {
      aktivasi,
      status,
      terkunci: PENGUNCIAN_AKTIVASI_AKTIF && !memuat && !gagal && isAplikasiTerkunci(status),
      memuat,
      setAktivasi,
    };
  }, [aktivasi, hariIni, memuat, gagal, setAktivasi]);

  return <AktivasiAplikasiContext.Provider value={value}>{children}</AktivasiAplikasiContext.Provider>;
}

export function useAktivasiAplikasi(): AktivasiAplikasiContextValue {
  const ctx = useContext(AktivasiAplikasiContext);
  if (!ctx) {
    throw new Error('useAktivasiAplikasi must be used within AktivasiAplikasiProvider');
  }
  return ctx;
}
