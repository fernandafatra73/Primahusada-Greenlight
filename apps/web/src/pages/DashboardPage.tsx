import { WelcomePhoto } from '../components/WelcomePhoto.tsx';
import { useCallback, useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import logoPrimahusada from '@src/image/logo-primahusada.png';
import { AnimasiShow } from '../components/AnimasiShow.tsx';
import { baseChartOptions, paletteColors } from '../components/charts/chartTheme.ts';
import { useListRefresh } from '../context/ListRefreshContext.tsx';
import { apiGet } from '../lib/api.ts';

interface DokterPengirimSlice {
  readonly nama: string;
  readonly count: number;
}

interface AlamatSlice {
  readonly alamat: string;
  readonly count: number;
}

interface DashboardResponse {
  readonly charts: {
    readonly dokterPengirim: readonly DokterPengirimSlice[];
    readonly alamat: readonly AlamatSlice[];
  };
}

function horizontalBarOptions(categories: string[], colors: string[], total: number): ApexOptions {
  return {
    ...baseChartOptions(),
    chart: { ...baseChartOptions().chart, type: 'bar' },
    colors,
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: '55%',
        distributed: true,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => {
        const percent = total > 0 ? (val / total) * 100 : 0;
        return `${Math.round(val)} (${percent.toFixed(1)}%)`;
      },
      offsetX: 40,
      style: { fontSize: '12px', fontWeight: 600, colors: ['#1e293b'] },
    },
    xaxis: {
      categories,
      labels: { style: { colors: '#64748b', fontSize: '12px' } },
    },
    yaxis: {
      labels: { style: { colors: '#64748b', fontSize: '12px' } },
    },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
    legend: { show: false },
    tooltip: { y: { formatter: (val: number) => `${Math.round(val)} pasien` } },
  };
}

export function DashboardPage() {
  const { version: listRefreshVersion } = useListRefresh();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [animasi, setAnimasi] = useState(false);
  const [grafik, setGrafik] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await apiGet<DashboardResponse>(`/api/dashboard?_=${Date.now()}`));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat dashboard');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, listRefreshVersion]);

  const dokterPengirim = data?.charts.dokterPengirim ?? [];
  const totalPengirim = dokterPengirim.reduce((sum, d) => sum + d.count, 0);

  const alamat = data?.charts.alamat ?? [];
  const totalAlamat = alamat.reduce((sum, a) => sum + a.count, 0);

  return (
    <>
      <div className="page-heading">
        <div className="page-heading__title-row">
          <h2 className="page-heading__title">Dashboard</h2>
          <button
            type="button"
            className={`btn btn--sm ${animasi ? 'btn--primary' : 'btn--secondary'}`}
            aria-pressed={animasi}
            onClick={() => setAnimasi((on) => !on)}
          >
            Animasi
          </button>
          <button
            type="button"
            className={`btn btn--sm ${grafik ? 'btn--primary' : 'btn--secondary'}`}
            aria-pressed={grafik}
            onClick={() => setGrafik((on) => !on)}
          >
            Grafik
          </button>
        </div>
      </div>

      <WelcomePhoto className="dashboard-photo" />

      {animasi && <AnimasiShow />}

      {!grafik && !animasi && (
        <div className="dashboard-logo">
          <img src={logoPrimahusada} alt="Klinik Prima Husada" className="dashboard-logo__img" />
        </div>
      )}

      {grafik && error && <p className="alert alert--error">{error}</p>}
      {grafik && !data && !error && <p className="loading-text">Memuat data…</p>}

      {data && grafik && (
        <div className="dashboard-row">
          <section className="chart-card dashboard-row__chart">
            <h3 className="chart-card__title">Grafik Dokter Pengirim</h3>
            {dokterPengirim.length > 0 ? (
              <Chart
                type="bar"
                height={Math.max(300, dokterPengirim.length * 48)}
                options={horizontalBarOptions(
                  dokterPengirim.map((d) => d.nama),
                  paletteColors(dokterPengirim.length),
                  totalPengirim,
                )}
                series={[{ name: 'Pasien', data: dokterPengirim.map((d) => d.count) }]}
              />
            ) : (
              <p className="loading-text">Belum ada data dokter pengirim.</p>
            )}
          </section>
        </div>
      )}

      {data && grafik && (
        <section className="chart-card">
          <h3 className="chart-card__title">Grafik Pasien berdasarkan Alamat</h3>
          {alamat.length > 0 ? (
            <Chart
              type="bar"
              height={Math.max(300, alamat.length * 48)}
              options={horizontalBarOptions(
                alamat.map((a) => a.alamat),
                paletteColors(alamat.length),
                totalAlamat,
              )}
              series={[{ name: 'Pasien', data: alamat.map((a) => a.count) }]}
            />
          ) : (
            <p className="loading-text">Belum ada data alamat pasien.</p>
          )}
        </section>
      )}
    </>
  );
}
