import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from './ui/Modal.tsx';
import './ui/ui.css';

export interface AbsensiCapture {
  /** Foto selfie sebagai data URL JPEG; dikirim ke server lalu disimpan
   * sebagai berkas, bukan disimpan mentah di database. */
  readonly foto: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly akurasi?: number;
}

interface AbsensiCaptureModalProps {
  readonly open: boolean;
  readonly judul: string;
  readonly namaKaryawan: string;
  readonly loading?: boolean;
  readonly onClose: () => void;
  readonly onSimpan: (hasil: AbsensiCapture) => void;
}

type StatusLokasi =
  | { readonly jenis: 'mencari' }
  | { readonly jenis: 'berhasil'; readonly lat: number; readonly lng: number; readonly akurasi: number }
  | { readonly jenis: 'gagal'; readonly pesan: string };

/** Lebar foto yang disimpan. Cukup untuk mengenali wajah, tapi tidak membuat
 * database dan cadangan membengkak. */
const LEBAR_FOTO = 640;
const MUTU_JPEG = 0.82;

function pesanGeolokasi(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Izin lokasi ditolak. Aktifkan izin lokasi untuk aplikasi ini bila ingin lokasi ikut tercatat.';
    case err.POSITION_UNAVAILABLE:
      return 'Perangkat tidak bisa menentukan lokasi. Komputer tanpa GPS sering gagal di sini.';
    case err.TIMEOUT:
      return 'Pencarian lokasi kehabisan waktu.';
    default:
      return 'Lokasi tidak bisa diambil.';
  }
}

export function AbsensiCaptureModal({
  open,
  judul,
  namaKaryawan,
  loading = false,
  onClose,
  onSimpan,
}: AbsensiCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [foto, setFoto] = useState<string | null>(null);
  const [kameraError, setKameraError] = useState<string | null>(null);
  const [lokasi, setLokasi] = useState<StatusLokasi>({ jenis: 'mencari' });

  const matikanKamera = useCallback(() => {
    // Wajib dihentikan sendiri: kalau tidak, lampu kamera tetap menyala walau
    // jendelanya sudah ditutup.
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;

    let dibatalkan = false;
    setFoto(null);
    setKameraError(null);
    setLokasi({ jenis: 'mencari' });

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 } },
          audio: false,
        });
        if (dibatalkan) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        if (!dibatalkan) {
          setKameraError(
            'Kamera tidak bisa dibuka. Pastikan ada webcam dan izin kamera untuk aplikasi ini diperbolehkan.',
          );
        }
      }
    })();

    if (!navigator.geolocation) {
      setLokasi({ jenis: 'gagal', pesan: 'Perangkat ini tidak mendukung penentuan lokasi.' });
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (dibatalkan) return;
          setLokasi({
            jenis: 'berhasil',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            akurasi: pos.coords.accuracy,
          });
        },
        (err) => {
          if (!dibatalkan) setLokasi({ jenis: 'gagal', pesan: pesanGeolokasi(err) });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    }

    return () => {
      dibatalkan = true;
      matikanKamera();
    };
  }, [open, matikanKamera]);

  function ambilFoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const skala = LEBAR_FOTO / video.videoWidth;
    const canvas = document.createElement('canvas');
    canvas.width = LEBAR_FOTO;
    canvas.height = Math.round(video.videoHeight * skala);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Dicerminkan supaya hasilnya sesuai dengan yang terlihat di layar.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setFoto(canvas.toDataURL('image/jpeg', MUTU_JPEG));
  }

  function simpan() {
    if (!foto) return;
    onSimpan({
      foto,
      ...(lokasi.jenis === 'berhasil'
        ? { lat: lokasi.lat, lng: lokasi.lng, akurasi: lokasi.akurasi }
        : {}),
    });
  }

  return (
    <Modal open={open} title={judul} onClose={onClose} size="md">
      <p style={{ margin: '0 0 0.6rem', fontSize: '0.88rem' }}>
        Karyawan: <strong>{namaKaryawan}</strong>
      </p>

      <div
        style={{
          position: 'relative',
          background: '#0f172a',
          borderRadius: '10px',
          overflow: 'hidden',
          aspectRatio: '4 / 3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.6rem',
        }}
      >
        {foto ? (
          <img src={foto} alt="Foto absensi" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : kameraError ? (
          <p style={{ color: '#fecaca', padding: '1rem', textAlign: 'center', margin: 0 }}>{kameraError}</p>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        )}
      </div>

      <div
        style={{
          padding: '0.5rem 0.7rem',
          borderRadius: '8px',
          marginBottom: '0.75rem',
          fontSize: '0.83rem',
          background: lokasi.jenis === 'berhasil' ? '#dcfce7' : lokasi.jenis === 'gagal' ? '#fef3c7' : '#f1f5f9',
          border: `1px solid ${lokasi.jenis === 'berhasil' ? '#86efac' : lokasi.jenis === 'gagal' ? '#fcd34d' : 'var(--color-border)'}`,
        }}
      >
        {lokasi.jenis === 'mencari' && '📍 Mencari lokasi…'}
        {lokasi.jenis === 'berhasil' && (
          <>
            📍 {lokasi.lat.toFixed(6)}, {lokasi.lng.toFixed(6)}{' '}
            <span style={{ color: '#475569' }}>(± {Math.round(lokasi.akurasi)} m)</span>
          </>
        )}
        {lokasi.jenis === 'gagal' && (
          <>
            ⚠️ {lokasi.pesan}
            <div style={{ marginTop: '0.2rem', color: '#78350f' }}>
              Absensi tetap bisa disimpan — hanya lokasinya yang kosong.
            </div>
          </>
        )}
      </div>

      <div className="form-actions modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={loading}>
          Batal
        </button>
        {foto ? (
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setFoto(null)} disabled={loading}>
              🔄 Ulangi Foto
            </button>
            <button type="button" className="btn btn--primary" onClick={simpan} disabled={loading}>
              {loading ? 'Menyimpan…' : '✅ Simpan Absensi'}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={ambilFoto}
            disabled={loading || kameraError !== null}
          >
            📷 Ambil Foto
          </button>
        )}
      </div>
    </Modal>
  );
}
