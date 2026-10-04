import { useEffect, useRef, useState } from 'react';
import logoPrimahusada from '@src/image/logo-primahusada.png';
import { apiGet } from '../lib/api.ts';

// Jadwal di bawah adalah contoh awal: sesuaikan dengan jam layanan klinik yang sebenarnya.
const PROFILE = {
  telepon: '0857-1932-5557',
  pimpinan: 'Fernanda F.F, ST.MM',
  visi: 'Menjadi klinik penunjang diagnostik dan praktek dokter pilihan masyarakat yang cepat, akurat, dan terpercaya.',
  misi: [
    'Menyediakan layanan Roentgen (radiologi) dan laboratorium dengan hasil yang akurat dan tepat waktu.',
    'Menyelenggarakan praktek dokter yang ramah, profesional, dan mengutamakan keselamatan pasien.',
    'Memanfaatkan teknologi informasi agar pendaftaran, pemeriksaan, dan hasil pasien tercatat rapi dan mudah diakses.',
    'Mengembangkan kompetensi tenaga kesehatan secara berkelanjutan.',
  ],
  motto: 'Cepat, Tepat, Sehat Bersama Prima Husada.',
  jadwal: [
    { layanan: 'Roentgen (Radiologi)', hari: 'Senin – Sabtu', jam: '08.00 – 20.00' },
    { layanan: 'Laboratorium', hari: 'Senin – Sabtu', jam: '07.00 – 18.00' },
    { layanan: 'Praktek Dokter', hari: 'Senin – Sabtu', jam: '09.00 – 21.00' },
  ],
} as const;

interface KopSurat {
  readonly namaKlinik: string;
  readonly alamat: string;
  readonly telepon: string;
  readonly logoDataUrl: string | null;
}

interface KopSuratResponse {
  readonly item: KopSurat;
}

const KOP_FALLBACK: KopSurat = {
  namaKlinik: 'KLINIK PRIMA HUSADA',
  alamat: '',
  telepon: PROFILE.telepon,
  logoDataUrl: null,
};

export function LoginProfile() {
  const [open, setOpen] = useState(false);
  const [kop, setKop] = useState<KopSurat>(KOP_FALLBACK);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    // Kop surat diambil dari Pengaturan; bila gagal dimuat pakai nilai bawaan.
    let cancelled = false;
    apiGet<KopSuratResponse>('/api/kop-surat')
      .then((res) => {
        if (!cancelled) setKop(res.item);
      })
      .catch(() => undefined);
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button type="button" className="login-profile__btn" onClick={() => setOpen(true)}>
        Visi, Misi, Motto
      </button>

      {open ? (
        <div className="login-profile__backdrop" onClick={() => setOpen(false)}>
          <div
            className="login-profile"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-profile-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="login-profile__watermark" aria-hidden>
              <img src={logoPrimahusada} alt="" />
              <span>Klinik Prima Husada</span>
            </div>

            <header className="login-profile__kop">
              <img src={kop.logoDataUrl ?? logoPrimahusada} alt="" className="login-profile__kop-logo" />
              <div>
                <h2 id="login-profile-title" className="login-profile__title">{kop.namaKlinik}</h2>
                {kop.alamat ? <p className="login-profile__kop-line">{kop.alamat}</p> : null}
                <p className="login-profile__kop-line">Telp: {kop.telepon}</p>
              </div>
            </header>
            <p className="login-profile__sub">Roentgen, Laboratorium &amp; Praktek Dokter</p>

            <h3>Visi</h3>
            <p>{PROFILE.visi}</p>

            <h3>Misi</h3>
            <ol>
              {PROFILE.misi.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ol>

            <h3>Motto</h3>
            <p className="login-profile__motto">&ldquo;{PROFILE.motto}&rdquo;</p>

            <h3>Jadwal Layanan</h3>
            <table className="login-profile__table">
              <tbody>
                {PROFILE.jadwal.map((j) => (
                  <tr key={j.layanan}>
                    <th scope="row">{j.layanan}</th>
                    <td>{j.hari}</td>
                    <td>{j.jam}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="login-profile__contact">
              Telp: <strong>{PROFILE.telepon}</strong>
              <br />
              Pimpinan Klinik: <strong>{PROFILE.pimpinan}</strong>
            </p>

            <button ref={closeRef} type="button" className="btn btn--primary" onClick={() => setOpen(false)}>
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
