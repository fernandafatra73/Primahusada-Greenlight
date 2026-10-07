import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react';

import { readFileAsDataUrl } from '../lib/fotoUpload.ts';

const TIPE_GAMBAR = ['image/png', 'image/jpeg', 'image/webp'];
const MAKS_BYTE = 2 * 1024 * 1024;

interface SignaturePadProps {
  /** Dipanggil setiap selesai satu goresan (PNG data URL) atau setelah dihapus (`null`). */
  readonly onChange: (dataUrl: string | null) => void;
  readonly width?: number;
  readonly height?: number;
}

/** Kotak tanda tangan: digambar dengan mouse, pena, atau jari, atau diunggah dari file gambar; hasilnya PNG. */
export function SignaturePad({
  onChange,
  width = 360,
  height = 140,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, []);

  /** Posisi pointer dalam koordinat kanvas, walau kanvas diperkecil oleh CSS. */
  function point(event: PointerEvent<HTMLCanvasElement>): {
    x: number;
    y: number;
  } {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function handleDown(event: PointerEvent<HTMLCanvasElement>): void {
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Titik kecil supaya ketukan tanpa geser tetap terlihat.
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  }

  function handleMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (!drawingRef.current) return;
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handleUp(event: PointerEvent<HTMLCanvasElement>): void {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(event.currentTarget.toDataURL('image/png'));
  }

  function clear(): void {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setUploadError(null);
    onChange(null);
  }

  /** Gambar file diletakkan di kanvas (diskalakan muat, rata tengah) lalu dilaporkan seperti hasil goresan. */
  async function handleFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!TIPE_GAMBAR.includes(file.type)) {
      setUploadError('File tanda tangan harus berupa gambar PNG, JPG, atau WebP');
      return;
    }
    if (file.size > MAKS_BYTE) {
      setUploadError('Ukuran file tanda tangan maksimal 2 MB');
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    try {
      const img = new Image();
      img.src = await readFileAsDataUrl(file);
      await img.decode();
      const skala = Math.min(canvas.width / img.width, canvas.height / img.height, 1);
      const w = img.width * skala;
      const h = img.height * skala;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      setUploadError(null);
      onChange(canvas.toDataURL('image/png'));
    } catch {
      setUploadError('Gagal membaca file tanda tangan');
    }
  }

  return (
    <div
      style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.3rem' }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        style={{
          // Ukuran tampil dikunci; kalau tidak, gaya `.form-field` meregangkan kanvas.
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: '100%',
          background: '#fff',
          border: '1px dashed #94a3b8',
          borderRadius: '6px',
          touchAction: 'none',
          cursor: 'crosshair',
        }}
        aria-label="Kotak tanda tangan"
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={clear}
        >
          Hapus Tanda Tangan
        </button>
        <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer', margin: 0 }}>
          Choose File TTD
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void handleFile(e)}
            style={{ display: 'none' }}
          />
        </label>
      </div>
      {uploadError ? (
        <span className="alert alert--error" style={{ margin: 0 }}>{uploadError}</span>
      ) : null}
    </div>
  );
}
