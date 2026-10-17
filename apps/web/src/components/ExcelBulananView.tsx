import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { ListPageShell } from './ui/ListPageShell.tsx';
import { SheetEditor } from './SheetEditor.tsx';
import { apiDelete, apiGet, apiPut } from '../lib/api.ts';
import { bangunLembarDariBulanan, type BulanUntukLembar, type LabelGaji } from '../lib/excelBulanan.ts';
import { evaluateWorkbook, parseCellKey } from '../lib/sheetFormula.ts';
import { KODE_XLSX, bacaWorkbook, lebarKolom, tinggiBaris, type Sheet, type Workbook } from '../lib/sheetModel.ts';
import './ui/ui.css';

type Modul = 'RADIOLOGI' | 'LABORATORIUM';

interface ExcelBulananViewProps {
  readonly modul: Modul;
}

const BATAS_RIWAYAT = 100;

/** Menyusun worksheet .xlsx; sel berumus ditulis sebagai rumus beserta hasil hitungnya. */
function buatWorksheet(sheet: Sheet, nilai: ReadonlyMap<string, unknown>): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  let maxCol = 0;
  let maxRow = 0;
  for (const [key, raw] of Object.entries(sheet.cells)) {
    const pos = parseCellKey(key);
    if (!pos) continue;
    maxCol = Math.max(maxCol, pos.col);
    maxRow = Math.max(maxRow, pos.row);
    const hasil = nilai.get(key);
    const z = sheet.styles[key]?.fmt;
    const format = z && z !== 'umum' ? { z: KODE_XLSX[z] } : null;
    if (raw.startsWith('=')) {
      if (typeof hasil === 'number') ws[key] = { t: 'n', f: raw.slice(1), v: hasil, ...format };
      else if (typeof hasil === 'boolean') ws[key] = { t: 'b', f: raw.slice(1), v: hasil };
      else ws[key] = { t: 's', f: raw.slice(1), v: String(hasil ?? '') };
    } else if (typeof hasil === 'number') {
      ws[key] = { t: 'n', v: hasil, ...format };
    } else {
      ws[key] = { t: 's', v: raw };
    }
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: maxCol, r: maxRow } });
  ws['!cols'] = Array.from({ length: maxCol + 1 }, (_, c) => ({ wpx: lebarKolom(sheet, c) }));
  ws['!rows'] = Array.from({ length: maxRow + 1 }, (_, r) => ({ hpx: tinggiBaris(sheet, r) }));
  return ws;
}

interface Riwayat {
  readonly lalu: readonly Workbook[];
  readonly kini: Workbook | null;
  readonly depan: readonly Workbook[];
}

const RIWAYAT_AWAL: Riwayat = { lalu: [], kini: null, depan: [] };

export function ExcelBulananView({ modul }: ExcelBulananViewProps) {
  const moduleLabel = modul === 'RADIOLOGI' ? 'Radiologi' : 'Laboratorium';
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [riwayat, setRiwayat] = useState<Riwayat>(RIWAYAT_AWAL);
  const workbook = riwayat.kini;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);

  const bangunDariData = useCallback(async (): Promise<Workbook> => {
    const [bulanan, label] = await Promise.all([
      apiGet<{ bulan: readonly BulanUntukLembar[] }>(`/api/laporan/pajak-bulanan?year=${year}&modul=${modul}`),
      apiGet<{ item: LabelGaji }>(`/api/laporan/gaji-label?modul=${modul}`),
    ]);
    return bangunLembarDariBulanan(bulanan.bulan, label.item, `Hasil Perbulan ${moduleLabel} ${year}`);
  }, [year, modul, moduleLabel]);

  const muat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const saved = await apiGet<{ workbook: unknown }>(`/api/laporan/lembar-excel?year=${year}&modul=${modul}`);
      const tersimpanWb = saved.workbook ? bacaWorkbook(saved.workbook) : null;
      if (tersimpanWb) {
        setRiwayat({ lalu: [], kini: tersimpanWb, depan: [] });
        setTersimpan(true);
        setDirty(false);
      } else {
        setRiwayat({ lalu: [], kini: await bangunDariData(), depan: [] });
        setTersimpan(false);
        // Lembar awal dari data belum ada di database sampai Simpan ditekan.
        setDirty(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat lembar Excel');
    } finally {
      setLoading(false);
    }
  }, [year, modul, bangunDariData]);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function simpan() {
    setSaving(true);
    setError(null);
    try {
      if (!workbook) return;
      await apiPut('/api/laporan/lembar-excel', { year, modul, workbook });
      setDirty(false);
      setTersimpan(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan lembar Excel');
    } finally {
      setSaving(false);
    }
  }

  async function muatUlangDariData() {
    if (!window.confirm('Lembar akan dibuat ulang dari data 12 bulan. Semua perubahan di lembar ini akan hilang. Lanjutkan?')) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiDelete(`/api/laporan/lembar-excel?year=${year}&modul=${modul}`);
      await muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat ulang dari data');
    } finally {
      setSaving(false);
    }
  }

  function unduh() {
    if (!workbook) return;
    const nilai = evaluateWorkbook(workbook.sheets.map((s) => ({ name: s.name, cells: s.cells })));
    const buku = XLSX.utils.book_new();
    workbook.sheets.forEach((s, i) => XLSX.utils.book_append_sheet(buku, buatWorksheet(s, nilai[i]!), s.name));
    XLSX.writeFile(buku, `Hasil_Perbulan_${moduleLabel}_${year}.xlsx`);
  }

  const ubahWorkbook = useCallback((next: Workbook) => {
    setRiwayat((h) => {
      if (!h.kini || h.kini === next) return h;
      return { lalu: [...h.lalu, h.kini].slice(-BATAS_RIWAYAT), kini: next, depan: [] };
    });
    setDirty(true);
  }, []);

  const urungkan = useCallback(() => {
    setRiwayat((h) => {
      const sebelum = h.lalu[h.lalu.length - 1];
      if (!sebelum || !h.kini) return h;
      return { lalu: h.lalu.slice(0, -1), kini: sebelum, depan: [h.kini, ...h.depan] };
    });
    setDirty(true);
  }, []);

  const ulangi = useCallback(() => {
    setRiwayat((h) => {
      const berikut = h.depan[0];
      if (!berikut || !h.kini) return h;
      return { lalu: [...h.lalu, h.kini], kini: berikut, depan: h.depan.slice(1) };
    });
    setDirty(true);
  }, []);

  // Peringatan sebelum menutup halaman bila ada perubahan yang belum disimpan.
  const kotor = useRef(false);
  kotor.current = dirty;
  useEffect(() => {
    const peringatan = (e: BeforeUnloadEvent) => {
      if (kotor.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', peringatan);
    return () => window.removeEventListener('beforeunload', peringatan);
  }, []);

  const yearOptions: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 5; y--) yearOptions.push(y);

  return (
    <ListPageShell
      title={`Excel Hasil Perbulan ${moduleLabel}`}
      subtitle="Data 12 bulan dalam lembar seperti Excel — beberapa sheet, format sel, rumus (SUM, IF, SUMIF, VLOOKUP, dll.), seret untuk mengisi, Ctrl+Z/Y, cari & ganti"
      onRefresh={() => void muat()}
      error={error}
      loading={loading}
      filterExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="form-field" style={{ minWidth: '130px', margin: 0 }}>
            <label htmlFor="filter-year-excel">Tahun</label>
            <select
              id="filter-year-excel"
              value={year}
              onChange={(e) => {
                if (dirty && !window.confirm('Perubahan belum disimpan akan hilang. Ganti tahun?')) return;
                setYear(Number(e.target.value));
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn--sm btn--primary" onClick={() => void simpan()} disabled={saving || loading}>
            💾 {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" className="btn btn--sm btn--secondary" onClick={unduh} disabled={loading}>
            📥 Unduh .xlsx
          </button>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => void muatUlangDariData()}
            disabled={saving || loading}
            style={{ border: '1px solid var(--color-border)' }}
            title="Buang isi lembar tersimpan dan bangun ulang dari data 12 bulan"
          >
            ↺ Muat ulang dari data
          </button>
          <span style={{ fontSize: '0.8rem', color: dirty ? '#b45309' : 'var(--color-text-muted)' }}>
            {dirty ? (tersimpan ? 'Ada perubahan belum disimpan' : 'Belum disimpan') : 'Tersimpan'}
          </span>
        </div>
      }
    >
      {workbook && (
        <SheetEditor
          workbook={workbook}
          onChange={ubahWorkbook}
          onUndo={urungkan}
          onRedo={ulangi}
          canUndo={riwayat.lalu.length > 0}
          canRedo={riwayat.depan.length > 0}
        />
      )}
    </ListPageShell>
  );
}
