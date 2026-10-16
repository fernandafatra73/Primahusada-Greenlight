import { useEffect, useRef, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { apiPost } from '../lib/api.ts';
import { formatRupiah } from '../lib/format.ts';
import { normalisasiJumlah } from '../lib/kwitansiRows.ts';
import {
  BARIS_KOSONG,
  barisAwalKwitansi2,
  buildKwitansi2PdfData,
  hitungKwitansi2,
  parseHarga,
  untukPembayaranOtomatis,
  type Kwitansi2Baris,
  type Kwitansi2Form,
} from '../lib/kwitansi2Form.ts';
import { terbilangRupiah } from '../lib/terbilang.ts';
import { KwitansiPendaftaranUmumDocument } from '../pdf/KwitansiPendaftaranUmumDocument.tsx';
import './kwitansi2Editor.css';

interface Kwitansi2EditorProps {
  readonly logoSrc: string;
  readonly nomor: string;
  /** Rincian bawaan bila nomor ini belum punya rincian tersimpan. */
  readonly bawaan: readonly { readonly nama: string; readonly harga: number }[];
  /** Isian awal kepala kwitansi; baris diisi dari rincian tersimpan. */
  readonly awal: Omit<Kwitansi2Form, 'baris' | 'untukPembayaran'>;
}

/**
 * Blangko Kwitansi2 yang diketik langsung di tempat. Isian hanya berlaku untuk
 * cetakan ini (tidak disimpan); baris awal diambil dari rincian kwitansi tersimpan.
 */
export function Kwitansi2Editor({ logoSrc, nomor, bawaan, awal }: Kwitansi2EditorProps) {
  const [form, setForm] = useState<Kwitansi2Form>({ ...awal, untukPembayaran: null, baris: barisAwalKwitansi2(bawaan) });
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mengunduh, setMengunduh] = useState(false);
  // `bawaan` dihitung ulang tiap render induk dan hanya dipakai sekali saat memuat.
  const bawaanRef = useRef(bawaan);

  useEffect(() => {
    let batal = false;
    void (async () => {
      try {
        const res = await apiPost<{ items: { nama: string; harga: string }[] }>('/api/kwitansi-rincian/inisialisasi', {
          jenis: 'PENDAFTARAN_UMUM',
          nomor,
          bawaan: bawaanRef.current,
        });
        if (batal) return;
        setForm((f) => ({ ...f, baris: barisAwalKwitansi2(res.items.map((r) => ({ nama: r.nama, harga: Number(r.harga) }))) }));
      } catch (err: unknown) {
        if (!batal) setError(err instanceof Error ? err.message : 'Gagal memuat rincian');
      } finally {
        if (!batal) setMemuat(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, [nomor]);

  function ubah<K extends keyof Kwitansi2Form>(kunci: K, nilai: Kwitansi2Form[K]) {
    setForm((f) => ({ ...f, [kunci]: nilai }));
  }

  function ubahBaris(index: number, kolom: keyof Kwitansi2Baris, nilai: string) {
    setForm((f) => ({ ...f, baris: f.baris.map((b, i) => (i === index ? { ...b, [kolom]: nilai } : b)) }));
  }

  async function unduh() {
    setMengunduh(true);
    try {
      const blob = await pdf(<KwitansiPendaftaranUmumDocument data={buildKwitansi2PdfData(form, logoSrc)} />).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Kwitansi2_${form.noKwitansi}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat PDF');
    } finally {
      setMengunduh(false);
    }
  }

  const { total } = hitungKwitansi2(form.baris);
  const untuk = form.untukPembayaran ?? untukPembayaranOtomatis(form.baris);

  return (
    <div className="k2-wrap">
      <div className="k2-toolbar">
        <span className="k2-hint">
          Klik bagian mana pun pada kwitansi lalu ketik. Isian hanya untuk cetakan ini dan tidak disimpan.
        </span>
        <button type="button" className="btn btn--primary" onClick={() => void unduh()} disabled={mengunduh || memuat}>
          {mengunduh ? 'Membuat PDF…' : '⬇️ Unduh / Cetak Kwitansi'}
        </button>
      </div>
      {error && <div className="alert alert--error">{error}</div>}

      <div className="k2-paper">
        <div className="k2-swoosh k2-swoosh--top" aria-hidden />
        <div className="k2-swoosh k2-swoosh--bottom" aria-hidden />

        <header className="k2-header">
          {logoSrc ? <img src={logoSrc} alt="Logo Prima Husada" className="k2-logo" /> : null}
          <div className="k2-brand">
            <div className="k2-brand__small">KLINIK</div>
            <div className="k2-brand__name">PRIMA HUSADA</div>
            <div className="k2-brand__tagline">
              <span className="k2-brand__bar" />
              Sehat Bersama, Hidup Lebih Baik
            </div>
            <div className="k2-brand__contact">Jl Siliwangi Ruko Palapa No 2 Parung Kuda Sukabumi</div>
            <div className="k2-brand__contact">Telp 0857-1932-5557</div>
          </div>
          <div className="k2-title">
            <div className="k2-title__badge">KWITANSI</div>
            <label className="k2-title__no">
              No. :
              <input
                className="k2-field k2-field--bold"
                value={form.noKwitansi}
                onChange={(e) => ubah('noKwitansi', e.target.value)}
                aria-label="Nomor kwitansi"
              />
            </label>
          </div>
        </header>

        <div className="k2-body">
          <label className="k2-info">
            <span>Sudah terima dari</span>:
            <input
              className="k2-field k2-field--bold"
              value={form.sudahTerimaDari}
              onChange={(e) => ubah('sudahTerimaDari', e.target.value)}
            />
          </label>
          <label className="k2-info">
            <span>Untuk pembayaran</span>:
            <input
              className="k2-field k2-field--bold"
              value={untuk}
              onChange={(e) => ubah('untukPembayaran', e.target.value)}
            />
          </label>
          <label className="k2-info">
            <span>Tanggal</span>:
            <input
              className="k2-field k2-field--bold"
              value={form.tanggal}
              onChange={(e) => ubah('tanggal', e.target.value)}
            />
          </label>

          <table className="k2-table">
            <thead>
              <tr>
                <th className="k2-col-no">No.</th>
                <th>Jenis Layanan / Keterangan</th>
                <th className="k2-col-jumlah">Jumlah</th>
                <th className="k2-col-harga">Harga</th>
              </tr>
            </thead>
            <tbody>
              {form.baris.map((b, i) => {
                const jumlah = normalisasiJumlah(b.jumlah === '' ? undefined : Number(b.jumlah));
                const harga = parseHarga(b.harga);
                return (
                  <tr key={i}>
                    <td className="k2-col-no">{i + 1}</td>
                    <td>
                      <input
                        className="k2-cell"
                        value={b.nama}
                        onChange={(e) => ubahBaris(i, 'nama', e.target.value)}
                        aria-label={`Jenis layanan baris ${i + 1}`}
                      />
                    </td>
                    <td className="k2-col-jumlah">
                      <input
                        className="k2-cell k2-cell--center"
                        value={b.jumlah}
                        inputMode="numeric"
                        onChange={(e) => ubahBaris(i, 'jumlah', e.target.value.replace(/\D/g, ''))}
                        aria-label={`Jumlah baris ${i + 1}`}
                      />
                    </td>
                    <td className="k2-col-harga">
                      <input
                        className="k2-cell k2-cell--right"
                        value={b.harga}
                        inputMode="numeric"
                        placeholder={b.nama ? 'Harga satuan' : ''}
                        onChange={(e) => ubahBaris(i, 'harga', e.target.value)}
                        aria-label={`Harga satuan baris ${i + 1}`}
                      />
                      {jumlah > 1 && harga > 0 && (
                        <div className="k2-subtotal">
                          × {jumlah} = {formatRupiah(harga * jumlah)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="k2-total">
            <button
              type="button"
              className="k2-add"
              onClick={() => setForm((f) => ({ ...f, baris: [...f.baris, BARIS_KOSONG] }))}
            >
              + Baris
            </button>
            <div className="k2-total__label">Total Pembayaran</div>
            <div className="k2-total__value">{formatRupiah(total)}</div>
          </div>

          <div className="k2-bottom">
            <div className="k2-bottom__left">
              <div className="k2-terbilang">
                <em>Terbilang :</em> <strong>{terbilangRupiah(total)}</strong>
              </div>
              <div className="k2-thanks">Terima kasih atas kepercayaan Anda</div>
              <div className="k2-thanks k2-thanks--bold">kepada Klinik Prima Husada</div>
            </div>
            <div className="k2-sign">
              <label>
                Sukabumi,
                <input
                  className="k2-field k2-field--inline"
                  value={form.tanggalTtd}
                  onChange={(e) => ubah('tanggalTtd', e.target.value)}
                  aria-label="Tanggal tanda tangan"
                />
              </label>
              <div>Penerima,</div>
              <label className="k2-sign__name">
                (
                <input
                  className="k2-field k2-field--inline k2-field--bold k2-field--center"
                  value={form.penerima}
                  placeholder="ketik nama admin"
                  onChange={(e) => ubah('penerima', e.target.value)}
                  aria-label="Nama admin penerima"
                />
                )
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
