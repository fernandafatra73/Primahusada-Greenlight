import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { apiGet, apiPatch } from '../lib/api.ts';
import { formatRupiah } from '../lib/format.ts';
import { LaporanNeracaPage } from './LaporanNeracaPage.tsx';
import { LaporanPajakPage } from './LaporanPajakPage.tsx';
import '../components/ui/ui.css';

interface BulanPajakBulananItem {
  readonly no: number;
  readonly bulan: string;
  readonly jumlahPasien: number;
  readonly harga: number;
  readonly pendapatan: number;
  readonly biayaSewaTempat: number;
  readonly biayaListrikAir: number;
  readonly gajiFernanda: number;
  readonly gajiChalimatusadiah: number;
  readonly gajiRiki: number;
  readonly gajiAgung: number;
  readonly gajiKaryawan1: number;
  readonly gajiKaryawan2: number;
  readonly bahanRoentgen: number;
  readonly peralatanRoentgen: number;
  readonly penyusutanManual: number;
  readonly perbaikanAlat: number;
  readonly totalBebanUsaha: number;
  readonly labaBersih: number;
  readonly hargaPeralatan: number;
  readonly tarifPenyusutanTahunanPersen: number;
  readonly penyusutanPeralatanBulan: number;
  readonly akumulasiPenyusutanAwal: number;
  readonly akumulasiPenyusutanAkhir: number;
  readonly modalAwal: number;
  readonly modalAkhir: number;
  readonly kasAwal: number;
  readonly kasAkhir: number;
  readonly piutangUsaha: number;
  readonly perlengkapan: number;
  readonly utangUsaha: number;
  readonly peralatanNet: number;
  readonly jumlahAktiva: number;
  readonly modalPH: number;
  readonly modalAwalTahun: number;
  readonly kasAwalTahun: number;
  readonly akumulasiPenyusutanAwalTahun: number;
}

interface LaporanPajakBulananData {
  readonly year: number;
  readonly modul: 'RADIOLOGI' | 'LABORATORIUM';
  readonly bulan: readonly BulanPajakBulananItem[];
}

interface GajiLabelItem {
  readonly labelFernanda: string;
  readonly labelChalimatusadiah: string;
  readonly labelRiki: string;
  readonly labelAgung: string;
  readonly labelKaryawan1: string;
  readonly labelKaryawan2: string;
}

const emptyLabelForm: GajiLabelItem = {
  labelFernanda: 'Fernanda',
  labelChalimatusadiah: 'Chalimatusadiah',
  labelRiki: 'Riki',
  labelAgung: 'Agung',
  labelKaryawan1: 'Karyawan 1',
  labelKaryawan2: 'Karyawan 2',
};

type LabelKey = keyof GajiLabelItem;

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const emptyEditForm = {
  harga: '0',
  biayaSewaTempat: '0', biayaListrikAir: '0',
  gajiFernanda: '0', gajiChalimatusadiah: '0', gajiRiki: '0', gajiAgung: '0',
  gajiKaryawan1: '0', gajiKaryawan2: '0',
  bahanRoentgen: '0', peralatanRoentgen: '0', penyusutanManual: '0', perbaikanAlat: '0',
  hargaPeralatan: '0', tarifPenyusutanTahunanPersen: '10',
  piutangUsaha: '0', perlengkapan: '0', utangUsaha: '0',
  modalAwalTahun: '0', kasAwalTahun: '0', akumulasiPenyusutanAwalTahun: '0',
};

type EditForm = typeof emptyEditForm;
type EditKey = keyof EditForm;

function n(v: string): number {
  return Number(v) || 0;
}

function formToItem(item: BulanPajakBulananItem): EditForm {
  return {
    harga: String(item.harga),
    biayaSewaTempat: String(item.biayaSewaTempat), biayaListrikAir: String(item.biayaListrikAir),
    gajiFernanda: String(item.gajiFernanda), gajiChalimatusadiah: String(item.gajiChalimatusadiah),
    gajiRiki: String(item.gajiRiki), gajiAgung: String(item.gajiAgung),
    gajiKaryawan1: String(item.gajiKaryawan1), gajiKaryawan2: String(item.gajiKaryawan2),
    bahanRoentgen: String(item.bahanRoentgen), peralatanRoentgen: String(item.peralatanRoentgen),
    penyusutanManual: String(item.penyusutanManual), perbaikanAlat: String(item.perbaikanAlat),
    hargaPeralatan: String(item.hargaPeralatan),
    tarifPenyusutanTahunanPersen: String(item.tarifPenyusutanTahunanPersen),
    piutangUsaha: String(item.piutangUsaha), perlengkapan: String(item.perlengkapan),
    utangUsaha: String(item.utangUsaha),
    modalAwalTahun: String(item.modalAwalTahun), kasAwalTahun: String(item.kasAwalTahun),
    akumulasiPenyusutanAwalTahun: String(item.akumulasiPenyusutanAwalTahun),
  };
}

function staticRow(label: string, value: number, opts?: { readonly bold?: boolean; readonly indent?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.3rem 0',
        paddingLeft: opts?.indent ? '1.25rem' : 0,
        fontWeight: opts?.bold ? 700 : 400,
      }}
    >
      <span>{label}</span>
      <span>{formatRupiah(value)}</span>
    </div>
  );
}

interface HasilPerbulanPageProps {
  readonly modul?: 'RADIOLOGI' | 'LABORATORIUM';
}

export function HasilPerbulanPage({ modul = 'RADIOLOGI' }: HasilPerbulanPageProps) {
  const moduleLabel = modul === 'RADIOLOGI' ? 'Radiologi' : 'Laboratorium';
  const [view, setView] = useState<'bulanan' | 'tahunan' | 'skema12'>('bulanan');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [bulanKe, setBulanKe] = useState<number>(new Date().getMonth() + 1);
  const [data, setData] = useState<LaporanPajakBulananData | null>(null);
  const [labelData, setLabelData] = useState<GajiLabelItem>(emptyLabelForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [editLabelForm, setEditLabelForm] = useState<GajiLabelItem>(emptyLabelForm);
  const [editJumlahPasien, setEditJumlahPasien] = useState('0');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, labelRes] = await Promise.all([
        apiGet<LaporanPajakBulananData>(`/api/laporan/pajak-bulanan?year=${year}&modul=${modul}`),
        apiGet<{ item: GajiLabelItem }>(`/api/laporan/gaji-label?modul=${modul}`),
      ]);
      setData(res);
      setLabelData(labelRes.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat hasil perbulan');
    } finally {
      setLoading(false);
    }
  }, [year, modul]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    setIsEditing(false);
  }, [year, bulanKe, modul]);

  const yearOptions = [];
  for (let y = currentYear + 1; y >= currentYear - 5; y--) {
    yearOptions.push(y);
  }

  const item = useMemo(
    () => data?.bulan.find((b) => b.no === bulanKe) ?? null,
    [data, bulanKe],
  );

  function startEdit() {
    if (!item) return;
    setEditForm(formToItem(item));
    setEditLabelForm(labelData);
    setEditJumlahPasien(String(item.jumlahPasien));
    setError(null);
    setIsEditing(true);
  }

  async function handleSimpan() {
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        apiPatch('/api/laporan/pajak-bulanan', {
          year,
          bulan: item.no,
          modul,
          harga: n(editForm.harga),
          biayaSewaTempat: n(editForm.biayaSewaTempat), biayaListrikAir: n(editForm.biayaListrikAir),
          gajiFernanda: n(editForm.gajiFernanda), gajiChalimatusadiah: n(editForm.gajiChalimatusadiah),
          gajiRiki: n(editForm.gajiRiki), gajiAgung: n(editForm.gajiAgung),
          gajiKaryawan1: n(editForm.gajiKaryawan1), gajiKaryawan2: n(editForm.gajiKaryawan2),
          bahanRoentgen: n(editForm.bahanRoentgen), peralatanRoentgen: n(editForm.peralatanRoentgen),
          penyusutanManual: n(editForm.penyusutanManual), perbaikanAlat: n(editForm.perbaikanAlat),
          hargaPeralatan: n(editForm.hargaPeralatan),
          tarifPenyusutanTahunanPersen: n(editForm.tarifPenyusutanTahunanPersen),
          piutangUsaha: n(editForm.piutangUsaha), perlengkapan: n(editForm.perlengkapan),
          utangUsaha: n(editForm.utangUsaha),
          modalAwalTahun: n(editForm.modalAwalTahun), kasAwalTahun: n(editForm.kasAwalTahun),
          akumulasiPenyusutanAwalTahun: n(editForm.akumulasiPenyusutanAwalTahun),
        }),
        apiPatch('/api/laporan/gaji-label', { modul, ...editLabelForm }),
        apiPatch('/api/laporan/pajak/override', {
          year,
          bulan: item.no,
          modul,
          jumlahPasien: n(editJumlahPasien),
          harga: n(editForm.harga),
        }),
      ]);
      setIsEditing(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan hasil perbulan');
    } finally {
      setSaving(false);
    }
  }

  const totalBhp = item ? item.bahanRoentgen + item.peralatanRoentgen : 0;
  const jumlahPasiva = item ? item.utangUsaha + item.modalPH : 0;

  function field(
    key: EditKey,
    label: string,
    displayValue: number,
    opts?: { readonly indent?: boolean; readonly step?: string },
  ) {
    if (!isEditing) {
      return staticRow(label, displayValue, opts);
    }
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0',
          paddingLeft: opts?.indent ? '1.25rem' : 0,
        }}
      >
        <label htmlFor={`hp-${key}`} style={{ flex: 1 }}>{label}</label>
        <input
          id={`hp-${key}`}
          type="number"
          step={opts?.step ?? '1'}
          value={editForm[key]}
          onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
          style={{ width: '150px', textAlign: 'right' }}
        />
      </div>
    );
  }

  function gajiField(labelKey: LabelKey, amountKey: EditKey, currentLabel: string, currentAmount: number) {
    if (!isEditing) {
      return staticRow(currentLabel, currentAmount, { indent: true });
    }
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0',
          paddingLeft: '1.25rem',
        }}
      >
        <input
          id={`hp-${labelKey}`}
          type="text"
          aria-label={`Nama pegawai (baris ${amountKey})`}
          value={editLabelForm[labelKey]}
          onChange={(e) => setEditLabelForm((f) => ({ ...f, [labelKey]: e.target.value }))}
          style={{ flex: 1, minWidth: 0 }}
        />
        <input
          id={`hp-${amountKey}`}
          type="number"
          step="1"
          aria-label={`Gaji — ${editLabelForm[labelKey]}`}
          value={editForm[amountKey]}
          onChange={(e) => setEditForm((f) => ({ ...f, [amountKey]: e.target.value }))}
          style={{ width: '150px', textAlign: 'right' }}
        />
      </div>
    );
  }

  const tabBar = (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <button
        type="button"
        className={`btn btn--sm ${view === 'bulanan' ? 'btn--primary' : 'btn--ghost'}`}
        onClick={() => setView('bulanan')}
        style={view !== 'bulanan' ? { border: '1px solid var(--color-border)' } : undefined}
      >
        Bulanan
      </button>
      <button
        type="button"
        className={`btn btn--sm ${view === 'tahunan' ? 'btn--primary' : 'btn--ghost'}`}
        onClick={() => setView('tahunan')}
        style={view !== 'tahunan' ? { border: '1px solid var(--color-border)' } : undefined}
      >
        Rugi Laba Tahunan
      </button>
      <button
        type="button"
        className={`btn btn--sm ${view === 'skema12' ? 'btn--primary' : 'btn--ghost'}`}
        onClick={() => setView('skema12')}
        style={view !== 'skema12' ? { border: '1px solid var(--color-border)' } : undefined}
      >
        Skema 12 Bln
      </button>
    </div>
  );

  if (view === 'tahunan') {
    return (
      <>
        {tabBar}
        <LaporanNeracaPage modul={modul} />
      </>
    );
  }

  if (view === 'skema12') {
    return (
      <>
        {tabBar}
        <LaporanPajakPage modul={modul} />
      </>
    );
  }

  return (
    <>
    {tabBar}
    <ListPageShell
      title={`Hasil Perbulan ${moduleLabel}`}
      subtitle="Laporan keuangan ringkas per bulan — Pendapatan, Beban Usaha, Modal, dan mini Neraca. Data sama dengan Laporan Pajak Bulanan."
      onRefresh={() => void fetchData()}
      error={error}
      loading={loading}
      filterExtra={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="form-field" style={{ minWidth: '130px', margin: 0 }}>
            <label htmlFor="filter-year-hasil-perbulan">Tahun</label>
            <select
              id="filter-year-hasil-perbulan"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ minWidth: '150px', margin: 0 }}>
            <label htmlFor="filter-bulan-hasil-perbulan">Bulan</label>
            <select
              id="filter-bulan-hasil-perbulan"
              value={bulanKe}
              onChange={(e) => setBulanKe(Number(e.target.value))}
            >
              {NAMA_BULAN.map((nama, idx) => (
                <option key={nama} value={idx + 1}>{nama}</option>
              ))}
            </select>
          </div>
          {item && !isEditing && (
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={startEdit}
              style={{ border: '1px solid var(--color-border)' }}
            >
              ✏️ Edit
            </button>
          )}
          {isEditing && (
            <>
              <button
                type="button"
                className="btn btn--sm btn--primary"
                onClick={() => void handleSimpan()}
                disabled={saving}
              >
                💾 {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                style={{ border: '1px solid var(--color-border)' }}
              >
                Batal
              </button>
            </>
          )}
        </div>
      }
    >
      {!item ? (
        <p style={{ textAlign: 'center', padding: '1.5rem' }}>Tidak ada data untuk bulan ini.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* LAPORAN KEUANGAN */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--color-primary)' }}>
              LAPORAN KEUANGAN PRIMA HUSADA
            </h3>
            <p style={{ textAlign: 'right', fontWeight: 700, margin: '0 0 0.75rem' }}>
              BULAN {item.bulan.toUpperCase()} {year}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderBottom: '1px dashed var(--color-border)', paddingBottom: '0.3rem' }}>
              <span>Pendapatan Jasa Pelayanan</span>
            </div>
            {!isEditing ? (
              staticRow(`Jumlah Pasien`, item.jumlahPasien)
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                <label htmlFor="hp-jumlahPasien" style={{ flex: 1 }}>Jumlah Pasien</label>
                <input
                  id="hp-jumlahPasien"
                  type="number"
                  step="1"
                  value={editJumlahPasien}
                  onChange={(e) => setEditJumlahPasien(e.target.value)}
                  style={{ width: '150px', textAlign: 'right' }}
                />
              </div>
            )}
            {field('harga', 'Harga per Pasien', item.harga)}
            {staticRow(
              'Total Pendapatan',
              isEditing ? n(editForm.harga) * n(editJumlahPasien) : item.pendapatan,
              { bold: true },
            )}

            <h4 style={{ marginBottom: '0.25rem', marginTop: '1.25rem' }}>Beban Usaha</h4>
            {field('biayaSewaTempat', 'Beban Sewa Tempat', item.biayaSewaTempat)}
            {field('biayaListrikAir', 'Beban Listrik dan Air', item.biayaListrikAir)}
            <div style={{ fontWeight: 600, padding: '0.3rem 0' }}>Beban Gaji</div>
            {gajiField('labelFernanda', 'gajiFernanda', labelData.labelFernanda, item.gajiFernanda)}
            {gajiField('labelChalimatusadiah', 'gajiChalimatusadiah', labelData.labelChalimatusadiah, item.gajiChalimatusadiah)}
            {gajiField('labelRiki', 'gajiRiki', labelData.labelRiki, item.gajiRiki)}
            {gajiField('labelAgung', 'gajiAgung', labelData.labelAgung, item.gajiAgung)}
            {gajiField('labelKaryawan1', 'gajiKaryawan1', labelData.labelKaryawan1, item.gajiKaryawan1)}
            {gajiField('labelKaryawan2', 'gajiKaryawan2', labelData.labelKaryawan2, item.gajiKaryawan2)}
            {field('bahanRoentgen', 'Bahan Roentgen', item.bahanRoentgen)}
            {field('peralatanRoentgen', 'Peralatan Roentgen (Dev+Fix)', item.peralatanRoentgen)}
            {staticRow(
              'Total BHP',
              isEditing ? n(editForm.bahanRoentgen) + n(editForm.peralatanRoentgen) : totalBhp,
              { indent: true },
            )}
            {field('penyusutanManual', 'Penyusutan (Beban Usaha)', item.penyusutanManual)}
            {field('perbaikanAlat', 'Perbaikan Alat', item.perbaikanAlat)}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, padding: '0.4rem 0', borderTop: '1px dashed var(--color-border)' }}>
              <span>Total Beban Usaha</span>
              <span>
                {formatRupiah(
                  isEditing
                    ? n(editForm.biayaSewaTempat) + n(editForm.biayaListrikAir) +
                      n(editForm.gajiFernanda) + n(editForm.gajiChalimatusadiah) + n(editForm.gajiRiki) + n(editForm.gajiAgung) +
                      n(editForm.gajiKaryawan1) + n(editForm.gajiKaryawan2) +
                      n(editForm.bahanRoentgen) + n(editForm.peralatanRoentgen) +
                      n(editForm.penyusutanManual) + n(editForm.perbaikanAlat)
                    : item.totalBebanUsaha,
                )}
              </span>
            </div>

            <h4 style={{ marginBottom: '0.25rem', marginTop: '1.25rem' }}>Modal</h4>
            {staticRow('Modal Awal Bulan', item.modalAwal)}
            {field('hargaPeralatan', 'Harga Peralatan', item.hargaPeralatan)}
            {field('tarifPenyusutanTahunanPersen', 'Tarif Penyusutan / Tahun (%)', item.tarifPenyusutanTahunanPersen, { step: '0.1' })}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
              <span>Penyusutan Peralatan (otomatis, per bulan)</span>
              <span>{formatRupiah(item.penyusutanPeralatanBulan)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: item.labaBersih >= 0 ? '#15803d' : '#b91c1c' }}>
              <span>Laba Bersih</span>
              <span>{formatRupiah(item.labaBersih)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', padding: '0.6rem 0', marginTop: '0.5rem', borderTop: '2px solid var(--color-border)', color: 'var(--color-primary)' }}>
              <span>MODAL AKHIR BULAN</span>
              <span>{formatRupiah(item.modalAkhir)}</span>
            </div>

            {isEditing && bulanKe === 1 && (
              <>
                <h4 style={{ marginBottom: '0.25rem', marginTop: '1.25rem' }}>
                  Saldo Awal Tahun (khusus Januari)
                </h4>
                {field('modalAwalTahun', 'Modal Awal Tahun', item.modalAwalTahun)}
                {field('kasAwalTahun', 'Kas Awal Tahun', item.kasAwalTahun)}
                {field('akumulasiPenyusutanAwalTahun', 'Akumulasi Penyusutan Awal Tahun', item.akumulasiPenyusutanAwalTahun)}
              </>
            )}

            {isEditing && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
                Pendapatan, Total Beban Usaha, Modal &amp; angka Neraca lain dihitung otomatis setelah disimpan.
              </p>
            )}
          </div>

          {/* NERACA */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--color-primary)' }}>
              NERACA — {item.bulan.toUpperCase()} {year}
            </h3>

            <h4 style={{ marginBottom: '0.5rem' }}>Aktiva</h4>
            {staticRow('Kas', item.kasAkhir)}
            {field('piutangUsaha', 'Piutang Usaha', item.piutangUsaha)}
            {field('perlengkapan', 'Perlengkapan', item.perlengkapan)}
            {staticRow('Peralatan', item.hargaPeralatan)}
            {staticRow('Akumulasi Penyusutan Alat', -item.akumulasiPenyusutanAkhir)}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, padding: '0.4rem 0', borderTop: '1px dashed var(--color-border)' }}>
              <span>Jumlah Aktiva</span>
              <span>{formatRupiah(item.jumlahAktiva)}</span>
            </div>

            <h4 style={{ marginBottom: '0.5rem', marginTop: '1.5rem' }}>Pasiva</h4>
            {field('utangUsaha', 'Utang Usaha', item.utangUsaha)}
            {staticRow('Modal PH', item.modalPH)}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, padding: '0.4rem 0', borderTop: '1px dashed var(--color-border)' }}>
              <span>Jumlah Pasiva</span>
              <span>{formatRupiah(jumlahPasiva)}</span>
            </div>

            {isEditing && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
                Kas, Peralatan, Akumulasi Penyusutan, Jumlah Aktiva &amp; Modal PH dihitung otomatis setelah disimpan.
              </p>
            )}
          </div>
        </div>
      )}
    </ListPageShell>
    </>
  );
}
