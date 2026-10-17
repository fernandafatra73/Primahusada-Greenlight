import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { ListPageShell } from './ui/ListPageShell.tsx';
import { SheetGrid } from './SheetGrid.tsx';
import { apiDelete, apiGet, apiPut } from '../lib/api.ts';
import {
  JUMLAH_BARIS_GRID,
  JUMLAH_KOLOM_GRID,
  bangunLembarDariBulanan,
  type BulanUntukLembar,
  type LabelGaji,
} from '../lib/excelBulanan.ts';
import { columnIndex, evaluateSheet, type SheetCells } from '../lib/sheetFormula.ts';
import './ui/ui.css';

type Modul = 'RADIOLOGI' | 'LABORATORIUM';

interface ExcelBulananViewProps {
  readonly modul: Modul;
}

const PETA_ALAMAT = /^([A-Z]{1,3})(\d+)$/;

/** Menyusun worksheet .xlsx; sel berumus ditulis sebagai rumus beserta hasil hitungnya. */
function buatWorksheet(cells: SheetCells): XLSX.WorkSheet {
  const hasil = evaluateSheet(cells);
  const sheet: XLSX.WorkSheet = {};
  let maxCol = 0;
  let maxRow = 0;
  for (const [key, raw] of Object.entries(cells)) {
    const m = PETA_ALAMAT.exec(key);
    if (!m) continue;
    const col = columnIndex(m[1]!);
    const row = Number(m[2]) - 1;
    maxCol = Math.max(maxCol, col);
    maxRow = Math.max(maxRow, row);
    const nilai = hasil.get(key);
    if (raw.startsWith('=')) {
      sheet[key] =
        typeof nilai === 'number' ? { t: 'n', f: raw.slice(1), v: nilai } : { t: 's', v: String(nilai ?? '') };
    } else if (typeof nilai === 'number') {
      sheet[key] = { t: 'n', v: nilai };
    } else {
      sheet[key] = { t: 's', v: raw };
    }
  }
  sheet['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: maxCol, r: maxRow } });
  sheet['!cols'] = Array.from({ length: maxCol + 1 }, (_, c) => ({ wch: c === 0 ? 30 : 16 }));
  return sheet;
}

export function ExcelBulananView({ modul }: ExcelBulananViewProps) {
  const moduleLabel = modul === 'RADIOLOGI' ? 'Radiologi' : 'Laboratorium';
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [cells, setCells] = useState<SheetCells>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);

  const bangunDariData = useCallback(async (): Promise<SheetCells> => {
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
      const saved = await apiGet<{ cells: SheetCells | null }>(`/api/laporan/lembar-excel?year=${year}&modul=${modul}`);
      if (saved.cells) {
        setCells(saved.cells);
        setTersimpan(true);
        setDirty(false);
      } else {
        setCells(await bangunDariData());
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
      await apiPut('/api/laporan/lembar-excel', { year, modul, cells });
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
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, buatWorksheet(cells), `Hasil Perbulan ${year}`);
    XLSX.writeFile(workbook, `Hasil_Perbulan_${moduleLabel}_${year}.xlsx`);
  }

  const yearOptions: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 5; y--) yearOptions.push(y);

  return (
    <ListPageShell
      title={`Excel Hasil Perbulan ${moduleLabel}`}
      subtitle="Data 12 bulan dalam lembar seperti Excel — klik sel lalu ketik, F2 atau klik ganda untuk edit, rumus diawali = (SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS)"
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
      <SheetGrid
        cells={cells}
        columns={JUMLAH_KOLOM_GRID}
        rows={JUMLAH_BARIS_GRID}
        onChange={(next) => {
          setCells(next);
          setDirty(true);
        }}
      />
    </ListPageShell>
  );
}
