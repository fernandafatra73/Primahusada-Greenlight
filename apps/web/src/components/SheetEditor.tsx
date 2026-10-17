import { useEffect, useMemo, useRef, useState } from 'react';
import {
  cellKey,
  columnLabel,
  evaluateWorkbook,
  formatSheetValue,
  isSheetError,
  type SheetValue,
} from '../lib/sheetFormula.ts';
import { rapikanRumus, type Sumbu } from '../lib/sheetRefs.ts';
import {
  FORMAT_ANGKA,
  ambilBlok,
  gantiNamaSheet,
  hapusSheet,
  isiBlok,
  lebarKolom,
  rataBawaan,
  tambahSheet,
  tampilkanNilai,
  tempelBlok,
  tinggiBaris,
  tulisSel,
  ubahGaya,
  ubahStruktur,
  ubahUkuran,
  type Blok,
  type CellStylePatch,
  type NumFmt,
  type SalinanBlok,
  type Workbook,
} from '../lib/sheetModel.ts';

interface SheetEditorProps {
  readonly workbook: Workbook;
  readonly onChange: (next: Workbook) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

interface Pos {
  readonly col: number;
  readonly row: number;
}

interface Resizing {
  readonly sumbu: Sumbu;
  readonly index: number;
  readonly mulai: number;
  readonly ukuranAwal: number;
  readonly ukuran: number;
}

const HIJAU = '#217346';
const LEBAR_HEADER_BARIS = 46;
const TINGGI_HEADER = 24;
const OPERATOR_AKHIR = /[=+\-*/^&(,;<>]$/;

function escapeRegex(teks: string): string {
  return teks.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Editor mirip Excel: toolbar format, grid, tab sheet, bar status, cari & ganti. */
export function SheetEditor({ workbook, onChange, onUndo, onRedo, canUndo, canRedo }: SheetEditorProps) {
  const [sheetIdx, setSheetIdx] = useState(0);
  const [active, setActive] = useState<Pos>({ col: 0, row: 0 });
  const [anchor, setAnchor] = useState<Pos>({ col: 0, row: 0 });
  const [editing, setEditing] = useState<string | null>(null);
  const [resizing, setResizing] = useState<Resizing | null>(null);
  const [isiTarget, setIsiTarget] = useState<Blok | null>(null);
  const [menu, setMenu] = useState<{ readonly x: number; readonly y: number } | null>(null);
  const [cariBuka, setCariBuka] = useState(false);
  const [cariTeks, setCariTeks] = useState('');
  const [gantiTeks, setGantiTeks] = useState('');
  const [cariInfo, setCariInfo] = useState('');
  const memilih = useRef(false);
  // Mencegah penulisan ganda: input yang dilepas dari DOM memicu onBlur dengan state lama.
  const sedangSelesai = useRef(false);
  const isiAsal = useRef<Blok | null>(null);
  const salinan = useRef<{ readonly data: SalinanBlok; readonly teks: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLInputElement>(null);

  const idx = Math.min(sheetIdx, workbook.sheets.length - 1);
  const sheet = workbook.sheets[idx]!;
  const hasil = useMemo(
    () => evaluateWorkbook(workbook.sheets.map((s) => ({ name: s.name, cells: s.cells }))),
    [workbook],
  );
  const values = hasil[idx]!;

  const activeKey = cellKey(active.col, active.row);
  const rawActive = sheet.cells[activeKey] ?? '';
  const gayaAktif = sheet.styles[activeKey];
  const blok: Blok = {
    c1: Math.min(anchor.col, active.col),
    c2: Math.max(anchor.col, active.col),
    r1: Math.min(anchor.row, active.row),
    r2: Math.max(anchor.row, active.row),
  };
  const satuSel = blok.c1 === blok.c2 && blok.r1 === blok.r2;

  useEffect(() => {
    // Ukuran sheet bisa menyusut (hapus baris/kolom atau ganti sheet); jaga seleksi tetap di dalam grid.
    const jaga = (p: Pos): Pos => ({ col: Math.min(p.col, sheet.cols - 1), row: Math.min(p.row, sheet.rows - 1) });
    setActive(jaga);
    setAnchor(jaga);
  }, [sheet.cols, sheet.rows, idx]);

  useEffect(() => {
    sedangSelesai.current = false;
  }, [editing]);

  useEffect(() => {
    // Jangan merebut fokus bila pengguna sedang mengetik di formula bar.
    if (editing !== null && document.activeElement !== barRef.current) inputRef.current?.focus();
  }, [editing]);

  // Seret ukuran kolom/baris.
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const pos = resizing.sumbu === 'kolom' ? e.clientX : e.clientY;
      setResizing((r) => (r ? { ...r, ukuran: r.ukuranAwal + pos - r.mulai } : r));
    };
    const onUp = () => {
      onChange(ubahUkuran(workbook, idx, resizing.sumbu, resizing.index, resizing.ukuran));
      setResizing(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing, workbook, idx, onChange]);

  // Seret fill handle / seleksi mouse berakhir di mana pun mouse dilepas.
  useEffect(() => {
    const onUp = () => {
      memilih.current = false;
      const asal = isiAsal.current;
      if (asal && isiTarget) {
        const sama = isiTarget.c1 === asal.c1 && isiTarget.c2 === asal.c2 && isiTarget.r1 === asal.r1 && isiTarget.r2 === asal.r2;
        if (!sama) {
          onChange(isiBlok(workbook, idx, asal, isiTarget));
          setAnchor({ col: isiTarget.c1, row: isiTarget.r1 });
          setActive({ col: isiTarget.c2, row: isiTarget.r2 });
        }
      }
      isiAsal.current = null;
      setIsiTarget(null);
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [isiTarget, workbook, idx, onChange]);

  useEffect(() => {
    if (!menu) return;
    const tutup = () => setMenu(null);
    window.addEventListener('mousedown', tutup);
    return () => window.removeEventListener('mousedown', tutup);
  }, [menu]);

  const kunciBlok = (b: Blok = blok): string[] => {
    const keys: string[] = [];
    for (let r = b.r1; r <= b.r2; r++) for (let c = b.c1; c <= b.c2; c++) keys.push(cellKey(c, r));
    return keys;
  };

  function pindah(dCol: number, dRow: number, perluas = false) {
    const col = Math.min(sheet.cols - 1, Math.max(0, active.col + dCol));
    const row = Math.min(sheet.rows - 1, Math.max(0, active.row + dRow));
    setActive({ col, row });
    if (!perluas) setAnchor({ col, row });
  }

  function tulis(key: string, raw: string) {
    const baru = rapikanRumus(raw);
    if ((sheet.cells[key] ?? '') === baru) return;
    onChange(tulisSel(workbook, idx, { [key]: baru }));
  }

  function selesaiEdit(simpan: boolean, dCol: number, dRow: number) {
    if (editing === null || sedangSelesai.current) return;
    sedangSelesai.current = true;
    if (simpan) tulis(activeKey, editing);
    setEditing(null);
    pindah(dCol, dRow);
    wrapRef.current?.focus();
  }

  function terapkanGaya(patch: CellStylePatch) {
    onChange(ubahGaya(workbook, idx, kunciBlok(), patch));
    wrapRef.current?.focus();
  }

  function kosongkanBlok() {
    const ubah: Record<string, string> = {};
    for (const key of kunciBlok()) ubah[key] = '';
    onChange(tulisSel(workbook, idx, ubah));
  }

  function blokSebagaiTeks(): string {
    const baris: string[] = [];
    for (let r = blok.r1; r <= blok.r2; r++) {
      const kolom: string[] = [];
      for (let c = blok.c1; c <= blok.c2; c++) kolom.push(formatSheetValue(values.get(cellKey(c, r))));
      baris.push(kolom.join('\t'));
    }
    return baris.join('\n');
  }

  function catatSalinan(potong: boolean): string {
    const teks = blokSebagaiTeks();
    salinan.current = { data: ambilBlok(sheet, blok, potong), teks };
    return teks;
  }

  function tempelTeks(teks: string) {
    const catatan = salinan.current;
    if (catatan && catatan.teks === teks) {
      onChange(tempelBlok(workbook, idx, catatan.data, blok.c1, blok.r1));
      if (catatan.data.potong) salinan.current = null;
      return;
    }
    const baris = teks.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
    const ubah: Record<string, string> = {};
    baris.forEach((line, dr) => {
      line.split('\t').forEach((nilai, dc) => {
        const col = blok.c1 + dc;
        const row = blok.r1 + dr;
        if (col < sheet.cols && row < sheet.rows) ubah[cellKey(col, row)] = nilai;
      });
    });
    onChange(tulisSel(workbook, idx, ubah));
  }

  function onCopy(e: React.ClipboardEvent) {
    if (editing !== null) return;
    e.clipboardData.setData('text/plain', catatSalinan(false));
    e.preventDefault();
  }

  function onCut(e: React.ClipboardEvent) {
    if (editing !== null) return;
    e.clipboardData.setData('text/plain', catatSalinan(true));
    e.preventDefault();
  }

  function onPaste(e: React.ClipboardEvent) {
    if (editing !== null) return;
    const teks = e.clipboardData.getData('text/plain');
    if (teks === '') return;
    e.preventDefault();
    tempelTeks(teks);
  }

  async function salinTombol() {
    const teks = catatSalinan(false);
    try {
      await navigator.clipboard.writeText(teks);
    } catch {
      // Clipboard API bisa ditolak browser; Ctrl+C di grid tetap berfungsi.
    }
  }

  async function tempelTombol() {
    if (salinan.current) {
      tempelTeks(salinan.current.teks);
      return;
    }
    try {
      tempelTeks(await navigator.clipboard.readText());
    } catch {
      // Izin clipboard ditolak; gunakan Ctrl+V di grid.
    }
  }

  function sisipBaris() {
    onChange(ubahStruktur(workbook, idx, 'baris', blok.r1, blok.r2 - blok.r1 + 1));
  }
  function hapusBaris() {
    onChange(ubahStruktur(workbook, idx, 'baris', blok.r1, -(blok.r2 - blok.r1 + 1)));
  }
  function sisipKolom() {
    onChange(ubahStruktur(workbook, idx, 'kolom', blok.c1, blok.c2 - blok.c1 + 1));
  }
  function hapusKolom() {
    onChange(ubahStruktur(workbook, idx, 'kolom', blok.c1, -(blok.c2 - blok.c1 + 1)));
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    if (editing !== null) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl) {
      const k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); if (e.shiftKey) onRedo(); else onUndo(); return; }
      if (k === 'y') { e.preventDefault(); onRedo(); return; }
      if (k === 'b') { e.preventDefault(); terapkanGaya({ b: gayaAktif?.b ? null : true }); return; }
      if (k === 'i') { e.preventDefault(); terapkanGaya({ i: gayaAktif?.i ? null : true }); return; }
      if (k === 'f' || k === 'h') { e.preventDefault(); setCariBuka(true); return; }
      if (k === 'a') {
        e.preventDefault();
        setAnchor({ col: 0, row: 0 });
        setActive({ col: sheet.cols - 1, row: sheet.rows - 1 });
      }
      return;
    }
    switch (e.key) {
      case 'ArrowUp': pindah(0, -1, e.shiftKey); break;
      case 'ArrowDown': pindah(0, 1, e.shiftKey); break;
      case 'ArrowLeft': pindah(-1, 0, e.shiftKey); break;
      case 'ArrowRight': pindah(1, 0, e.shiftKey); break;
      case 'Tab': pindah(e.shiftKey ? -1 : 1, 0); break;
      case 'Enter':
      case 'F2':
        setEditing(rawActive);
        break;
      case 'Delete':
      case 'Backspace':
        kosongkanBlok();
        break;
      default:
        // Mengetik langsung menimpa isi sel, seperti di Excel.
        if (e.key.length === 1 && !e.altKey) {
          setEditing(e.key);
          e.preventDefault();
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

  function klikSel(c: number, r: number, shift: boolean) {
    // Mode tunjuk: saat mengetik rumus dan kursor di posisi operator, klik sel menyisipkan alamatnya.
    if (editing !== null && editing.startsWith('=') && OPERATOR_AKHIR.test(editing)) {
      setEditing(editing + cellKey(c, r));
      return;
    }
    if (editing !== null) tulis(activeKey, editing);
    setEditing(null);
    setActive({ col: c, row: r });
    if (!shift) setAnchor({ col: c, row: r });
    memilih.current = true;
    wrapRef.current?.focus();
  }

  function pilihKolom(c: number) {
    setEditing(null);
    setAnchor({ col: c, row: 0 });
    setActive({ col: c, row: sheet.rows - 1 });
    wrapRef.current?.focus();
  }

  function pilihBaris(r: number) {
    setEditing(null);
    setAnchor({ col: 0, row: r });
    setActive({ col: sheet.cols - 1, row: r });
    wrapRef.current?.focus();
  }

  function hoverSel(c: number, r: number) {
    const asal = isiAsal.current;
    if (asal) {
      const dy = r > asal.r2 ? r - asal.r2 : r < asal.r1 ? r - asal.r1 : 0;
      const dx = c > asal.c2 ? c - asal.c2 : c < asal.c1 ? c - asal.c1 : 0;
      if (dy !== 0 && Math.abs(dy) >= Math.abs(dx)) {
        setIsiTarget({ ...asal, r1: dy < 0 ? r : asal.r1, r2: dy > 0 ? r : asal.r2 });
      } else if (dx !== 0) {
        setIsiTarget({ ...asal, c1: dx < 0 ? c : asal.c1, c2: dx > 0 ? c : asal.c2 });
      } else {
        setIsiTarget(asal);
      }
      return;
    }
    if (memilih.current) setActive({ col: c, row: r });
  }

  // ------------------------------------------------------------ cari & ganti

  function semuaKunciUrut(): string[] {
    return Object.keys(sheet.cells).sort((a, b) => {
      const pa = a.match(/^([A-Z]+)(\d+)$/)!;
      const pb = b.match(/^([A-Z]+)(\d+)$/)!;
      const ra = Number(pa[2]);
      const rb = Number(pb[2]);
      if (ra !== rb) return ra - rb;
      return pa[1]!.length - pb[1]!.length || pa[1]!.localeCompare(pb[1]!);
    });
  }

  function cocok(raw: string): boolean {
    return cariTeks !== '' && raw.toLowerCase().includes(cariTeks.toLowerCase());
  }

  function pilihKunci(key: string) {
    const m = key.match(/^([A-Z]+)(\d+)$/)!;
    let col = 0;
    for (const ch of m[1]!) col = col * 26 + (ch.charCodeAt(0) - 64);
    const pos = { col: col - 1, row: Number(m[2]) - 1 };
    setActive(pos);
    setAnchor(pos);
  }

  function cariBerikutnya() {
    const kunci = semuaKunciUrut().filter((k) => cocok(sheet.cells[k] ?? ''));
    if (kunci.length === 0) {
      setCariInfo('Tidak ditemukan');
      return;
    }
    const urut = semuaKunciUrut();
    const posisi = urut.indexOf(activeKey);
    const berikut = urut.slice(posisi + 1).concat(urut.slice(0, posisi + 1)).find((k) => cocok(sheet.cells[k] ?? ''));
    if (berikut) pilihKunci(berikut);
    setCariInfo(`${kunci.length} sel cocok`);
  }

  function gantiDi(raw: string): string {
    return raw.replace(new RegExp(escapeRegex(cariTeks), 'gi'), () => gantiTeks);
  }

  function gantiSatu() {
    if (!cocok(rawActive)) {
      cariBerikutnya();
      return;
    }
    onChange(tulisSel(workbook, idx, { [activeKey]: rapikanRumus(gantiDi(rawActive)) }));
  }

  function gantiSemua() {
    const ubah: Record<string, string> = {};
    for (const [key, raw] of Object.entries(sheet.cells)) if (cocok(raw)) ubah[key] = rapikanRumus(gantiDi(raw));
    const jumlah = Object.keys(ubah).length;
    if (jumlah > 0) onChange(tulisSel(workbook, idx, ubah));
    setCariInfo(`${jumlah} sel diganti`);
  }

  // ------------------------------------------------------------------- sheet

  function tabKlikGanda(i: number) {
    const nama = window.prompt('Nama sheet baru:', workbook.sheets[i]!.name);
    if (nama !== null) onChange(gantiNamaSheet(workbook, i, nama));
  }

  function tabHapus() {
    if (workbook.sheets.length <= 1) return;
    if (!window.confirm(`Hapus sheet "${sheet.name}"? Rumus yang merujuk ke sheet ini menjadi #REF!.`)) return;
    onChange(hapusSheet(workbook, idx));
    setSheetIdx(Math.max(0, idx - 1));
  }

  // ------------------------------------------------------------------ status

  const statistik = useMemo(() => {
    const angka: number[] = [];
    for (let r = blok.r1; r <= blok.r2; r++) {
      for (let c = blok.c1; c <= blok.c2; c++) {
        const v = values.get(cellKey(c, r));
        if (typeof v === 'number') angka.push(v);
      }
    }
    const jumlah = angka.reduce((s, v) => s + v, 0);
    return { n: angka.length, jumlah, rata: angka.length ? jumlah / angka.length : 0 };
  }, [values, blok.c1, blok.c2, blok.r1, blok.r2]);

  const lebar = (c: number) => (resizing?.sumbu === 'kolom' && resizing.index === c ? Math.max(30, resizing.ukuran) : lebarKolom(sheet, c));
  const tinggi = (r: number) => (resizing?.sumbu === 'baris' && resizing.index === r ? Math.max(16, resizing.ukuran) : tinggiBaris(sheet, r));
  const dalamBlok = (c: number, r: number) => c >= blok.c1 && c <= blok.c2 && r >= blok.r1 && r <= blok.r2;
  const dalamIsi = (c: number, r: number) =>
    isiTarget !== null && c >= isiTarget.c1 && c <= isiTarget.c2 && r >= isiTarget.r1 && r <= isiTarget.r2;

  function tombol(label: string, judul: string, onClick: () => void, opts?: { aktif?: boolean; mati?: boolean }) {
    return (
      <button
        type="button"
        title={judul}
        aria-label={judul}
        disabled={opts?.mati}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        style={{ ...tombolStyle, ...(opts?.aktif ? tombolAktif : null), opacity: opts?.mati ? 0.4 : 1 }}
      >
        {label}
      </button>
    );
  }

  const nilaiAktif = values.get(activeKey);

  return (
    <div style={{ border: '1px solid #c8c8c8', background: '#fff' }} onMouseUp={() => { memilih.current = false; }}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        {tombol('↶', 'Urungkan (Ctrl+Z)', onUndo, { mati: !canUndo })}
        {tombol('↷', 'Ulangi (Ctrl+Y)', onRedo, { mati: !canRedo })}
        <span style={pemisah} />
        {tombol('📋', 'Salin (Ctrl+C)', () => void salinTombol())}
        {tombol('📥', 'Tempel (Ctrl+V)', () => void tempelTombol())}
        <span style={pemisah} />
        {tombol('B', 'Tebal (Ctrl+B)', () => terapkanGaya({ b: gayaAktif?.b ? null : true }), { aktif: gayaAktif?.b })}
        {tombol('I', 'Miring (Ctrl+I)', () => terapkanGaya({ i: gayaAktif?.i ? null : true }), { aktif: gayaAktif?.i })}
        {tombol('⇤', 'Rata kiri', () => terapkanGaya({ al: 'left' }), { aktif: gayaAktif?.al === 'left' })}
        {tombol('↔', 'Rata tengah', () => terapkanGaya({ al: 'center' }), { aktif: gayaAktif?.al === 'center' })}
        {tombol('⇥', 'Rata kanan', () => terapkanGaya({ al: 'right' }), { aktif: gayaAktif?.al === 'right' })}
        {tombol('▦', 'Garis tepi', () => terapkanGaya({ border: gayaAktif?.border ? null : true }), { aktif: gayaAktif?.border })}
        <label style={warnaLabel} title="Warna isi sel">
          🎨
          <input
            type="color"
            aria-label="Warna isi sel"
            value={gayaAktif?.fill ?? '#ffffff'}
            onChange={(e) => terapkanGaya({ fill: e.target.value })}
            style={warnaInput}
          />
        </label>
        {tombol('∅', 'Hapus warna isi', () => terapkanGaya({ fill: null }))}
        <label style={warnaLabel} title="Warna teks">
          <span style={{ fontWeight: 700, color: gayaAktif?.color ?? '#000' }}>A</span>
          <input
            type="color"
            aria-label="Warna teks"
            value={gayaAktif?.color ?? '#000000'}
            onChange={(e) => terapkanGaya({ color: e.target.value })}
            style={warnaInput}
          />
        </label>
        <select
          aria-label="Format angka"
          value={gayaAktif?.fmt ?? 'umum'}
          onChange={(e) => terapkanGaya({ fmt: e.target.value === 'umum' ? null : (e.target.value as NumFmt) })}
          style={{ height: '1.7rem', fontSize: '0.8rem' }}
        >
          {(Object.keys(FORMAT_ANGKA) as NumFmt[]).map((f) => (
            <option key={f} value={f}>{FORMAT_ANGKA[f]}</option>
          ))}
        </select>
        <span style={pemisah} />
        {tombol('＋▤', 'Sisipkan baris di atas', sisipBaris)}
        {tombol('－▤', 'Hapus baris terpilih', hapusBaris)}
        {tombol('＋▥', 'Sisipkan kolom di kiri', sisipKolom)}
        {tombol('－▥', 'Hapus kolom terpilih', hapusKolom)}
        <span style={pemisah} />
        {tombol('🔍', 'Cari & ganti (Ctrl+F)', () => setCariBuka((b) => !b), { aktif: cariBuka })}
      </div>

      {cariBuka && (
        <div style={{ ...toolbarStyle, background: '#fffbe6' }}>
          <input
            aria-label="Cari"
            placeholder="Cari…"
            value={cariTeks}
            onChange={(e) => { setCariTeks(e.target.value); setCariInfo(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') cariBerikutnya(); }}
            style={{ height: '1.7rem' }}
          />
          <input
            aria-label="Ganti dengan"
            placeholder="Ganti dengan…"
            value={gantiTeks}
            onChange={(e) => setGantiTeks(e.target.value)}
            style={{ height: '1.7rem' }}
          />
          <button type="button" className="btn btn--sm btn--ghost" onClick={cariBerikutnya} style={{ border: '1px solid var(--color-border)' }}>Cari berikutnya</button>
          <button type="button" className="btn btn--sm btn--ghost" onClick={gantiSatu} style={{ border: '1px solid var(--color-border)' }}>Ganti</button>
          <button type="button" className="btn btn--sm btn--ghost" onClick={gantiSemua} style={{ border: '1px solid var(--color-border)' }}>Ganti semua</button>
          <span style={{ fontSize: '0.8rem', color: '#555' }}>{cariInfo}</span>
        </div>
      )}

      {/* Kotak nama + formula bar */}
      <div style={{ ...toolbarStyle, gap: '0.5rem', borderBottom: '1px solid #c8c8c8' }}>
        <strong style={{ minWidth: '4.5rem', textAlign: 'center', borderRight: '1px solid #c8c8c8', fontSize: '0.85rem' }}>
          {satuSel ? activeKey : `${cellKey(blok.c1, blok.r1)}:${cellKey(blok.c2, blok.r2)}`}
        </strong>
        <span style={{ fontStyle: 'italic', color: '#666' }}>fx</span>
        <input
          ref={barRef}
          aria-label="Isi sel"
          value={editing ?? rawActive}
          onFocus={() => { if (editing === null) setEditing(rawActive); }}
          onChange={(e) => setEditing(e.target.value)}
          onKeyDown={onEditKeyDown}
          onBlur={() => selesaiEdit(true, 0, 0)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Consolas, monospace', fontSize: '0.85rem' }}
        />
      </div>

      {/* Grid */}
      <div
        ref={wrapRef}
        tabIndex={0}
        onKeyDown={onGridKeyDown}
        onCopy={onCopy}
        onCut={onCut}
        onPaste={onPaste}
        style={{ overflow: 'auto', maxHeight: '60vh', outline: 'none', background: '#fff' }}
      >
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.85rem', fontFamily: 'Calibri, "Segoe UI", sans-serif' }}>
          <colgroup>
            <col style={{ width: LEBAR_HEADER_BARIS }} />
            {Array.from({ length: sheet.cols }, (_, c) => (
              <col key={c} style={{ width: lebar(c) }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ height: TINGGI_HEADER }}>
              <th
                onMouseDown={() => { setAnchor({ col: 0, row: 0 }); setActive({ col: sheet.cols - 1, row: sheet.rows - 1 }); wrapRef.current?.focus(); }}
                style={{ ...headerStyle, left: 0, zIndex: 4, cursor: 'pointer' }}
                title="Pilih semua"
              />
              {Array.from({ length: sheet.cols }, (_, c) => {
                const terpilih = c >= blok.c1 && c <= blok.c2;
                return (
                  <th
                    key={c}
                    onMouseDown={() => pilihKolom(c)}
                    style={{ ...headerStyle, ...(terpilih ? headerAktif : null), cursor: 'pointer', position: 'sticky' }}
                  >
                    {columnLabel(c)}
                    <span
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizing({ sumbu: 'kolom', index: c, mulai: e.clientX, ukuranAwal: lebarKolom(sheet, c), ukuran: lebarKolom(sheet, c) });
                      }}
                      style={{ position: 'absolute', top: 0, right: -3, width: 7, height: '100%', cursor: 'col-resize', zIndex: 5 }}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: sheet.rows }, (_, r) => (
              <tr key={r} style={{ height: tinggi(r) }}>
                <th
                  onMouseDown={() => pilihBaris(r)}
                  style={{ ...rowHeaderStyle, ...(r >= blok.r1 && r <= blok.r2 ? headerAktif : null), cursor: 'pointer' }}
                >
                  {r + 1}
                  <span
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizing({ sumbu: 'baris', index: r, mulai: e.clientY, ukuranAwal: tinggiBaris(sheet, r), ukuran: tinggiBaris(sheet, r) });
                    }}
                    style={{ position: 'absolute', left: 0, bottom: -3, height: 7, width: '100%', cursor: 'row-resize', zIndex: 5 }}
                  />
                </th>
                {Array.from({ length: sheet.cols }, (_, c) => {
                  const key = cellKey(c, r);
                  const isActive = c === active.col && r === active.row;
                  const gaya = sheet.styles[key];
                  const nilai: SheetValue | undefined = values.get(key);
                  const terpilihBlok = dalamBlok(c, r) && !satuSel;
                  const akhirBlok = c === blok.c2 && r === blok.r2;
                  return (
                    <td
                      key={c}
                      onMouseDown={(e) => {
                        if (e.button === 2) return;
                        klikSel(c, r, e.shiftKey);
                      }}
                      onMouseEnter={() => hoverSel(c, r)}
                      onDoubleClick={() => setEditing(sheet.cells[key] ?? '')}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!dalamBlok(c, r)) {
                          setActive({ col: c, row: r });
                          setAnchor({ col: c, row: r });
                        }
                        wrapRef.current?.focus();
                        setMenu({ x: e.clientX, y: e.clientY });
                      }}
                      style={{
                        ...cellStyle,
                        position: 'relative',
                        textAlign: gaya?.al ?? rataBawaan(nilai),
                        fontWeight: gaya?.b ? 700 : undefined,
                        fontStyle: gaya?.i ? 'italic' : undefined,
                        color: nilai !== undefined && isSheetError(nilai) ? '#b91c1c' : gaya?.color,
                        backgroundColor: gaya?.fill ?? '#fff',
                        backgroundImage: terpilihBlok ? 'linear-gradient(rgba(33,115,70,0.16), rgba(33,115,70,0.16))' : undefined,
                        border: gaya?.border ? '1px solid #000' : '1px solid #d4d4d4',
                        outline: isActive
                          ? `2px solid ${HIJAU}`
                          : dalamIsi(c, r)
                            ? `1px dashed ${HIJAU}`
                            : undefined,
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
                        tampilkanNilai(nilai, gaya?.fmt)
                      )}
                      {akhirBlok && editing === null && (
                        <span
                          title="Seret untuk mengisi sel"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            isiAsal.current = blok;
                            setIsiTarget(blok);
                          }}
                          style={{ position: 'absolute', right: -4, bottom: -4, width: 8, height: 8, background: HIJAU, border: '1px solid #fff', cursor: 'crosshair', zIndex: 3 }}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tab sheet */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, background: '#f3f3f3', borderTop: '1px solid #c8c8c8', padding: '0 0.25rem', overflowX: 'auto' }}>
        {workbook.sheets.map((s, i) => (
          <button
            key={s.name}
            type="button"
            onClick={() => { setSheetIdx(i); setEditing(null); wrapRef.current?.focus(); }}
            onDoubleClick={() => tabKlikGanda(i)}
            title="Klik ganda untuk mengganti nama"
            style={{
              border: 'none',
              borderBottom: i === idx ? `3px solid ${HIJAU}` : '3px solid transparent',
              background: i === idx ? '#fff' : 'transparent',
              color: i === idx ? HIJAU : '#333',
              fontWeight: i === idx ? 700 : 400,
              padding: '0.3rem 0.9rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {s.name}
          </button>
        ))}
        <button type="button" title="Tambah sheet" aria-label="Tambah sheet" onClick={() => { onChange(tambahSheet(workbook)); setSheetIdx(workbook.sheets.length); }} style={{ ...tombolStyle, margin: '0.2rem' }}>＋</button>
        {workbook.sheets.length > 1 && (
          <button type="button" title="Hapus sheet ini" aria-label="Hapus sheet ini" onClick={tabHapus} style={{ ...tombolStyle, margin: '0.2rem' }}>🗑</button>
        )}
      </div>

      {/* Bar status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.2rem 0.6rem', background: HIJAU, color: '#fff', fontSize: '0.78rem' }}>
        <span>{editing !== null ? 'Edit' : 'Siap'}{nilaiAktif !== undefined && typeof nilaiAktif === 'string' && isSheetError(nilaiAktif) ? ` — ${nilaiAktif}` : ''}</span>
        {statistik.n > 1 && (
          <span>
            Rata-rata: {tampilkanNilai(statistik.rata)} &nbsp; Hitung: {statistik.n} &nbsp; Jumlah: {tampilkanNilai(statistik.jumlah)}
          </span>
        )}
      </div>

      {menu && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 50, background: '#fff', border: '1px solid #c8c8c8', boxShadow: '0 4px 14px rgba(0,0,0,.2)', minWidth: 190, padding: '0.2rem 0' }}
        >
          {[
            ['Salin', () => void salinTombol()],
            ['Potong', () => { catatSalinan(true); }],
            ['Tempel', () => void tempelTombol()],
            ['Sisipkan baris di atas', sisipBaris],
            ['Hapus baris', hapusBaris],
            ['Sisipkan kolom di kiri', sisipKolom],
            ['Hapus kolom', hapusKolom],
            ['Hapus isi', kosongkanBlok],
          ].map(([label, aksi]) => (
            <button
              key={label as string}
              type="button"
              onClick={() => { (aksi as () => void)(); setMenu(null); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '0.3rem 0.9rem', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {label as string}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', padding: '0.3rem 0.5rem',
  background: '#f3f3f3', borderBottom: '1px solid #dcdcdc',
};
const tombolStyle: React.CSSProperties = {
  minWidth: '1.9rem', height: '1.7rem', border: '1px solid transparent', borderRadius: 3, background: 'transparent',
  cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.3rem',
};
const tombolAktif: React.CSSProperties = { background: '#d3f0e0', border: `1px solid ${HIJAU}` };
const pemisah: React.CSSProperties = { width: 1, height: '1.4rem', background: '#c8c8c8', margin: '0 0.25rem' };
const warnaLabel: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer', fontSize: '0.85rem' };
const warnaInput: React.CSSProperties = { width: 22, height: 22, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' };
// Sisi dipisah (bukan shorthand border) agar headerAktif bisa menimpa borderBottom tanpa peringatan React.
const garisHeader: React.CSSProperties = {
  borderTop: '1px solid #d4d4d4', borderRight: '1px solid #d4d4d4',
  borderBottom: '1px solid #d4d4d4', borderLeft: '1px solid #d4d4d4',
};
const headerStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 2, background: '#f3f3f3', ...garisHeader,
  padding: '0 0.2rem', fontWeight: 400, color: '#444', height: TINGGI_HEADER,
};
const rowHeaderStyle: React.CSSProperties = {
  position: 'sticky', left: 0, zIndex: 1, background: '#f3f3f3', ...garisHeader,
  padding: '0 0.3rem', fontWeight: 400, color: '#444', textAlign: 'center',
};
const headerAktif: React.CSSProperties = { background: '#d3f0e0', color: HIJAU, fontWeight: 700, borderBottom: `2px solid ${HIJAU}` };
const cellStyle: React.CSSProperties = {
  padding: '0 0.4rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'cell', userSelect: 'none',
};
