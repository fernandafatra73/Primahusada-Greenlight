import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { samaIsi, teksBaru, toggleId } from '../lib/inlineEdit.ts';

/**
 * Edit langsung di sel tabel. `onSave` mengembalikan true bila tersimpan; bila false
 * (gagal — pesan error ditampilkan oleh halaman), isian dikembalikan ke nilai lama.
 */
type Simpan<T> = (nilai: T) => Promise<boolean>;

function Pemicu({ children, title, disabled, onClick }: {
  readonly children: ReactNode;
  readonly title: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button type="button" className="inline-edit__trigger" title={title} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

interface InlineTextCellProps {
  readonly value: string;
  /** Tampilan saat tidak diedit (default: value). */
  readonly display?: ReactNode;
  readonly label: string;
  readonly onSave: Simpan<string>;
}

/** Teks: klik untuk ubah, Enter / klik di luar = simpan, Esc = batal. */
export function InlineTextCell({ value, display, label, onSave }: InlineTextCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function commit() {
    const baru = teksBaru(value, draft);
    if (baru === null) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onSave(baru);
    setSaving(false);
    if (!ok) setDraft(value);
    setEditing(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <Pemicu
        title={`Klik untuk ubah ${label}`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        {display ?? value}
      </Pemicu>
    );
  }
  return (
    <input
      className="inline-edit__input"
      aria-label={label}
      autoFocus
      value={draft}
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => void commit()}
    />
  );
}

interface Opsi {
  readonly id: string;
  readonly nama: string;
}

interface InlineSelectCellProps {
  readonly value: string;
  readonly display: ReactNode;
  readonly label: string;
  readonly options: readonly Opsi[];
  readonly onSave: Simpan<string>;
}

/** Pilihan tunggal: klik untuk buka dropdown, langsung tersimpan saat dipilih. */
export function InlineSelectCell({ value, display, label, options, onSave }: InlineSelectCellProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pilih(id: string) {
    if (id === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(id);
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <Pemicu title={`Klik untuk ubah ${label}`} onClick={() => setEditing(true)}>
        {display}
      </Pemicu>
    );
  }
  return (
    <select
      className="inline-edit__input"
      aria-label={label}
      autoFocus
      value={value}
      disabled={saving}
      onChange={(e) => void pilih(e.target.value)}
      onBlur={() => !saving && setEditing(false)}
      onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
    >
      {!options.some((o) => o.id === value) && <option value={value}>—</option>}
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.nama}
        </option>
      ))}
    </select>
  );
}

interface InlineMultiSelectCellProps {
  readonly value: readonly string[];
  readonly display: ReactNode;
  readonly label: string;
  readonly options: readonly Opsi[];
  /** Pesan bila belum ada pilihan sama sekali. */
  readonly emptyHint?: string;
  readonly onSave: Simpan<readonly string[]>;
}

/** Pilihan ganda: klik untuk buka daftar centang, lalu Simpan / Batal. */
export function InlineMultiSelectCell({ value, display, label, options, emptyHint, onSave }: InlineMultiSelectCellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<readonly string[]>(value);
  const [saving, setSaving] = useState(false);
  const [posisi, setPosisi] = useState<CSSProperties>({});
  const boxRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (boxRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    // Popover diletakkan "fixed" di bawah sel; tutup bila halaman/tabel digulir supaya tidak melayang.
    function tutup() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('scroll', tutup, true);
    window.addEventListener('resize', tutup);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('scroll', tutup, true);
      window.removeEventListener('resize', tutup);
    };
  }, [open]);

  function buka() {
    const r = boxRef.current?.getBoundingClientRect();
    if (r) setPosisi({ position: 'fixed', top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 280) });
    setDraft(value);
    setOpen(true);
  }

  async function simpan() {
    if (draft.length === 0 || samaIsi(draft, value)) {
      setOpen(false);
      return;
    }
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) setOpen(false);
  }

  return (
    <div className="inline-edit__multi" ref={boxRef}>
      <Pemicu
        title={`Klik untuk ubah ${label}`}
        onClick={() => (open ? setOpen(false) : buka())}
      >
        {display}
      </Pemicu>
      {/* Dirender ke body: wadah tabel memotong (overflow) popover yang ada di dalam sel. */}
      {open && createPortal(
        <div
          ref={popoverRef}
          className="inline-edit__popover"
          style={posisi}
          role="dialog"
          aria-label={label}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          {options.length === 0 && <div className="inline-edit__hint">{emptyHint ?? 'Belum ada pilihan.'}</div>}
          <div className="inline-edit__options">
            {options.map((o) => (
              <label key={o.id} className="inline-edit__option">
                <input
                  type="checkbox"
                  checked={draft.includes(o.id)}
                  onChange={() => setDraft((d) => toggleId(d, o.id))}
                />
                {o.nama}
              </label>
            ))}
          </div>
          {options.length > 0 && draft.length === 0 && <div className="inline-edit__hint">Pilih minimal satu.</div>}
          <div className="inline-edit__actions">
            <button type="button" className="btn btn--xs btn--secondary" onClick={() => setOpen(false)}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn--xs btn--primary"
              disabled={saving || draft.length === 0}
              onClick={() => void simpan()}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
