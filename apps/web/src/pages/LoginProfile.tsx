import { useEffect, useRef, useState } from 'react';

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

export function LoginProfile() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
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
            <h2 id="login-profile-title" className="login-profile__title">Klinik Prima Husada</h2>
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
