import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api.ts';
import { readFileAsDataUrl } from '../lib/fotoUpload.ts';

interface TahunSelectProps {
  readonly id: string;
  readonly value: number;
  readonly pilihan: ReadonlyArray<number>;
  readonly onChange: (tahun: number) => void;
}

/** Pilih tahun arsip pemeriksaan. */
export function TahunSelect({
  id,
  value,
  pilihan,
  onChange,
}: TahunSelectProps) {
  return (
    <div className="form-field" style={{ maxWidth: '160px' }}>
      <label htmlFor={id}>Tahun</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {pilihan.map((tahun) => (
          <option key={tahun} value={tahun}>
            {tahun}
          </option>
        ))}
      </select>
    </div>
  );
}

interface KaryawanOption {
  readonly nama: string;
  readonly jabatan: string | null;
}

/** Daftar karyawan (menu Karyawan) untuk saran isian nama; gagal dimuat = tanpa saran. */
export function useDaftarKaryawan(): readonly KaryawanOption[] {
  const [karyawan, setKaryawan] = useState<readonly KaryawanOption[]>([]);
  useEffect(() => {
    let aktif = true;
    apiGet<{ items: KaryawanOption[] }>('/api/karyawan?limit=100')
      .then((res) => {
        if (aktif) setKaryawan(res.items);
      })
      .catch(() => {
        // Saran nama hanya pelengkap; isian tetap bisa diketik manual.
      });
    return () => {
      aktif = false;
    };
  }, []);
  return karyawan;
}

interface TtdTersimpan {
  readonly id: string;
  readonly nama: string;
  readonly logoTandaTangan: string | null;
}

interface TtdTersimpanSelectProps {
  readonly id: string;
  /** Dipanggil dengan data URL tanda tangan dan nama pemiliknya. */
  readonly onPilih: (dataUrl: string, nama: string) => void;
  readonly onError: (pesan: string) => void;
}

/** Ambil tanda tangan dari menu Tanda Tangan Elektronik, untuk dokter yang tidak bisa menggambar langsung. */
export function TtdTersimpanSelect({
  id,
  onPilih,
  onError,
}: TtdTersimpanSelectProps) {
  const [daftar, setDaftar] = useState<readonly TtdTersimpan[]>([]);

  useEffect(() => {
    let aktif = true;
    apiGet<{ items: TtdTersimpan[] }>('/api/tanda-tangan-elektronik?limit=100')
      .then((res) => {
        if (aktif) setDaftar(res.items.filter((item) => item.logoTandaTangan));
      })
      .catch(() => {
        // Tanpa daftar, dokter tetap bisa menggambar tanda tangan langsung.
      });
    return () => {
      aktif = false;
    };
  }, []);

  async function pilih(ttdId: string): Promise<void> {
    const ttd = daftar.find((item) => item.id === ttdId);
    if (!ttd?.logoTandaTangan) return;
    try {
      // Tanda tangan tersimpan bisa berupa data URL atau path upload; API Lisensi hanya menerima data URL.
      const src = ttd.logoTandaTangan;
      const dataUrl = src.startsWith('data:')
        ? src
        : await readFileAsDataUrl(await (await fetch(src)).blob());
      onPilih(dataUrl, ttd.nama);
    } catch (err: unknown) {
      onError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat tanda tangan tersimpan',
      );
    }
  }

  if (daftar.length === 0) return null;
  return (
    <div className="form-field" style={{ maxWidth: '280px' }}>
      <label htmlFor={id}>Atau pakai TTD tersimpan</label>
      <select id={id} value="" onChange={(e) => void pilih(e.target.value)}>
        <option value="">— pilih —</option>
        {daftar.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nama}
          </option>
        ))}
      </select>
    </div>
  );
}
