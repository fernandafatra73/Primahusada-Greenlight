import { useCallback, useEffect, useRef, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.ts';
import { formatRupiah } from '../lib/format.ts';
import { hitungRincianKwitansi } from '../lib/kwitansiRows.ts';
import './ui/ui.css';

export type KwitansiJenis = 'PENDAFTARAN_UMUM' | 'RADIOLOGI' | 'LABORATORIUM' | 'FARMASI';

/** Pilihan nama rincian yang sering dipakai. Ditawarkan lewat datalist, bukan
 * dropdown, supaya nama di luar daftar tetap bisa diketik langsung. */
const PILIHAN_RINCIAN: readonly string[] = [
  'Biaya Pendaftaran',
  'Thorax',
  'BNO',
  'Lumbo-sacral Ap/Lat',
  'Ekstremitas Atas',
  'Ekstremitas Bawah',
];

/** Kategori layanan; memilihnya menampilkan daftar pemeriksaan/item beserta harga dari data master. */
const PILIHAN_KATEGORI = [
  { id: 'radiologi', label: 'Radiologi' },
  { id: 'laboratorium', label: 'Laboratorium' },
  { id: 'farmasi', label: 'Farmasi' },
  { id: 'dokter-umum', label: 'Dokter Umum' },
  { id: 'dokter-spesialis', label: 'Dokter Spesialis' },
] as const;

interface PilihanItem {
  readonly nama: string;
  readonly harga: string;
}

const DAFTAR_PILIHAN_ID = 'kwitansi-rincian-pilihan';

export interface RincianBaris {
  readonly id: string;
  readonly nama: string;
  readonly harga: string;
}

interface KwitansiRincianEditorProps {
  readonly jenis: KwitansiJenis;
  readonly nomor: string;
  /** Rincian bawaan kwitansi ini, dipakai sekali saat nomor ini pertama kali
   * disunting. */
  readonly bawaan: readonly { readonly nama: string; readonly harga: number }[];
  /** Dipanggil setiap rincian berubah, supaya pratinjau ikut menyesuaikan. */
  readonly onChange: (items: readonly { nama: string; harga: number; jumlah?: number }[]) => void;
  /** Tampilkan kolom Jumlah (harga = harga satuan). Jumlah tidak disimpan ke
   * server; hanya berlaku selama editor ini terbuka. */
  readonly tampilkanJumlah?: boolean;
}

export function KwitansiRincianEditor({
  jenis,
  nomor,
  bawaan,
  onChange,
  tampilkanJumlah = false,
}: KwitansiRincianEditorProps) {
  const [items, setItems] = useState<readonly RincianBaris[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [kategori, setKategori] = useState<string>('');
  const [pilihan, setPilihan] = useState<readonly PilihanItem[]>([]);
  const [cari, setCari] = useState('');
  const [memuatPilihan, setMemuatPilihan] = useState(false);
  /** Jumlah per id baris, sebagai teks input; kosong berarti 1. */
  const [jumlahPerBaris, setJumlahPerBaris] = useState<Readonly<Record<string, string>>>({});
  // Ref supaya `kabarkan` membaca jumlah terbaru tanpa menjadi dependensi efek inisialisasi.
  const jumlahRef = useRef(jumlahPerBaris);
  jumlahRef.current = jumlahPerBaris;

  const kabarkan = useCallback(
    (daftar: readonly RincianBaris[]) => {
      onChange(
        daftar.map((b) => {
          const teks = jumlahRef.current[b.id];
          const dasar = { nama: b.nama, harga: Number(b.harga) };
          return teks ? { ...dasar, jumlah: Number(teks) } : dasar;
        }),
      );
    },
    [onChange],
  );

  useEffect(() => {
    let batal = false;
    setLoading(true);
    void (async () => {
      try {
        // Inisialisasi menyalin rincian bawaan hanya bila nomor ini belum
        // pernah disunting; kalau sudah, yang tersimpan yang dipakai.
        const res = await apiPost<{ items: RincianBaris[] }>('/api/kwitansi-rincian/inisialisasi', {
          jenis,
          nomor,
          bawaan,
        });
        if (batal) return;
        setItems(res.items);
        kabarkan(res.items);
        setError(null);
      } catch (err: unknown) {
        if (!batal) setError(err instanceof Error ? err.message : 'Gagal memuat rincian');
      } finally {
        if (!batal) setLoading(false);
      }
    })();
    return () => {
      batal = true;
    };
    // `bawaan` sengaja tidak jadi pemicu: ia dihitung ulang tiap render induk
    // dan hanya dipakai sekali saat inisialisasi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jenis, nomor, kabarkan]);

  async function ubahBaris(id: string, nama: string, harga: string) {
    const sebelum = items;
    const sesudah = items.map((b) => (b.id === id ? { ...b, nama, harga } : b));
    setItems(sesudah);
    kabarkan(sesudah);
    try {
      await apiPatch(`/api/kwitansi-rincian/${id}`, { nama, harga });
      setError(null);
    } catch (err: unknown) {
      // Kembalikan ke nilai terakhir yang diterima server, supaya yang tampil
      // tidak berbeda dari yang tersimpan.
      setItems(sebelum);
      kabarkan(sebelum);
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan');
    }
  }

  async function pilihKategori(id: string) {
    setKategori(id);
    setCari('');
    setPilihan([]);
    if (!id) return;
    setMemuatPilihan(true);
    try {
      const res = await apiGet<{ items: PilihanItem[] }>(
        `/api/kwitansi-rincian/pilihan?kategori=${id}`,
      );
      setPilihan(res.items);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar pilihan');
    } finally {
      setMemuatPilihan(false);
    }
  }

  async function pilihItem(nilai: string) {
    setCari(nilai);
    const item = pilihan.find((p) => p.nama === nilai);
    if (!item) return;
    await tambahBaris(item.nama, Number(item.harga));
    setCari('');
  }

  async function tambahBaris(nama = 'Rincian baru', harga = 0) {
    setSibuk(true);
    try {
      const res = await apiPost<{ item: RincianBaris }>('/api/kwitansi-rincian', {
        jenis,
        nomor,
        nama,
        harga,
      });
      const sesudah = [...items, res.item];
      setItems(sesudah);
      kabarkan(sesudah);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menambah rincian');
    } finally {
      setSibuk(false);
    }
  }

  async function hapusBaris(id: string) {
    setSibuk(true);
    try {
      await apiDelete(`/api/kwitansi-rincian/${id}`);
      const sesudah = items.filter((b) => b.id !== id);
      setItems(sesudah);
      kabarkan(sesudah);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus rincian');
    } finally {
      setSibuk(false);
    }
  }

  const total = tampilkanJumlah
    ? hitungRincianKwitansi(
        items.map((b) => ({ nama: b.nama, harga: Number(b.harga), jumlah: Number(jumlahPerBaris[b.id] || 1) })),
      ).total
    : items.reduce((jumlah, b) => jumlah + Number(b.harga), 0);

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '0.75rem 0.9rem',
        marginBottom: '0.75rem',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <strong style={{ fontSize: '0.92rem' }}>Rincian Kwitansi</strong>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <select
            value={kategori}
            onChange={(e) => void pilihKategori(e.target.value)}
            disabled={sibuk || loading}
            aria-label="Kategori layanan"
            style={{ padding: '0.2rem 0.4rem' }}
          >
            <option value="">Pilih kategori…</option>
            {PILIHAN_KATEGORI.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => void tambahBaris()}
            disabled={sibuk || loading}
          >
            + Tambah Baris
          </button>
        </div>
      </div>

      {kategori && (
        <div style={{ marginBottom: '0.5rem' }}>
          <input
            list="kwitansi-rincian-master"
            value={cari}
            onChange={(e) => void pilihItem(e.target.value)}
            disabled={sibuk || loading || memuatPilihan}
            placeholder={memuatPilihan ? 'Memuat daftar…' : 'Cari dan pilih pemeriksaan / item…'}
            aria-label="Pilih pemeriksaan atau item"
            style={{ width: '100%', padding: '0.3rem 0.5rem' }}
          />
          <datalist id="kwitansi-rincian-master">
            {pilihan.map((p) => (
              <option key={p.nama} value={p.nama}>
                {formatRupiah(Number(p.harga))}
              </option>
            ))}
          </datalist>
          {!memuatPilihan && pilihan.length === 0 && (
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Belum ada data untuk kategori ini.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="alert alert--error" style={{ marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Memuat rincian…</p>
      ) : items.length === 0 ? (
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
          Belum ada rincian. Klik "+ Tambah Baris".
        </p>
      ) : (
        <table className="table table--compact" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Nama Rincian</th>
              {tampilkanJumlah && <th style={{ width: '5rem' }}>Jumlah</th>}
              <th style={{ width: '9rem' }}>{tampilkanJumlah ? 'Harga Satuan' : 'Harga'}</th>
              <th style={{ width: '3rem' }} />
            </tr>
          </thead>
          <tbody>
            {items.map((baris) => (
              <tr key={baris.id}>
                <td>
                  <input
                    list={DAFTAR_PILIHAN_ID}
                    value={baris.nama}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((b) => (b.id === baris.id ? { ...b, nama: e.target.value } : b)),
                      )
                    }
                    onBlur={(e) => void ubahBaris(baris.id, e.target.value, baris.harga)}
                    aria-label={`Nama rincian ${baris.nama}`}
                    style={{ width: '100%', padding: '0.2rem 0.4rem' }}
                  />
                </td>
                {tampilkanJumlah && (
                  <td>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={jumlahPerBaris[baris.id] ?? '1'}
                      onChange={(e) => {
                        const teks = e.target.value;
                        setJumlahPerBaris((prev) => ({ ...prev, [baris.id]: teks }));
                      }}
                      onBlur={() => kabarkan(items)}
                      aria-label={`Jumlah ${baris.nama}`}
                      style={{ width: '100%', padding: '0.2rem 0.4rem', textAlign: 'center' }}
                    />
                  </td>
                )}
                <td>
                  <input
                    value={baris.harga}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((b) => (b.id === baris.id ? { ...b, harga: e.target.value } : b)),
                      )
                    }
                    onBlur={(e) => void ubahBaris(baris.id, baris.nama, e.target.value)}
                    inputMode="numeric"
                    aria-label={`Harga ${baris.nama}`}
                    style={{ width: '100%', padding: '0.2rem 0.4rem', textAlign: 'right' }}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => void hapusBaris(baris.id)}
                    disabled={sibuk}
                    title={`Hapus ${baris.nama}`}
                    style={{ padding: '0.1rem 0.45rem' }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={tampilkanJumlah ? 2 : 1} style={{ fontWeight: 700, textAlign: 'right' }}>
                Total
              </td>
              <td style={{ fontWeight: 700, textAlign: 'right' }}>{formatRupiah(total)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      )}

      <datalist id={DAFTAR_PILIHAN_ID}>
        {PILIHAN_RINCIAN.map((nama) => (
          <option key={nama} value={nama} />
        ))}
      </datalist>

      <p style={{ margin: '0.45rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
        Nama rincian bisa dipilih dari daftar atau diketik sendiri. Perubahan tersimpan otomatis
        dan ikut saat kwitansi dicetak ulang.
        {tampilkanJumlah && ' Jumlah hanya untuk cetakan ini dan kembali ke 1 saat pratinjau ditutup.'}
      </p>
    </div>
  );
}
