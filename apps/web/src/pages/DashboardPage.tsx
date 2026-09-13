import { useCallback, useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { baseChartOptions, paletteColors } from '../components/charts/chartTheme.ts';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { useListRefresh } from '../context/ListRefreshContext.tsx';
import { useMusicPlayer } from '../context/MusicPlayerContext.tsx';
import { apiGet, apiPatch } from '../lib/api.ts';

interface DokterPengirimSlice {
  readonly nama: string;
  readonly count: number;
}

interface DashboardResponse {
  readonly charts: {
    readonly dokterPengirim: readonly DokterPengirimSlice[];
  };
}

interface FotoDashboardItem {
  readonly foto: string | null;
  readonly createdAt: string;
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

function DashboardMusicPlayer() {
  const { playlist, playlistLoading, playingId, playLoadingId, playItem, stopPlaylist, reloadPlaylist } =
    useMusicPlayer();

  const playingSong = playlist.find((s) => s.id === playingId) ?? null;

  const [lirikDraft, setLirikDraft] = useState('');
  const [lirikOpen, setLirikOpen] = useState(false);
  const [savingLirik, setSavingLirik] = useState(false);

  function playNext() {
    if (playlist.length === 0) return;
    const currentIndex = playingId ? playlist.findIndex((s) => s.id === playingId) : -1;
    const next = playlist[(currentIndex + 1) % playlist.length];
    if (next) playItem(next);
  }

  function openLirikEdit() {
    if (!playingSong) return;
    setLirikDraft(playingSong.lirik ?? '');
    setLirikOpen(true);
  }

  async function saveLirik() {
    if (!playingSong) return;
    setSavingLirik(true);
    try {
      await apiPatch(`/api/playlist-lagu/${playingSong.id}`, { lirik: lirikDraft });
      setLirikOpen(false);
      await reloadPlaylist();
    } finally {
      setSavingLirik(false);
    }
  }

  return (
    <div className="dashboard-music-player">
      <div className="dashboard-music-player__title">🎵 Pemutar Lagu</div>
      {playlistLoading ? (
        <p className="loading-text">Memuat daftar lagu…</p>
      ) : playlist.length === 0 ? (
        <p className="loading-text">Belum ada lagu di Musik-PH.</p>
      ) : (
        <>
          <div className="dashboard-music-player__now-playing">
            {playingSong ? `▶️ ${playingSong.judul}` : 'Tidak ada lagu diputar'}
          </div>
          <select
            className="dashboard-music-player__select"
            value={playingId ?? ''}
            onChange={(e) => {
              const item = playlist.find((s) => s.id === e.target.value);
              if (item) playItem(item);
            }}
          >
            <option value="" disabled>
              Pilih lagu…
            </option>
            {playlist.map((song) => (
              <option key={song.id} value={song.id}>
                {song.judul}
              </option>
            ))}
          </select>
          <div className="dashboard-music-player__controls">
            <button
              type="button"
              className="btn btn--sm btn--secondary"
              disabled={playLoadingId !== null}
              onClick={() => (playingId ? stopPlaylist() : playNext())}
            >
              {playLoadingId ? '⏳' : playingId ? '⏸️ Stop' : '▶️ Putar'}
            </button>
            <button type="button" className="btn btn--sm btn--secondary" onClick={playNext} disabled={playLoadingId !== null}>
              ⏭️ Berikutnya
            </button>
          </div>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={!playingSong}
            onClick={openLirikEdit}
            title={playingSong ? 'Isi lirik lagu ini untuk running text' : 'Putar lagu dahulu untuk isi lirik'}
          >
            📝 Isi Lirik untuk Running Text
          </button>
        </>
      )}

      <Modal open={lirikOpen} title={`Lirik — ${playingSong?.judul ?? ''}`} onClose={() => setLirikOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveLirik();
          }}
          className="form-grid"
        >
          <div className="form-field form-grid--full">
            <label htmlFor="dash-lirik-text">
              Teks lirik (ditampilkan sebagai running text di ban bawah saat lagu ini diputar)
            </label>
            <textarea
              id="dash-lirik-text"
              rows={8}
              value={lirikDraft}
              onChange={(e) => setLirikDraft(e.target.value)}
              placeholder="Tempel/ketik lirik lagu di sini…"
            />
          </div>
          <ModalFormFooter onCancel={() => setLirikOpen(false)} submitLabel="Simpan" loading={savingLirik} />
        </form>
      </Modal>
    </div>
  );
}

export function DashboardPage() {
  const { version: listRefreshVersion } = useListRefresh();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboardFoto, setDashboardFoto] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await apiGet<DashboardResponse>(`/api/dashboard?_=${Date.now()}`));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat dashboard');
    }
  }, []);

  const loadFoto = useCallback(async () => {
    try {
      const res = await apiGet<{ items: FotoDashboardItem[] }>('/api/foto-dashboard?limit=200');
      const latest = res.items
        .filter((item) => item.foto)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      setDashboardFoto(latest?.foto ?? null);
    } catch {
      setDashboardFoto(null);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadFoto();
  }, [load, loadFoto, listRefreshVersion]);

  const dokterPengirim = data?.charts.dokterPengirim ?? [];
  const totalPengirim = dokterPengirim.reduce((sum, d) => sum + d.count, 0);

  return (
    <>
      <div className="page-heading">
        <h2 className="page-heading__title">Dashboard</h2>
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {!data && !error && <p className="loading-text">Memuat data…</p>}

      {data && (
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

          <div className="dashboard-row__side">
            <div className="dashboard-image-placeholder">
              {dashboardFoto && <img src={dashboardFoto} alt="Foto Dashboard" />}
            </div>
            <DashboardMusicPlayer />
          </div>
        </div>
      )}
    </>
  );
}
