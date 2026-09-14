import { ListRefreshProvider } from './context/ListRefreshContext.tsx';
import { MusicPlayerProvider, useMusicPlayer } from './context/MusicPlayerContext.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { PdfPreviewHost } from './pdf/pdfPreviewHost.tsx';
import {
  DASHBOARD_NAV_ID,
  getNavLabel,
  isViewAllowed,
  type AppViewId,
  type Departemen,
  type StaffRole,
} from './config/navigation.ts';
import { useAppNavigation } from './hooks/useAppNavigation.ts';
import { clearStoredAuthUser, loadStoredAuthUser, storeAuthUser, type AuthUser } from './lib/auth.ts';
import { withIndonesianVoice } from './lib/speechVoice.ts';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { DokterPage } from './pages/DokterPage.tsx';
import { DokterHubPage } from './pages/DokterHubPage.tsx';
import { KaryawanKlinikPage } from './pages/KaryawanKlinikPage.tsx';
import { TandaTanganElektronikPage } from './pages/TandaTanganElektronikPage.tsx';
import { FotoDashboardPage } from './pages/FotoDashboardPage.tsx';
import { BackupDatabasePage } from './pages/BackupDatabasePage.tsx';
import { SharingRadiologPage } from './pages/SharingRadiologPage.tsx';
import { JenisPemeriksaanPage } from './pages/JenisPemeriksaanPage.tsx';
import { KesanPage } from './pages/KesanPage.tsx';
import { LaboratoriumPage } from './pages/LaboratoriumPage.tsx';
import { LaboratoriumHubPage } from './pages/LaboratoriumHubPage.tsx';
import { LabDuplikatPage } from './pages/LabDuplikatPage.tsx';
import { HargaPemeriksaanLabPage } from './pages/HargaPemeriksaanLabPage.tsx';
import { PaketLabMasterPage } from './pages/PaketLabMasterPage.tsx';
import { KlasifikasiPaketPage } from './pages/KlasifikasiPaketPage.tsx';
import { HitunganLedPage } from './pages/HitunganLedPage.tsx';
import { MusikPage } from './pages/MusikPage.tsx';
import { FatraPage } from './pages/FatraPage.tsx';
import { MegaDataHubPage } from './pages/MegaDataHubPage.tsx';
import { PendaftaranUmumPage } from './pages/PendaftaranUmumPage.tsx';
import { PendaftaranHubPage } from './pages/PendaftaranHubPage.tsx';
import { TransferPage } from './pages/TransferPage.tsx';
import { DaftarTelponPage } from './pages/DaftarTelponPage.tsx';
import { KalenderPage } from './pages/KalenderPage.tsx';
import { WhatsAppPage } from './pages/WhatsAppPage.tsx';
import { TelegramPage } from './pages/TelegramPage.tsx';
import { KalkulatorPage } from './pages/KalkulatorPage.tsx';
import { AiGeminiPage } from './pages/AiGeminiPage.tsx';
import { AiRadiologiPage } from './pages/AiRadiologiPage.tsx';
import { AiRadiologiGrupPage } from './pages/AiRadiologiGrupPage.tsx';
import { AiFotoPage } from './pages/AiFotoPage.tsx';
import { SosmedPage } from './pages/SosmedPage.tsx';
import { GlobalWarmPage } from './pages/GlobalWarmPage.tsx';
import { DaftarAkunPage } from './pages/DaftarAkunPage.tsx';
import { ExpertisePage } from './pages/ExpertisePage.tsx';
import { TradingPage } from './pages/TradingPage.tsx';
import { TradingCandlePage } from './pages/TradingCandlePage.tsx';
import { TradingTopicPage } from './pages/TradingTopicPage.tsx';
import { VideoModulPage } from './pages/VideoModulPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { PasienPage } from './pages/PasienPage.tsx';
import { RadiologiPage } from './pages/RadiologiPage.tsx';
import { PetugasLabPage } from './pages/PetugasLabPage.tsx';
import { RadiologMasterPage } from './pages/RadiologMasterPage.tsx';
import { RadiograferPage } from './pages/RadiograferPage.tsx';
import { KondisiAlatPage } from './pages/KondisiAlatPage.tsx';
import { LogbookPasienPage } from './pages/LogbookPasienPage.tsx';
import { GajiKaryawanPage } from './pages/GajiKaryawanPage.tsx';
import { PenggajianPage } from './pages/PenggajianPage.tsx';
import { KaryawanPage } from './pages/KaryawanPage.tsx';
import { AdvantagePage } from './pages/AdvantagePage.tsx';
import { BhpRadiologiPage } from './pages/BhpRadiologiPage.tsx';
import { RadiologDuplikatPage } from './pages/RadiologDuplikatPage.tsx';
import { CetakALPage } from './pages/CetakALPage.tsx';
import { CetakLabLabPage } from './pages/CetakLabLabPage.tsx';
import { KwitansiRadiologiPage } from './pages/KwitansiRadiologiPage.tsx';
import { KwitansiLaboratoriumPage } from './pages/KwitansiLaboratoriumPage.tsx';
import { SharingArsipPage } from './pages/SharingArsipPage.tsx';
import { RolePage } from './pages/RolePage.tsx';
import { SharingPage } from './pages/SharingPage.tsx';
import { LaporanTahunanPage } from './pages/LaporanTahunanPage.tsx';
import { LaporanPajakPage } from './pages/LaporanPajakPage.tsx';
import { LaporanPajakBulananPage } from './pages/LaporanPajakBulananPage.tsx';
import { HasilPerbulanPage } from './pages/HasilPerbulanPage.tsx';
import { LaporanNeracaPage } from './pages/LaporanNeracaPage.tsx';
import { TempletPage } from './pages/TempletPage.tsx';
import { AnalisaFotoRontgenPage } from './pages/AnalisaFotoRontgenPage.tsx';
import { UsgPage } from './pages/UsgPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { FarmasiBhpPage } from './pages/FarmasiBhpPage.tsx';
import { FarmasiKwitansiPage } from './pages/FarmasiKwitansiPage.tsx';
import { FarmasiHubPage } from './pages/FarmasiHubPage.tsx';
import { AbsensiPage } from './pages/AbsensiPage.tsx';
import { KeuanganPembukuanPage } from './pages/KeuanganPembukuanPage.tsx';
import { KeuanganHubPage } from './pages/KeuanganHubPage.tsx';
import { AdminKlinikPage } from './pages/AdminKlinikPage.tsx';
import { LogoPerusahaanPage } from './pages/LogoPerusahaanPage.tsx';
import { PengaturanHubPage } from './pages/PengaturanHubPage.tsx';
import { AutotextPage } from './pages/AutotextPage.tsx';
import { ComingSoonPage } from './pages/ComingSoonPage.tsx';
import { DataTerbesarPage } from './pages/DataTerbesarPage.tsx';
import { HakAksesPage } from './pages/HakAksesPage.tsx';
import { useEffect, useRef, useState } from 'react';

function AccessDenied({ viewId }: { readonly viewId: AppViewId }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '4rem 2rem',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}
    >
      <h2 style={{ margin: 0, color: 'var(--color-text)' }}>Akses ditolak</h2>
      <p style={{ margin: 0 }}>
        Akun Anda (Pekerja) tidak memiliki akses ke halaman &quot;{getNavLabel(viewId)}&quot;. Hubungi
        manajemen jika Anda memerlukan akses ini.
      </p>
    </div>
  );
}

function renderViewContent(
  viewId: AppViewId,
  role: StaffRole,
  departemen: Departemen | null,
  navigate: (view: AppViewId) => void,
) {
  if (!isViewAllowed(viewId, role, departemen)) {
    return <AccessDenied viewId={viewId} />;
  }

  switch (viewId) {
    case DASHBOARD_NAV_ID:
      return <DashboardPage />;
    case 'templet':
      return <TempletPage />;
    case 'musik-ph':
      return <MusikPage />;
    case 'fatra':
      return <FatraPage />;
    case 'mega-data':
      return <MegaDataHubPage />;
    case 'radiologi':
      return <RadiologiPage />;
    case 'pasien':
      return <PasienPage />;
    case 'pendaftaran':
      return <PendaftaranHubPage />;
    case 'pendaftaran-umum':
      return <PendaftaranUmumPage />;
    case 'transfer':
      return <TransferPage />;
    case 'daftar-telpon':
      return <DaftarTelponPage />;
    case 'kalender':
      return <KalenderPage />;
    case 'whatsapp':
      return <WhatsAppPage />;
    case 'telegram':
      return <TelegramPage />;
    case 'kalkulator':
      return <KalkulatorPage />;
    case 'ai-gemini':
      return <AiGeminiPage />;
    case 'ai-radiologi':
      return <AiRadiologiPage />;
    case 'ai-radiologi-grup':
      return <AiRadiologiGrupPage onNavigate={navigate} />;
    case 'data-terbesar':
      return <DataTerbesarPage onNavigate={navigate} />;
    case 'harga-pemeriksaan-lab':
      return <HargaPemeriksaanLabPage />;
    case 'laboratorium':
      return <LaboratoriumHubPage />;
    case 'lab':
      return <LaboratoriumPage onNavigate={navigate} />;
    case 'lab-duplikat':
      return <LabDuplikatPage />;
    case 'kwitansi-laboratorium':
      return <KwitansiLaboratoriumPage />;
    case 'sharing-lab':
      return <SharingArsipPage modul="LABORATORIUM" />;
    case 'paket-lab-master':
      return <PaketLabMasterPage />;
    case 'petugas-lab-master':
      return <PetugasLabPage />;
    case 'klasifikasi-paket':
      return <KlasifikasiPaketPage />;
    case 'hitungan-led':
      return <HitunganLedPage />;
    case 'sharing':
      return <SharingPage />;
    case 'laporan-tahunan':
      return <LaporanTahunanPage />;
    case 'laporan-pajak':
      return <LaporanPajakPage />;
    case 'laporan-pajak-bulanan':
      return <LaporanPajakBulananPage />;
    case 'laporan-pajak-lab':
      return <LaporanPajakPage modul="LABORATORIUM" />;
    case 'laporan-pajak-bulanan-lab':
      return <LaporanPajakBulananPage modul="LABORATORIUM" />;
    case 'laporan-neraca':
      return <LaporanNeracaPage />;
    case 'neracarad':
      return <LaporanNeracaPage modul="RADIOLOGI" />;
    case 'radiolog-duplikat':
      return <RadiologDuplikatPage />;
    case 'kwitansi-radiologi':
      return <KwitansiRadiologiPage />;
    case 'sharing-radiologi':
      return <SharingArsipPage modul="RADIOLOGI" />;
    case 'sharing-radiolog':
      return <SharingRadiologPage />;
    case 'cetak-al':
      return <CetakALPage />;
    case 'cetak-amplop-lab':
      return <CetakLabLabPage mode="amplop" />;
    case 'cetak-label-lab':
      return <CetakLabLabPage mode="label" />;
    case 'master-sistem':
      return <DokterHubPage />;
    case 'dokter':
      return <DokterPage />;
    case 'karyawan-klinik':
      return <KaryawanKlinikPage />;
    case 'tanda-tangan-elektronik':
      return <TandaTanganElektronikPage />;
    case 'foto-dashboard':
      return <FotoDashboardPage />;
    case 'backup-database':
      return <BackupDatabasePage />;
    case 'jenis-pemeriksaan':
      return <JenisPemeriksaanPage />;
    case 'kesan':
      return <KesanPage />;
    case 'radiolog-master':
      return <RadiologMasterPage />;
    case 'radiografer':
      return <RadiograferPage />;
    case 'kondisi-alat':
      return <KondisiAlatPage />;
    case 'logbook-pasien':
      return <LogbookPasienPage />;
    case 'gaji-karyawan':
      return <GajiKaryawanPage />;
    case 'karyawan-radiologi':
      return <KaryawanPage departemen="RADIOLOGI" />;
    case 'karyawan-laboratorium':
      return <KaryawanPage departemen="LABORATORIUM" />;
    case 'advantage':
      return <AdvantagePage />;
    case 'bhp-radiologi':
      return <BhpRadiologiPage />;
    case 'analisa-foto-rontgen':
      return <AnalisaFotoRontgenPage />;
    case 'usg':
      return <UsgPage />;
    case 'role':
      return <RolePage />;
    case 'admin':
      return <AdminPage />;
    case 'hak-akses':
      return <HakAksesPage />;
    case 'farmasi':
      return <FarmasiHubPage />;
    case 'farmasi-bhp':
      return <FarmasiBhpPage />;
    case 'kwitansi-farmasi':
      return <FarmasiKwitansiPage />;
    case 'absensi':
      return <AbsensiPage />;
    case 'keuangan':
      return <KeuanganHubPage />;
    case 'keuangan-pembukuan':
      return <KeuanganPembukuanPage />;
    case 'hasil-perbulan':
      return <HasilPerbulanPage />;
    case 'penggajian':
      return <PenggajianPage />;
    case 'admin-klinik':
      return <AdminKlinikPage />;
    case 'pengaturan':
      return <PengaturanHubPage role={role} />;
    case 'logo-perusahaan':
      return <LogoPerusahaanPage />;
    case 'autote1':
      return <AutotextPage />;
    case 'ai-foto':
      return <AiFotoPage />;
    case 'sosmed':
      return <SosmedPage onNavigate={navigate} />;
    case 'global-warm':
      return <GlobalWarmPage />;
    case 'daftar-akun':
      return <DaftarAkunPage onClose={() => navigate('sosmed')} />;
    case 'expertise':
      return <ExpertisePage />;
    case 'trading':
      return <TradingPage />;
    case 'trading-candle':
      return <TradingCandlePage onNavigate={navigate} />;
    case 'bullish-engulfing':
    case 'bearish-engulfing':
    case 'hammer':
    case 'shooting-star':
    case 'morning-star':
    case 'evening-star':
    case 'doji':
    case 'inside-bar':
    case 'breakout':
    case 'support-resistance':
    case 'trend':
    case 'volume':
    case 'rsi':
    case 'macd':
    case 'bollinger-band':
      return <TradingTopicPage topicId={viewId} onClose={() => navigate('trading-candle')} />;
    case 'video-modul':
      return <VideoModulPage />;
    case 'rawat-jalan':
      return <ComingSoonPage title="Rawat Jalan" />;
    case 'rawat-inap':
      return <ComingSoonPage title="Rawat Inap" />;
    case 'hrd':
      return <ComingSoonPage title="HRD" />;
    case 'lengkap':
      return <ComingSoonPage title="Lengkap" />;
    case 'file':
      return <ComingSoonPage title="File" />;
    default:
      return <DashboardPage />;
  }
}


const LOGIN_GREETING =
  'Selamat anda memasuki area prima husada. Bekerjalah dengan sungguh-sungguh, semoga hari harimu menyenangkan. Buatlah kebahagian di tempat kerja mu, rejeki akan mengikuti selamanya.';

/** Bunyi "ding-dong" khas pengumuman kabin pesawat, dimainkan sebelum
 * ucapan sambutan supaya terasa seperti announcement layanan penerbangan. */
function playAnnouncementChime(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('AudioContext' in window)) {
      resolve();
      return;
    }
    const ctx = new AudioContext();
    const notes: ReadonlyArray<readonly [freq: number, offsetMs: number, durationMs: number]> = [
      [880, 0, 450],
      [659.25, 480, 600],
    ];
    for (const [freq, offsetMs, durationMs] of notes) {
      const start = ctx.currentTime + offsetMs / 1000;
      const duration = durationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    }
    const totalMs = Math.max(...notes.map(([, offsetMs, durationMs]) => offsetMs + durationMs));
    setTimeout(() => {
      void ctx.close();
      resolve();
    }, totalMs + 250);
  });
}

/** Ucapkan sambutan login ala pengumuman layanan pesawat: bunyi chime
 * "ding-dong" dulu, baru ucapan dengan suara perempuan Indonesia yang lembut
 * dan enak didengar (tempo pelan, nada sedikit lebih tinggi & volume tidak
 * penuh supaya terasa hangat, bukan datar seperti pengumuman kabin biasa).
 * Voice Bahasa Indonesia dipilih setelah daftar voice browser termuat (pada
 * beberapa browser getVoices() kosong sampai event "voiceschanged"
 * terpicu), supaya tidak salah lafal dan terdengar tidak jelas. */
function speakLoginGreeting(onDone: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onDone();
    return;
  }
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(LOGIN_GREETING);
  utter.lang = 'id-ID';
  utter.rate = 0.88;
  utter.pitch = 1.05;
  utter.volume = 0.9;
  utter.onend = onDone;
  utter.onerror = onDone;

  const speakNow = () => {
    withIndonesianVoice((voice) => {
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      }
      synth.cancel();
      synth.speak(utter);
    });
  };

  void playAnnouncementChime().then(speakNow);
}

/** Ucapan selamat datang (text-to-speech) + auto-play lagu pertama di
 * playlist, sekali saja tepat setelah login — bukan setiap kali sesi lama
 * dipulihkan (refresh halaman). */
function LoginWelcomeEffect() {
  const { playlist, playItem } = useMusicPlayer();
  const spokenRef = useRef(false);
  const autoPlayedRef = useRef(false);
  // Lagu baru diputar setelah ucapan selesai, supaya musik tidak menimpa
  // suara TTS dan membuatnya tidak jelas.
  const [greetingDone, setGreetingDone] = useState(false);

  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;
    speakLoginGreeting(() => setGreetingDone(true));
  }, []);

  useEffect(() => {
    if (autoPlayedRef.current || !greetingDone || playlist.length === 0) return;
    autoPlayedRef.current = true;
    playItem(playlist[0]!);
  }, [greetingDone, playlist, playItem]);

  return null;
}

export function App() {
  const { activeView, navigate } = useAppNavigation();
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => loadStoredAuthUser());
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  function handleLogin(user: AuthUser): void {
    storeAuthUser(user);
    setAuthUser(user);
    setJustLoggedIn(true);
  }

  function handleLogout(): void {
    clearStoredAuthUser();
    setAuthUser(null);
    setJustLoggedIn(false);
  }

  if (!authUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <ListRefreshProvider>
      <MusicPlayerProvider>
        {justLoggedIn && <LoginWelcomeEffect />}
        <PdfPreviewHost>
          <AppShell activeView={activeView} authUser={authUser} onNavigate={navigate} onLogout={handleLogout}>
            {renderViewContent(activeView, authUser.role, authUser.departemen, navigate)}
          </AppShell>
        </PdfPreviewHost>
      </MusicPlayerProvider>
    </ListRefreshProvider>
  );
}
