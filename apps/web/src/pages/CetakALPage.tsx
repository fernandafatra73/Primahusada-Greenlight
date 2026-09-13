import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal.tsx';
import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ModalFormFooter } from '../components/ui/ModalFormFooter.tsx';
import { TableRowActions } from '../components/ui/TableRowActions.tsx';
import { CetakALModal, type CetakALPasien } from '../components/CetakALModal.tsx';
import { useListQueryParams, useListSearch } from '../hooks/useListQueryParams.ts';
import { usePaginatedList } from '../hooks/usePaginatedList.ts';
import { apiDelete, apiGet, apiPatch } from '../lib/api.ts';
import { computeUmurYears, formatDateShort } from '../lib/format.ts';
import '../components/ui/ui.css';

interface DokterOption {
  readonly id: string;
  readonly nama: string;
}

interface RadiologOption {
  readonly id: string;
  readonly nama: string;
}

export function CetakALPage() {
  const { search, setSearch } = useListSearch();
  const queryParams = useListQueryParams({}, search);
  const { items, pagination, setPage, loading, error, setError, reload } =
    usePaginatedList<CetakALPasien>('/api/pasien', queryParams);

  const [selectedPasien, setSelectedPasien] = useState<CetakALPasien | null>(null);
  const [modalMode, setModalMode] = useState<'amplop' | 'label' | 'both'>('both');
  const [modalOpen, setModalOpen] = useState(false);

  function handleOpenPrint(pasien: CetakALPasien, mode: 'amplop' | 'label' | 'both') {
    setSelectedPasien(pasien);
    setModalMode(mode);
    setModalOpen(true);
  }

  const [dokterOptions, setDokterOptions] = useState<readonly DokterOption[]>([]);
  const [radiologOptions, setRadiologOptions] = useState<readonly RadiologOption[]>([]);

  const loadOptions = useCallback(async () => {
    try {
      const [dokterRes, radiologRes] = await Promise.all([
        apiGet<{ items: DokterOption[] }>('/api/dokter?limit=200'),
        apiGet<{ items: RadiologOption[] }>('/api/radiolog?limit=200'),
      ]);
      setDokterOptions(dokterRes.items);
      setRadiologOptions(radiologRes.items);
    } catch {
      setDokterOptions([]);
      setRadiologOptions([]);
    }
  }, []);
  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const [editTarget, setEditTarget] = useState<CetakALPasien | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editTanggalLahir, setEditTanggalLahir] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [editPengirimId, setEditPengirimId] = useState('');
  const [editRadiologId, setEditRadiologId] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function openEdit(item: CetakALPasien) {
    setEditTarget(item);
    setEditNama(item.nama);
    setEditTanggalLahir(item.tanggalLahir);
    setEditAlamat(item.alamat ?? '');
    setEditPengirimId(dokterOptions.find((d) => d.nama === item.pengirim.nama)?.id ?? '');
    setEditRadiologId(radiologOptions.find((r) => r.nama === item.radiolog?.nama)?.id ?? '');
    setError(null);
  }

  async function onEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/api/pasien/${editTarget.id}`, {
        nama: editNama,
        tanggalLahir: editTanggalLahir,
        alamat: editAlamat,
        pengirimId: editPengirimId || undefined,
        radiologId: editRadiologId || null,
      });
      setEditTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await apiDelete(`/api/pasien/${deleteTarget.id}`);
      setDeleteTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <ListPageShell
        title="Cetak A+L (Amplop & Label Radiologi)"
        subtitle="Pencetakan stiker label identitas pasien dan kop amplop hasil foto radiologi"
        metrics={[
          {
            label: 'Total Pasien',
            value: String(pagination.total),
            tone: 'blue',
            iconKind: 'document',
          },
        ]}
        searchPlaceholder="Cari nama pasien, no. foto, dokter pengirim..."
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => void reload()}
        error={error}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>No</th>
              <th style={{ width: '160px' }}>Tanggal &amp; No. Foto</th>
              <th style={{ width: '220px' }}>Nama Pasien &amp; Usia</th>
              <th>Pemeriksaan Radiologi</th>
              <th style={{ width: '180px' }}>Dokter Pengirim</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Aksi</th>
              <th style={{ width: '280px', textAlign: 'center' }}>Cetak A+L</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  Belum ada data pasien radiologi yang ditemukan.
                </td>
              </tr>
            ) : (
              items.map((p, idx) => {
                const rowNo = (pagination.page - 1) * pagination.limit + idx + 1;
                const umur = p.umur ?? computeUmurYears(p.tanggalLahir, p.createdAt) ?? 0;
                const tanggal = formatDateShort(p.createdAt);
                const jenisNames =
                  p.pemeriksaan.map((x) => x.nama).join(', ') || '—';

                return (
                  <tr key={p.id}>
                    <td>{rowNo}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0369a1' }}>{p.regCode}</div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{tanggal}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.nama}</div>
                      <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                        {umur} tahun ({p.tanggalLahir})
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#1e293b' }}>{jenisNames}</div>
                    </td>
                    <td>
                      <div style={{ color: '#334155' }}>{p.pengirim.nama}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <TableRowActions
                        onEdit={() => openEdit(p)}
                        onDelete={() => setDeleteTarget({ id: p.id, label: p.nama })}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          gap: '0.4rem',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn--xs btn--secondary"
                          onClick={() => handleOpenPrint(p, 'amplop')}
                          title="Cetak Amplop Hasil Foto (A)"
                          style={{ padding: '0.35rem 0.6rem' }}
                        >
                          ✉️ Amplop (A)
                        </button>
                        <button
                          type="button"
                          className="btn btn--xs btn--secondary"
                          onClick={() => handleOpenPrint(p, 'label')}
                          title="Cetak Label Stiker Identitas (L)"
                          style={{ padding: '0.35rem 0.6rem' }}
                        >
                          🏷️ Label (L)
                        </button>
                        <button
                          type="button"
                          className="btn btn--xs btn--primary"
                          onClick={() => handleOpenPrint(p, 'both')}
                          title="Cetak Amplop & Label Sekaligus (A+L)"
                          style={{ padding: '0.35rem 0.65rem', fontWeight: 600 }}
                        >
                          🖨️ A+L
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ListPageShell>

      <CetakALModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pasien={selectedPasien}
        initialMode={modalMode}
      />

      <Modal open={editTarget !== null} title="Ubah Data Pasien" onClose={() => setEditTarget(null)}>
        <form onSubmit={(e) => void onEditSubmit(e)} className="form-grid">
          <div className="form-field form-field--full">
            <label htmlFor="cal-nama">Nama Pasien</label>
            <input id="cal-nama" required value={editNama} onChange={(e) => setEditNama(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="cal-tgl-lahir">Tanggal Lahir</label>
            <input
              id="cal-tgl-lahir"
              type="date"
              required
              value={editTanggalLahir}
              onChange={(e) => setEditTanggalLahir(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="cal-alamat">Alamat</label>
            <input id="cal-alamat" value={editAlamat} onChange={(e) => setEditAlamat(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="cal-pengirim">Dokter Pengirim</label>
            <select
              id="cal-pengirim"
              required
              value={editPengirimId}
              onChange={(e) => setEditPengirimId(e.target.value)}
            >
              <option value="" disabled>
                Pilih dokter pengirim…
              </option>
              {dokterOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="cal-radiolog">Radiolog</label>
            <select id="cal-radiolog" value={editRadiologId} onChange={(e) => setEditRadiologId(e.target.value)}>
              <option value="">— Belum ditentukan —</option>
              {radiologOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama}
                </option>
              ))}
            </select>
          </div>
          <ModalFormFooter onCancel={() => setEditTarget(null)} submitLabel="Simpan" loading={saving} />
        </form>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus data pasien"
        message={`Yakin hapus permanen data "${deleteTarget?.label ?? ''}"? Tindakan ini tidak bisa dibatalkan.`}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
