import { useEffect, useMemo, useRef, useState } from 'react';
import {
  cellKey,
  columnLabel,
  evaluateSheet,
  formatSheetValue,
  isSheetError,
  type SheetCells,
  type SheetValue,
} from '../lib/sheetFormula.ts';

interface SheetGridProps {
  readonly cells: SheetCells;
  readonly columns: number;
  readonly rows: number;
  readonly onChange: (cells: SheetCells) => void;
}

interface Pos {
  readonly col: number;
  readonly row: number;
}

const LEBAR_KOLOM_PERTAMA = 230;
const LEBAR_KOLOM = 120;

function tampil(v: SheetValue | undefined): string {
  if (typeof v === 'number') {
    return Number.isInteger(v) ? v.toLocaleString('id-ID') : v.toLocaleString('id-ID', { maximumFractionDigits: 4 });
  }
  return formatSheetValue(v);
}

/** Grid mirip Excel: pilih sel, ketik atau F2/klik ganda untuk edit, rumus diawali "=". */
export function SheetGrid({ cells, columns, rows, onChange }: SheetGridProps) {
  const [active, setActive] = useState<Pos>({ col: 0, row: 0 });
  const [editing, setEditing] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLInputElement>(null);

  const values = useMemo(() => evaluateSheet(cells), [cells]);
  const activeKey = cellKey(active.col, active.row);
  const rawActive = cells[activeKey] ?? '';

  useEffect(() => {
    // Jangan merebut fokus bila pengguna sedang mengetik di formula bar.
    if (editing !== null && document.activeElement !== barRef.current) inputRef.current?.focus();
  }, [editing]);

  function pindah(dCol: number, dRow: number) {
    setActive((p) => ({
      col: Math.min(columns - 1, Math.max(0, p.col + dCol)),
      row: Math.min(rows - 1, Math.max(0, p.row + dRow)),
    }));
  }

  function tulis(key: string, raw: string) {
    if ((cells[key] ?? '') === raw) return;
    const next: Record<string, string> = { ...cells };
    if (raw === '') delete next[key];
    else next[key] = raw;
    onChange(next);
  }

  function selesaiEdit(simpan: boolean, dCol: number, dRow: number) {
    if (editing === null) return;
    if (simpan) tulis(activeKey, editing);
    setEditing(null);
    pindah(dCol, dRow);
    wrapRef.current?.focus();
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    if (editing !== null) return;
    switch (e.key) {
      case 'ArrowUp': pindah(0, -1); break;
      case 'ArrowDown': pindah(0, 1); break;
      case 'ArrowLeft': pindah(-1, 0); break;
      case 'ArrowRight': pindah(1, 0); break;
      case 'Tab': pindah(e.shiftKey ? -1 : 1, 0); break;
      case 'Enter':
      case 'F2':
        setEditing(rawActive);
        break;
      case 'Delete':
      case 'Backspace':
        tulis(activeKey, '');
        break;
      default:
        // Mengetik langsung menimpa isi sel, seperti di Excel.
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setEditing(e.key);
          e.preventDefault();
          return;
        }
        return;
    }
    e.preventDefault();
  }

  function onEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      selesaiEdit(true, 0, e.shiftKey ? -1 : 1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      selesaiEdit(true, e.shiftKey ? -1 : 1, 0);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      selesaiEdit(false, 0, 0);
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem',
          border: '1px solid var(--color-border)', borderBottom: 'none', background: 'var(--color-surface, #fff)',
        }}
      >
        <strong style={{ minWidth: '3.5rem', textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
          {activeKey}
        </strong>
        <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>fx</span>
        <input
          ref={barRef}
          aria-label="Isi sel"
          value={editing ?? rawActive}
          onFocus={() => {
            if (editing === null) setEditing(rawActive);
          }}
          onChange={(e) => setEditing(e.target.value)}
          onKeyDown={onEditKeyDown}
          onBlur={() => selesaiEdit(true, 0, 0)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'monospace' }}
        />
      </div>
      <div
        ref={wrapRef}
        tabIndex={0}
        onKeyDown={onGridKeyDown}
        style={{ overflow: 'auto', maxHeight: '65vh', border: '1px solid var(--color-border)', outline: 'none' }}
      >
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.85rem' }}>
          <colgroup>
            <col style={{ width: '44px' }} />
            {Array.from({ length: columns }, (_, c) => (
              <col key={c} style={{ width: c === 0 ? LEBAR_KOLOM_PERTAMA : LEBAR_KOLOM }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...headerStyle, left: 0, zIndex: 3 }} />
              {Array.from({ length: columns }, (_, c) => (
                <th
                  key={c}
                  style={{ ...headerStyle, ...(c === active.col ? headerAktif : null) }}
                >
                  {columnLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <th style={{ ...rowHeaderStyle, ...(r === active.row ? headerAktif : null) }}>{r + 1}</th>
                {Array.from({ length: columns }, (_, c) => {
                  const key = cellKey(c, r);
                  const isActive = c === active.col && r === active.row;
                  const raw = cells[key] ?? '';
                  const nilai = values.get(key);
                  const angka = typeof nilai === 'number';
                  return (
                    <td
                      key={c}
                      onMouseDown={() => {
                        if (editing !== null) tulis(activeKey, editing);
                        setEditing(null);
                        setActive({ col: c, row: r });
                        wrapRef.current?.focus();
                      }}
                      onDoubleClick={() => setEditing(raw)}
                      style={{
                        ...cellStyle,
                        textAlign: angka ? 'right' : 'left',
                        color: nilai !== undefined && isSheetError(nilai) ? '#b91c1c' : undefined,
                        fontWeight: r < 2 ? 700 : undefined,
                        outline: isActive ? '2px solid var(--color-primary, #2563eb)' : undefined,
                        outlineOffset: '-2px',
                      }}
                    >
                      {isActive && editing !== null ? (
                        <input
                          ref={inputRef}
                          value={editing}
                          onChange={(e) => setEditing(e.target.value)}
                          onKeyDown={onEditKeyDown}
                          onBlur={() => selesaiEdit(true, 0, 0)}
                          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', font: 'inherit' }}
                        />
                      ) : (
                        tampil(nilai)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 2, background: '#f1f5f9', border: '1px solid #cbd5e1',
  padding: '0.2rem', fontWeight: 600, color: '#475569',
};
const rowHeaderStyle: React.CSSProperties = {
  position: 'sticky', left: 0, zIndex: 1, background: '#f1f5f9', border: '1px solid #cbd5e1',
  padding: '0 0.3rem', fontWeight: 600, color: '#475569', textAlign: 'center',
};
const headerAktif: React.CSSProperties = { background: '#dbeafe', color: '#1d4ed8' };
const cellStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0', padding: '0.2rem 0.4rem', overflow: 'hidden', whiteSpace: 'nowrap',
  textOverflow: 'ellipsis', height: '1.7rem', cursor: 'cell', background: 'var(--color-surface, #fff)',
};
