import { useEffect, useRef, type PointerEvent } from 'react';

interface SignaturePadProps {
  /** Dipanggil setiap selesai satu goresan (PNG data URL) atau setelah dihapus (`null`). */
  readonly onChange: (dataUrl: string | null) => void;
  readonly width?: number;
  readonly height?: number;
}

/** Kotak tanda tangan: digambar dengan mouse, pena, atau jari; hasilnya PNG transparan. */
export function SignaturePad({
  onChange,
  width = 360,
  height = 140,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

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
    onChange(null);
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
      <div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={clear}
        >
          Hapus Tanda Tangan
        </button>
      </div>
    </div>
  );
}
