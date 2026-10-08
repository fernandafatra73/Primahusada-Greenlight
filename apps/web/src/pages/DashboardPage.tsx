import { useCallback, useEffect, useState } from 'react';
import { WelcomePhoto } from '../components/WelcomePhoto.tsx';
import { KlinikShow } from './KlinikShow.tsx';

// Slide Klinik terbuka sendiri setelah Dashboard tampil selama ini (dan lagi setelah ditutup).
const KLINIK_AUTO_OPEN_MS = 60_000;

export function DashboardPage() {
  const [klinik, setKlinik] = useState(false);
  const closeKlinik = useCallback(() => setKlinik(false), []);

  // Timer berjalan hanya saat slide tertutup dan Dashboard masih terbuka; pindah halaman membatalkannya.
  useEffect(() => {
    if (klinik) return undefined;
    const timer = window.setTimeout(() => setKlinik(true), KLINIK_AUTO_OPEN_MS);
    return () => window.clearTimeout(timer);
  }, [klinik]);

  return (
    <>
      <div className="page-heading">
        <div className="page-heading__title-row">
          <h2 className="page-heading__title">Dashboard</h2>
          <button type="button" className="btn btn--sm btn--secondary" onClick={() => setKlinik(true)}>
            Klinik
          </button>
        </div>
      </div>

      {klinik && <KlinikShow onClose={closeKlinik} />}

      <WelcomePhoto className="dashboard-photo" />
    </>
  );
}
