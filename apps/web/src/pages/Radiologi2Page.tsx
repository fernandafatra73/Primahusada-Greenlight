import { useMemo, useState } from 'react';
import {
  RadiologWorklistContextMenu,
  type RadiologWorklistMenuAction,
} from '../components/ui/RadiologWorklistContextMenu.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiPatch } from '../lib/api.ts';
import { clampClinicalInput } from '../lib/clinicalText.ts';
import { formatDateShort, formatUmurDetail } from '../lib/format.ts';
import { formatRadiologName } from '../lib/pasienPrint.ts';
import { formatKlinisDisplay, parseKlinisData } from '../lib/penunjang.ts';
import { printRadiologyReport } from '../pdf/printRadiologyReport.tsx';
import './radiologi2.css';

interface WorklistItem {
  readonly id: string;
  readonly regCode: string;
  readonly nama: string;
  readonly umur: number;
  readonly tanggalLahir: string;
  readonly alamat: string | null;
  readonly pengirimNama: string;
  readonly radiologNama: string | null;
  readonly klinis: string | null;
  readonly kesan: string | null;
  readonly hasilStatus: 'MENUNGGU_HASIL' | 'SELESAI';
  readonly pemeriksaanNama: string;
  readonly createdAt: string;
}

type MainTab = 'radiology' | 'technician';
type Modality = 'CT' | 'DX' | 'US';

const DATE_RANGE_OPTIONS = [
  { id: 'today', label: 'Hari ini', days: 0 },
  { id: '3days', label: '3 Days', days: 3 },
  { id: '1week', label: '1 Week', days: 7 },
  { id: '1month', label: '1 Month', days: 30 },
  { id: 'all', label: 'Semua', days: null },
] as const;

const ACTION_LABEL: Record<RadiologWorklistMenuAction, string> = {
  'new-add-tab': 'New › Add Tab',
  'related-replace-tab': 'Related › Replace Tab',
  'related-add-tab': 'Related › Add Tab',
  verify: 'Verify',
  unverify: 'Unverify',
  teleradiology: 'Teleradiology',
  'ai-request': 'AI Request',
  export: 'Export',
  download: 'Download',
  copy: 'Copy',
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toBirthDateCode(tanggalLahir: string): string {
  const d = new Date(tanggalLahir);
  if (isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function toStudyDate(createdAt: string): string {
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function guessBodyPart(pemeriksaanNama: string): string {
  const lower = pemeriksaanNama.toLowerCase();
  if (lower.includes('extremitas') || lower.includes('hand') || lower.includes('tangan')) return 'HAND';
  if (lower.includes('cranium') || lower.includes('kepala')) return 'HEAD';
  return '-';
}

function combinedPemeriksaan(item: WorklistItem): string {
  const parsed = parseKlinisData(item.klinis);
  const list = [
    ...(item.pemeriksaanNama ? item.pemeriksaanNama.split(', ').filter(Boolean) : []),
    ...parsed.radTambahan.map((r) => `+Rad: ${r}`),
    ...parsed.labTambahan.map((l) => `+Lab: ${l}`),
  ];
  return list.join(', ') || '—';
}

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

interface ContextMenuState {
  readonly x: number;
  readonly y: number;
  readonly item: WorklistItem;
}

/** Halaman worklist "Radiologi2" — meniru tampilan workstation PACS/RIS:
 * bar filter chip, tab Radiology/Technician + pencarian + chip modality,
 * grid worklist dengan filter per kolom, dan panel "Report window" di kanan
 * (thumbnail, clinical info, reading template, editor findings). Fitur yang
 * tidak punya padanan nyata di backend (Filmbox, AI Report, Teleradiology,
 * dsb.) ditampilkan sebagai aksi stub yang tetap bisa diklik. */
export function Radiologi2Page() {
  const { search, setSearch } = useListSearch();
  const [mainTab, setMainTab] = useState<MainTab>('radiology');
  const [modality, setModality] = useState<Modality>('DX');
  const [dateRangeId, setDateRangeId] = useState<(typeof DATE_RANGE_OPTIONS)[number]['id']>('3days');
  const [chips, setChips] = useState<string[]>(['RS.SKW', 'RS.SKW', 'DR.DONNY']);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [findings, setFindings] = useState<string>('');
  const [findingsDirty, setFindingsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportTab, setReportTab] = useState<'thumbnail' | 'ai' | 'image'>('thumbnail');
  const [subTab, setSubTab] = useState<'all' | 'modal' | 'body' | 'bodybody'>('modal');

  const dateFilters = useMemo((): { startDate?: string; endDate?: string } => {
    const opt = DATE_RANGE_OPTIONS.find((o) => o.id === dateRangeId);
    if (!opt || opt.days === null) return {};
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - opt.days);
    return { startDate: toDateInputValue(start), endDate: toDateInputValue(now) };
  }, [dateRangeId]);

  const queryParams = useListQueryParams(
    {
      modul: 'RADIOLOGI',
      ...(mainTab === 'technician' ? { hasilStatus: 'SELESAI' } : {}),
      ...(dateFilters.startDate ? { startDate: dateFilters.startDate } : {}),
      ...(dateFilters.endDate ? { endDate: dateFilters.endDate } : {}),
    },
    search,
  );

  const { items, loading, error, reload } = usePaginatedList<WorklistItem>('/api/pasien-duplikat', queryParams);

  // Modality di data hanya "DX" (rontgen konvensional) — chip CT/US belum
  // punya data nyata, jadi tetap ditampilkan sebagai filter yang mengosongkan
  // hasil daripada berpura-pura ada datanya.
  const visibleItems = useMemo(() => items.filter(() => modality === 'DX'), [items, modality]);

  const selected = visibleItems.find((it) => it.id === selectedId) ?? null;

  function selectRow(item: WorklistItem) {
    setSelectedId(item.id);
    setFindings(item.kesan ?? '');
    setFindingsDirty(false);
  }

  function openContextMenu(e: React.MouseEvent, item: WorklistItem) {
    e.preventDefault();
    selectRow(item);
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }

  function handleMenuAction(action: RadiologWorklistMenuAction) {
    if (!contextMenu) return;
    setLastAction(`${ACTION_LABEL[action]} — ${contextMenu.item.nama} (${contextMenu.item.regCode})`);
  }

  function handleReportToolbarAction(label: string) {
    if (!selected) return;
    setLastAction(`${label} — ${selected.nama} (${selected.regCode})`);
  }

  async function handleSaveFindings() {
    if (!selected) return;
    setSaving(true);
    try {
      await apiPatch(`/api/pasien-duplikat/${selected.id}`, { kesan: findings });
      setFindingsDirty(false);
      setLastAction(`Save — ${selected.nama} (${selected.regCode})`);
      await reload();
    } catch (err: unknown) {
      setLastAction(`Gagal menyimpan: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handlePrint() {
    if (!selected) return;
    await printRadiologyReport({
      regCode: selected.regCode,
      nama: selected.nama,
      umurLabel: formatUmurDetail(selected.tanggalLahir, selected.createdAt),
      tanggal: formatDateShort(selected.createdAt),
      alamat: selected.alamat?.trim() || '—',
      pemeriksaan: combinedPemeriksaan(selected),
      dokterPengirim: selected.pengirimNama,
      klinis: formatKlinisDisplay(selected.klinis) || '—',
      kesan: findings.trim() || '—',
      radiologNama: formatRadiologName(selected.radiologNama),
    });
    setLastAction(`Print — ${selected.nama} (${selected.regCode})`);
  }

  function removeChip(idx: number) {
    setChips((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearFilters() {
    setSearch('');
    setDateRangeId('all');
    setChips([]);
  }

  const w = items.filter((i) => i.hasilStatus === 'MENUNGGU_HASIL').length;
  const a = items.length;

  return (
    <div className="r2-shell">
      {lastAction && (
        <div className="r2-lastaction">
          <span>✅ {lastAction}</span>
          <button type="button" onClick={() => setLastAction(null)}>✕</button>
        </div>
      )}

      <div className="r2-filterbar">
        <button type="button" className="r2-btn r2-btn--icon" title="Kembali">◀</button>
        {chips.map((chip, idx) => (
          <span className="r2-chip" key={`${chip}-${idx}`}>
            {chip}
            <button type="button" onClick={() => removeChip(idx)} title="Hapus filter">✕</button>
          </span>
        ))}
        <div className="r2-filterbar__spacer" />
        <button type="button" className="r2-btn" onClick={() => void reload()}>▶ Refresh</button>
        <button
          type="button"
          className="r2-btn"
          onClick={() => setLastAction('Save Filter — filter saat ini disimpan')}
        >
          Save Filter
        </button>
        <button type="button" className="r2-btn" onClick={clearFilters}>Clear</button>
      </div>

      <div className="r2-tabsbar">
        <div className="r2-tabs">
          <button
            type="button"
            className={mainTab === 'radiology' ? 'is-active' : ''}
            onClick={() => setMainTab('radiology')}
          >
            Radiology
          </button>
          <button
            type="button"
            className={mainTab === 'technician' ? 'is-active' : ''}
            onClick={() => setMainTab('technician')}
          >
            Technician
          </button>
        </div>
        <div className="r2-search">
          🔍
          <input placeholder="ID or Name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button type="button" className="r2-btn r2-btn--icon">◀</button>
        <select
          className="r2-select"
          value={dateRangeId}
          onChange={(e) => setDateRangeId(e.target.value as (typeof DATE_RANGE_OPTIONS)[number]['id'])}
        >
          {DATE_RANGE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        {(['CT', 'DX', 'US'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`r2-modality-btn${modality === m ? ' is-active' : ''}`}
            onClick={() => setModality(m)}
          >
            {m}
          </button>
        ))}
        <div className="r2-tabsbar__spacer" />
        <button type="button" className="r2-btn r2-btn--icon">▶</button>
        <button type="button" className="r2-btn r2-btn--icon">☰</button>
        <button type="button" className="r2-btn r2-btn--icon">⋮</button>
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      <div className="r2-main">
        <div className="r2-worklist">
          <div className="r2-worklist__scroll">
            <table className="r2-table">
              <thead>
                <tr>
                  <th>PF</th>
                  <th>BirthDate</th>
                  <th>Sex</th>
                  <th>Modality</th>
                  <th>Modality Group</th>
                  <th>BodyPart</th>
                  <th>StudyDesc</th>
                  <th>StudyDate</th>
                  <th>Verify</th>
                </tr>
                <tr className="r2-filterrow">
                  <th></th>
                  <th><input /></th>
                  <th><input /></th>
                  <th><input defaultValue={modality} readOnly /></th>
                  <th><input /></th>
                  <th><input /></th>
                  <th><input placeholder="cari…" value={search} onChange={(e) => setSearch(e.target.value)} /></th>
                  <th><input /></th>
                  <th><input /></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="r2-empty">Memuat data…</td>
                  </tr>
                ) : visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="r2-empty">Tidak ada data worklist.</td>
                  </tr>
                ) : (
                  visibleItems.map((item) => (
                    <tr
                      key={item.id}
                      className={selectedId === item.id ? 'is-selected' : ''}
                      onClick={() => selectRow(item)}
                      onContextMenu={(e) => openContextMenu(e, item)}
                    >
                      <td></td>
                      <td>{toBirthDateCode(item.tanggalLahir)}</td>
                      <td>—</td>
                      <td>{modality}</td>
                      <td>Unknown</td>
                      <td>{guessBodyPart(item.pemeriksaanNama)}</td>
                      <td>{item.pemeriksaanNama || '—'}</td>
                      <td>{toStudyDate(item.createdAt)}</td>
                      <td>{item.radiologNama ? formatRadiologName(item.radiologNama) : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="r2-statusbar">
            <span>Filter : RS(W) / VerifyTo(donny)</span>
            <span>
              W:<strong>{w}</strong> A:<strong>{a}</strong> H,O:<strong>0</strong> T:<strong>0</strong> P:<strong>0</strong>
            </span>
          </div>

          <div className="r2-subtabs">
            <button type="button" className={subTab === 'all' ? 'is-active' : ''} onClick={() => setSubTab('all')}>
              All
            </button>
            <button type="button" className={subTab === 'modal' ? 'is-active' : ''} onClick={() => setSubTab('modal')}>
              Modal
            </button>
            <button type="button" className={subTab === 'body' ? 'is-active' : ''} onClick={() => setSubTab('body')}>
              Body
            </button>
            <button
              type="button"
              className={subTab === 'bodybody' ? 'is-active' : ''}
              onClick={() => setSubTab('bodybody')}
            >
              Body &amp; Body
            </button>
            <span className="r2-subtabs__meta">
              {selected ? `${selected.regCode}, ${selected.nama}, ${selected.umur}th — Count (0/0)` : 'Count (0/0)'}
            </span>
          </div>
          <div className="r2-subtable-wrap">
            <table className="r2-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Viewing</th>
                  <th>Count</th>
                  <th>EM</th>
                  <th>RS</th>
                  <th>BodyPart</th>
                  <th>Modality</th>
                  <th>StudyDate</th>
                  <th>RepDoc</th>
                  <th>Confirm</th>
                  <th>ReqDate</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={11} className="r2-empty">No records found</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="r2-reportwindow">
          <div className="r2-reportwindow__header">
            Report window
            <span>{selected ? `${selected.regCode} ${selected.nama} ${selected.umur}th` : 'Tidak ada baris dipilih'}</span>
          </div>
          <div className="r2-reportwindow__tabs">
            <button type="button" className={reportTab === 'thumbnail' ? 'is-active' : ''} onClick={() => setReportTab('thumbnail')}>
              Thumbnail
            </button>
            <button type="button" className={reportTab === 'ai' ? 'is-active' : ''} onClick={() => setReportTab('ai')}>
              AI Report
            </button>
            <button type="button" className={reportTab === 'image' ? 'is-active' : ''} onClick={() => setReportTab('image')}>
              Image Report
            </button>
          </div>

          <div className="r2-thumbnail">
            <span className="r2-thumbnail__badge">N/A</span>
            {selected ? '🖼️ Belum ada gambar DICOM' : 'Pilih baris di worklist'}
            <span className="r2-thumbnail__counter">1/1</span>
            <button type="button" className="r2-thumbnail__nav r2-thumbnail__nav--prev">◀</button>
            <button type="button" className="r2-thumbnail__nav r2-thumbnail__nav--next">▶</button>
          </div>

          <div className="r2-panel-block">
            <p className="r2-panel-block__title">Clinical Info</p>
            <p className="r2-panel-block__body">
              {selected ? formatKlinisDisplay(selected.klinis) || '—' : '—'}
            </p>
          </div>

          <div className="r2-panel-block">
            <p className="r2-panel-block__title">Reading Template</p>
            <div className="r2-checkrow">
              <label><input type="checkbox" /> Modality</label>
              <label><input type="checkbox" /> Bodypart</label>
              <label><input type="checkbox" /> Study Description</label>
            </div>
            <select className="r2-select" style={{ width: '100%' }} defaultValue="">
              <option value="" disabled>
                Pilih template…
              </option>
              <option value="thorax-normal">Thorax Normal (Cor &amp; Pulmo)</option>
              <option value="thorax-tb">Thorax — TB Paru Aktif</option>
              <option value="cranium">Cranium Normal / Trauma</option>
            </select>
          </div>

          <div className="r2-panel-block">
            <p className="r2-panel-block__title">
              Related Report List
              <span>DESC</span>
            </p>
            <p className="r2-panel-block__body" style={{ color: '#6b7d99' }}>
              {selected ? 'Tidak ada laporan terkait.' : '—'}
            </p>
          </div>

          <div className="r2-report">
            <p className="r2-report__title">
              {selected
                ? `${selected.regCode} ${selected.nama} ${selected.pemeriksaanNama} ${toStudyDate(selected.createdAt)}`
                : 'Report'}
            </p>
            <div className="r2-report__toolbar">
              {['Appro...', 'Edit', 'Prelim', 'Dictate', 'Trans', 'Except', 'CVR'].map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled={!selected}
                  onClick={() => handleReportToolbarAction(label)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="is-primary"
                disabled={!selected || saving}
                onClick={() => void handleSaveFindings()}
              >
                {saving ? 'Menyimpan…' : `Save${findingsDirty ? ' •' : ''}`}
              </button>
              <button type="button" disabled={!selected} onClick={() => void handlePrint()}>
                Print
              </button>
            </div>
            <p className="r2-report__findings-label">Findings</p>
            <textarea
              value={findings}
              disabled={!selected}
              placeholder={selected ? 'Isi kesan & saran radiologi...' : 'Pilih baris di worklist untuk mengisi Findings'}
              onChange={(e) => {
                setFindings(clampClinicalInput(e.target.value));
                setFindingsDirty(true);
              }}
            />
          </div>
        </div>
      </div>

      {contextMenu && (
        <RadiologWorklistContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAction={handleMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
