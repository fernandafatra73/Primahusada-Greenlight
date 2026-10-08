import { useCallback, useState } from 'react';
import { WelcomePhoto } from '../components/WelcomePhoto.tsx';
import { KlinikShow } from './KlinikShow.tsx';

export function DashboardPage() {
  const [klinik, setKlinik] = useState(false);
  const closeKlinik = useCallback(() => setKlinik(false), []);

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
