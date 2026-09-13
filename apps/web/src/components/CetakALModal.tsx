import { useEffect, useState, type CSSProperties } from 'react';
import { Modal } from './ui/Modal.tsx';
import { computeUmurYears, formatDateShort } from '../lib/format.ts';
import { loadLogoDataUrl } from '../pdf/loadLogoDataUrl.ts';
import { apiGet } from '../lib/api.ts';
import logoPrimahusada from '@src/image/logo-primahusada.png';
import './ui/ui.css';

const editInputStyle: CSSProperties = {
  width: '100%',
  padding: '0.25rem 0.4rem',
  fontSize: '0.8rem',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  fontFamily: 'inherit',
};

interface AmplopFormFields {
  readonly nama: string;
  readonly umur: string;
  readonly alamat: string;
  readonly tanggal: string;
  readonly jenisNames: string;
  readonly pengirimNama: string;
}

interface CetakALFormState extends AmplopFormFields {
  readonly regCode: string;
}

interface KopSuratData {
  readonly namaKlinik: string;
  readonly alamat: string;
  readonly telepon: string;
  readonly logoDataUrl: string | null;
}

const KOP_SURAT_DEFAULTS: KopSuratData = {
  namaKlinik: 'KLINIK PRIMA HUSADA',
  alamat: 'Jl. Siliwangi Ruko Palapa No 2 Parung Kuda',
  telepon: '0857-1932-5557',
  logoDataUrl: null,
};

export interface CetakALPasien {
  readonly id: string;
  readonly regCode: string;
  readonly nama: string;
  readonly umur?: number;
  readonly tanggalLahir: string;
  readonly createdAt: string;
  readonly alamat?: string | null;
  readonly pengirim: {
    readonly nama: string;
  };
  readonly radiolog: {
    readonly nama: string;
  } | null;
  readonly pemeriksaan: readonly {
    readonly nama: string;
  }[];
}

type CetakALMode = 'amplop' | 'amplopv2' | 'amplopv3' | 'label' | 'both';

function AmplopV2TablePreview({
  form,
  editing,
  onChange,
}: {
  readonly form: AmplopFormFields;
  readonly editing: boolean;
  readonly onChange: (field: keyof AmplopFormFields, value: string) => void;
}) {
  const valueCellStyle = { border: '1px solid #000', padding: '4px 6px', fontSize: '0.9rem', color: '#1d4ed8', fontWeight: 600 } as const;
  const labelCellStyle = { border: '1px solid #000', padding: '4px 6px', fontSize: '0.9rem' } as const;
  const colonCellStyle = { border: '1px solid #000', padding: '4px 6px', fontSize: '0.9rem', textAlign: 'center' } as const;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
      <tbody>
        <tr>
          <td style={{ ...labelCellStyle, width: '18%' }}>Nama Pasien</td>
          <td style={{ ...colonCellStyle, width: '3%' }}>:</td>
          <td style={valueCellStyle}>
            {editing ? (
              <input value={form.nama} onChange={(e) => onChange('nama', e.target.value)} style={editInputStyle} />
            ) : (
              form.nama
            )}
          </td>
          <td style={{ ...labelCellStyle, width: '14%' }}>Umur</td>
          <td style={{ ...colonCellStyle, width: '3%' }}>:</td>
          <td style={valueCellStyle}>
            {editing ? (
              <input value={form.umur} onChange={(e) => onChange('umur', e.target.value)} style={editInputStyle} />
            ) : (
              `${form.umur} thn`
            )}
          </td>
        </tr>
        <tr>
          <td style={labelCellStyle}>Alamat</td>
          <td style={colonCellStyle}>:</td>
          <td style={valueCellStyle}>
            {editing ? (
              <input value={form.alamat} onChange={(e) => onChange('alamat', e.target.value)} style={editInputStyle} />
            ) : (
              form.alamat || '-'
            )}
          </td>
          <td style={labelCellStyle}>Tanggal</td>
          <td style={colonCellStyle}>:</td>
          <td style={valueCellStyle}>
            {editing ? (
              <input value={form.tanggal} onChange={(e) => onChange('tanggal', e.target.value)} style={editInputStyle} />
            ) : (
              form.tanggal
            )}
          </td>
        </tr>
        <tr>
          <td style={labelCellStyle}>Pemeriksaan</td>
          <td style={colonCellStyle}>:</td>
          <td style={valueCellStyle}>
            {editing ? (
              <input
                value={form.jenisNames}
                onChange={(e) => onChange('jenisNames', e.target.value)}
                style={editInputStyle}
              />
            ) : (
              form.jenisNames
            )}
          </td>
          <td style={labelCellStyle}>Pengirim</td>
          <td style={colonCellStyle}>:</td>
          <td style={valueCellStyle}>
            {editing ? (
              <input
                value={form.pengirimNama}
                onChange={(e) => onChange('pengirimNama', e.target.value)}
                style={editInputStyle}
              />
            ) : (
              form.pengirimNama
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

interface CetakALModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly pasien: CetakALPasien | null;
  readonly initialMode?: 'amplop' | 'label' | 'both';
  /** Jenis pemeriksaan untuk subjudul mode "Amplop (A)", mis. "RADIOLOGI" atau "USG". */
  readonly examLabel?: string;
}

export function CetakALModal({
  open,
  onClose,
  pasien,
  initialMode = 'both',
  examLabel = 'RADIOLOGI',
}: CetakALModalProps) {
  const [mode, setMode] = useState<CetakALMode>(initialMode);
  const [copied, setCopied] = useState(false);
  const [labelPosition, setLabelPosition] = useState(1);
  const [kopSurat, setKopSurat] = useState<KopSuratData>(KOP_SURAT_DEFAULTS);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CetakALFormState>({
    regCode: '',
    nama: '',
    umur: '',
    alamat: '',
    tanggal: '',
    jenisNames: '',
    pengirimNama: '',
  });
  const LABEL_POSITIONS = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    apiGet<{ item: KopSuratData }>('/api/kop-surat')
      .then((res) => setKopSurat(res.item))
      .catch(() => setKopSurat(KOP_SURAT_DEFAULTS));
  }, []);

  useEffect(() => {
    if (!pasien) return;
    const umurValue = pasien.umur ?? computeUmurYears(pasien.tanggalLahir, pasien.createdAt) ?? 0;
    setForm({
      regCode: pasien.regCode,
      nama: pasien.nama,
      umur: String(umurValue),
      alamat: pasien.alamat ?? '',
      tanggal: formatDateShort(pasien.createdAt),
      jenisNames: pasien.pemeriksaan.map((p) => p.nama).join(', ') || 'Pemeriksaan Radiologi',
      pengirimNama: pasien.pengirim.nama,
    });
    setEditing(false);
  }, [pasien]);

  if (!pasien) {
    return null;
  }

  function updateForm(field: keyof CetakALFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleCopyLabel() {
    const text = `[PRIMA HUSADA RADIOLOGI]\nRM/FOTO: ${form.regCode}\nNama: ${form.nama} (${form.umur} thn)\nPemeriksaan: ${form.jenisNames}\nTgl: ${form.tanggal} | Dr: ${form.pengirimNama}`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handlePrintNow() {
    const win = window.open('', '_blank', 'width=850,height=700');
    if (!win) {
      alert('Jendela cetak diblokir oleh browser. Harap izinkan pop-up untuk situs ini.');
      return;
    }

    const logoSrc =
      mode === 'amplopv2'
        ? await loadLogoDataUrl().catch(() => '')
        : mode === 'amplopv3'
          ? kopSurat.logoDataUrl || (await loadLogoDataUrl().catch(() => ''))
          : '';

    const amplopV2TableHtml = `
        <table class="amplopv2-table">
          <tr>
            <td class="amplopv2-label">Nama Pasien</td>
            <td class="amplopv2-colon">:</td>
            <td class="amplopv2-value">${form.nama}</td>
            <td class="amplopv2-label">Umur</td>
            <td class="amplopv2-colon">:</td>
            <td class="amplopv2-value">${form.umur} thn</td>
          </tr>
          <tr>
            <td class="amplopv2-label">Alamat</td>
            <td class="amplopv2-colon">:</td>
            <td class="amplopv2-value">${form.alamat || '-'}</td>
            <td class="amplopv2-label">Tanggal</td>
            <td class="amplopv2-colon">:</td>
            <td class="amplopv2-value">${form.tanggal}</td>
          </tr>
          <tr>
            <td class="amplopv2-label">Pemeriksaan</td>
            <td class="amplopv2-colon">:</td>
            <td class="amplopv2-value">${form.jenisNames}</td>
            <td class="amplopv2-label">Pengirim</td>
            <td class="amplopv2-colon">:</td>
            <td class="amplopv2-value">${form.pengirimNama}</td>
          </tr>
        </table>
    `;

    const amplopV2Html = `
      <div class="amplopv2-sheet">
        <div class="amplopv2-header">
          ${logoSrc ? `<img class="amplopv2-logo" src="${logoSrc}" alt="Logo" />` : ''}
          <div class="amplopv2-headertext">
            <div class="amplopv2-kop">KLINIK ROENTGEN DAN USG</div>
            <div class="amplopv2-clinicname">PRIMA HUSADA</div>
            <div class="amplopv2-address">Jl. Raya Siliwangi Parung Kuda, Telp/HP 0857-1932-5557</div>
          </div>
        </div>
        ${amplopV2TableHtml}
        <div class="amplopv2-footer">HARAP FOTO LAMA DI BAWA LAGI SEWAKTU KONTROL !!!</div>
      </div>
    `;

    const amplopV3Html = `
      <div class="amplopv2-sheet">
        <div class="amplopv2-header">
          ${logoSrc ? `<img class="amplopv2-logo" src="${logoSrc}" alt="Logo" />` : ''}
          <div class="amplopv2-headertext">
            <div class="amplopv2-kop">KLINIK ROENTGEN DAN USG</div>
            <div class="amplopv2-clinicname">${kopSurat.namaKlinik}</div>
            <div class="amplopv2-address">${kopSurat.alamat}</div>
            <div class="amplopv2-address">Telp/HP ${kopSurat.telepon}</div>
          </div>
        </div>
        ${amplopV2TableHtml}
        <div class="amplopv2-footer">HARAP FOTO LAMA DI BAWA LAGI SEWAKTU KONTROL !!!</div>
      </div>
    `;

    const amplopHtml = `
      <div class="amplop-sheet">
        <div class="amplop-header">
          <div class="amplop-title">KLINIK PRIMA HUSADA</div>
          <div class="amplop-subtitle">HASIL PEMERIKSAAN ${examLabel}</div>
        </div>
        <div class="amplop-body">
          <table class="amplop-table">
            <tr>
              <th>No. Foto / RM</th>
              <td><strong>${form.regCode}</strong></td>
            </tr>
            <tr>
              <th>Nama Pasien</th>
              <td><strong>${form.nama}</strong> (${form.umur} tahun)</td>
            </tr>
            <tr>
              <th>Tanggal Foto</th>
              <td>${form.tanggal}</td>
            </tr>
            <tr>
              <th>Jenis Pemeriksaan</th>
              <td><strong>${form.jenisNames}</strong></td>
            </tr>
            <tr>
              <th>Kepada Yth. TS</th>
              <td>${form.pengirimNama}</td>
            </tr>
          </table>
        </div>
        <div class="amplop-footer">
          * Harap membawa amplop & hasil foto ini saat kontrol kembali ke dokter yang merawat.
        </div>
      </div>
    `;

    const labelCellHtml = `
        <div class="label-box">
          <div class="label-header">
            <div class="label-title">KLINIK PRIMA HUSADA</div>
            <div class="label-subtitle">Jl Siliwangi Ruko Palapa No 2 Parung Kuda</div>
          </div>
          <table class="label-table">
            <tr><th>No. Foto / RM</th><td>${form.regCode}</td></tr>
            <tr><th>Nama Pasien</th><td>${form.nama} (${form.umur} thn)</td></tr>
            <tr><th>Tanggal Foto</th><td>${form.tanggal}</td></tr>
            <tr><th>Jenis Pemeriksaan</th><td>${form.jenisNames}</td></tr>
            <tr><th>Dokter Pengirim</th><td>${form.pengirimNama}</td></tr>
          </table>
        </div>
    `;

    const labelCellsHtml = LABEL_POSITIONS.map(
      (pos) => `<div class="label-cell">${pos === labelPosition ? labelCellHtml : ''}</div>`
    ).join('');

    const labelHtml = `
      <div class="label-sheet">
        ${labelCellsHtml}
      </div>
    `;

    const bodyHtml =
      mode === 'amplop'
        ? amplopHtml
        : mode === 'amplopv2'
          ? amplopV2Html
          : mode === 'amplopv3'
            ? amplopV3Html
            : mode === 'label'
              ? labelHtml
              : `${amplopHtml}<div style="page-break-after: always;"></div>${labelHtml}`;

    const pageCss =
      mode === 'label'
        ? '@page { size: 20.5cm 14.8cm landscape; margin: 0; }'
        : mode === 'amplopv2' || mode === 'amplopv3'
          ? '@page { margin: 3cm 0 0 0; }'
          : mode === 'amplop'
            ? '@page { margin: 2cm 0 0 0.5cm; }'
            : '@page { margin: 15mm; }';
    const bodyPadding =
      mode === 'label' || mode === 'amplop' || mode === 'amplopv2' || mode === 'amplopv3' ? '0' : '20px';

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Klinik Prima Husada</title>
          <style>
            ${pageCss}
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #0f172a;
              background: #fff;
              margin: 0;
              padding: ${bodyPadding};
            }
            .amplop-sheet {
              width: 8cm;
              height: 6cm;
              box-sizing: border-box;
              overflow: hidden;
              border: 1.75px solid #1e293b;
              padding: 8px;
              border-radius: 8px;
              margin: 0;
              display: flex;
              flex-direction: column;
            }
            .amplop-header {
              text-align: center;
              border-bottom: 1.5px solid #1d4ed8;
              padding-bottom: 4px;
              margin-bottom: 5px;
            }
            .amplop-title {
              font-size: 12.5px;
              font-weight: 800;
              letter-spacing: 0.3px;
              color: #0f172a;
            }
            .amplop-subtitle {
              font-size: 9px;
              font-weight: 700;
              margin-top: 2px;
              color: #1d4ed8;
              text-transform: uppercase;
              letter-spacing: 0.4px;
            }
            .amplop-body {
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .amplop-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            .amplop-table th {
              text-align: left;
              width: 80px;
              padding: 3px 4px 3px 0;
              font-size: 8.5px;
              color: #475569;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .amplop-table td {
              padding: 3px 0;
              font-size: 9.5px;
              color: #0f172a;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .amplop-footer {
              margin-top: 4px;
              font-size: 7px;
              font-style: italic;
              color: #64748b;
              text-align: center;
            }

            .amplopv2-sheet {
              width: 14cm;
              height: 7cm;
              box-sizing: border-box;
              overflow: hidden;
              border: 1.75px solid #1e293b;
              border-radius: 8px;
              padding: 10px;
              margin: 0 auto;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .amplopv2-header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 16px;
              margin-bottom: 10px;
            }
            .amplopv2-logo {
              width: 50px;
              height: 50px;
              object-fit: contain;
              flex-shrink: 0;
            }
            .amplopv2-headertext {
              text-align: center;
              color: #1d4ed8;
            }
            .amplopv2-kop {
              font-size: 10.5px;
              font-weight: 700;
            }
            .amplopv2-clinicname {
              font-size: 19px;
              font-weight: 800;
              line-height: 1.3;
            }
            .amplopv2-address {
              font-size: 10px;
              font-weight: 700;
            }
            .amplopv2-table {
              width: 12cm;
              height: 4cm;
              border-collapse: collapse;
              table-layout: fixed;
              margin: 0 auto 10px auto;
            }
            .amplopv2-table td {
              border: 1px solid #000;
              padding: 3px 5px;
              font-size: 11.5px;
              vertical-align: middle;
            }
            .amplopv2-label {
              width: 20%;
              color: #0f172a;
            }
            .amplopv2-colon {
              width: 3%;
              text-align: center;
              color: #0f172a;
            }
            .amplopv2-value {
              width: 27%;
              color: #1d4ed8;
              font-weight: 600;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .amplopv2-footer {
              text-align: center;
              font-size: 10.5px;
              font-weight: 700;
              font-style: italic;
              color: #1d4ed8;
            }

            .label-sheet {
              width: 100%;
              max-width: 20.5cm;
              height: 14.8cm;
              margin: 0 auto;
              padding: 0.4cm 0.2cm 0.4cm 0.1cm;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              grid-template-rows: repeat(4, 1fr);
              column-gap: 0.1cm;
              row-gap: 0.3cm;
              box-sizing: border-box;
            }
            .label-cell {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .label-box {
              width: 6cm;
              height: 2.9cm;
              box-sizing: border-box;
              overflow: hidden;
              border: 2px solid #000;
              border-radius: 1.5mm;
              padding: 1.2mm 2mm;
              background: #fff;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .label-header {
              border-bottom: 0.75px solid #000;
              margin: 0 -2mm 0.6mm -2mm;
              padding: 0 2mm 0.5mm 2mm;
            }
            .label-title {
              font-size: 8px;
              font-weight: 700;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .label-subtitle {
              font-size: 6px;
              font-weight: 600;
              text-align: center;
              color: #0369a1;
              margin-top: 0.3mm;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .label-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 6.5px;
            }
            .label-table th {
              width: 38%;
              text-align: left;
              font-weight: 700;
              color: #334155;
              padding: 0.3mm 1mm 0.3mm 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .label-table td {
              width: 62%;
              font-weight: 600;
              color: #000;
              padding: 0.3mm 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            @media print {
              .label-box {
                margin: 0;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          ${bodyHtml}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <Modal
      open={open}
      title={`Pratinjau Cetak A+L — ${pasien.regCode}`}
      onClose={onClose}
      size="lg"
    >
      <div>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <button
            type="button"
            className={`btn btn--sm ${mode === 'amplop' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setMode('amplop')}
          >
            ✉️ Amplop (A)
          </button>
          <button
            type="button"
            className={`btn btn--sm ${mode === 'amplopv2' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setMode('amplopv2')}
          >
            🧾 Amplop V2
          </button>
          <button
            type="button"
            className={`btn btn--sm ${mode === 'amplopv3' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setMode('amplopv3')}
          >
            🧾 Amplop V3
          </button>
          <button
            type="button"
            className={`btn btn--sm ${mode === 'label' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setMode('label')}
          >
            🏷️ Label Stiker (L)
          </button>
          <button
            type="button"
            className={`btn btn--sm ${mode === 'both' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setMode('both')}
          >
            🖨️ Keduanya (A+L)
          </button>
        </div>

        {(mode === 'label' || mode === 'both') && (
          <div
            style={{
              marginBottom: '1.25rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Pilih Posisi Label di Lembar Stiker (20,5×14,8 cm — 3 kolom × 4 baris, 12 posisi)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.4rem',
                maxWidth: '260px',
              }}
            >
              {LABEL_POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setLabelPosition(pos)}
                  className={`btn btn--sm ${labelPosition === pos ? 'btn--primary' : 'btn--secondary'}`}
                  style={{ padding: '0.4rem 0', fontWeight: 700 }}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1.5rem',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          {(mode === 'amplop' || mode === 'both') && (
            <div
              style={{
                background: '#ffffff',
                border: '2px solid #1e293b',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: mode === 'both' ? '1.5rem' : 0,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  borderBottom: '2px solid #1e293b',
                  paddingBottom: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  KLINIK PRIMA HUSADA
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0369a1', marginTop: '0.25rem' }}>
                  HASIL PEMERIKSAAN {examLabel}
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px', width: '180px', color: '#64748b' }}>
                      No. Foto / RM
                    </th>
                    <td style={{ padding: '8px 4px', fontWeight: 700, fontSize: '1.05rem' }}>
                      {editing ? (
                        <input value={form.regCode} onChange={(e) => updateForm('regCode', e.target.value)} style={editInputStyle} />
                      ) : (
                        form.regCode
                      )}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>
                      Nama Pasien
                    </th>
                    <td style={{ padding: '8px 4px' }}>
                      {editing ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            value={form.nama}
                            onChange={(e) => updateForm('nama', e.target.value)}
                            style={{ ...editInputStyle, flex: 1 }}
                            placeholder="Nama pasien"
                          />
                          <input
                            value={form.umur}
                            onChange={(e) => updateForm('umur', e.target.value)}
                            style={{ ...editInputStyle, width: '70px' }}
                            placeholder="Umur"
                          />
                        </div>
                      ) : (
                        <>
                          <strong>{form.nama}</strong> ({form.umur} tahun)
                        </>
                      )}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>
                      Tanggal Foto
                    </th>
                    <td style={{ padding: '8px 4px' }}>
                      {editing ? (
                        <input value={form.tanggal} onChange={(e) => updateForm('tanggal', e.target.value)} style={editInputStyle} />
                      ) : (
                        form.tanggal
                      )}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>
                      Jenis Pemeriksaan
                    </th>
                    <td style={{ padding: '8px 4px', fontWeight: 600, color: '#0f172a' }}>
                      {editing ? (
                        <input
                          value={form.jenisNames}
                          onChange={(e) => updateForm('jenisNames', e.target.value)}
                          style={editInputStyle}
                        />
                      ) : (
                        form.jenisNames
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>
                      Kepada Yth. TS
                    </th>
                    <td style={{ padding: '8px 4px' }}>
                      {editing ? (
                        <input
                          value={form.pengirimNama}
                          onChange={(e) => updateForm('pengirimNama', e.target.value)}
                          style={editInputStyle}
                        />
                      ) : (
                        form.pengirimNama
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div
                style={{
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  fontStyle: 'italic',
                }}
              >
                * Harap membawa amplop &amp; hasil foto ini saat kontrol kembali ke dokter yang merawat.
              </div>
            </div>
          )}

          {mode === 'amplopv2' && (
            <div
              style={{
                background: '#ffffff',
                border: '2px solid #1e293b',
                borderRadius: '8px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <img
                  src={logoPrimahusada}
                  alt="Logo"
                  style={{ width: 50, height: 50, objectFit: 'contain', flexShrink: 0 }}
                />
                <div style={{ textAlign: 'center', color: '#1d4ed8' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>KLINIK ROENTGEN DAN USG</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.3 }}>PRIMA HUSADA</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                    Jl. Raya Siliwangi Parung Kuda, Telp/HP 0857-1932-5557
                  </div>
                </div>
              </div>
              <AmplopV2TablePreview form={form} editing={editing} onChange={updateForm} />
              <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, fontStyle: 'italic', color: '#1d4ed8' }}>
                HARAP FOTO LAMA DI BAWA LAGI SEWAKTU KONTROL !!!
              </div>
            </div>
          )}

          {mode === 'amplopv3' && (
            <div
              style={{
                background: '#ffffff',
                border: '2px solid #1e293b',
                borderRadius: '8px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <img
                  src={kopSurat.logoDataUrl || logoPrimahusada}
                  alt="Logo"
                  style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }}
                />
                <div style={{ textAlign: 'center', color: '#1d4ed8' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>KLINIK ROENTGEN DAN USG</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.3 }}>{kopSurat.namaKlinik}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>{kopSurat.alamat}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>Telp/HP {kopSurat.telepon}</div>
                </div>
              </div>
              <AmplopV2TablePreview form={form} editing={editing} onChange={updateForm} />
              <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, fontStyle: 'italic', color: '#1d4ed8' }}>
                HARAP FOTO LAMA DI BAWA LAGI SEWAKTU KONTROL !!!
              </div>
            </div>
          )}

          {(mode === 'label' || mode === 'both') && (
            <div style={{ maxWidth: '420px', margin: '0 auto' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gridTemplateRows: 'repeat(4, 1fr)',
                  gap: '4px',
                  aspectRatio: '20.5 / 14.8',
                  background: '#ffffff',
                  border: '2px solid #1e293b',
                  borderRadius: '8px',
                  padding: '10px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                }}
              >
                {LABEL_POSITIONS.map((pos) => (
                  <div
                    key={pos}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: pos === labelPosition ? '1.5px solid #0369a1' : '1px dashed #cbd5e1',
                      borderRadius: '3px',
                      background: pos === labelPosition ? '#f0f9ff' : '#f8fafc',
                      overflow: 'hidden',
                      padding: '2px',
                    }}
                  >
                    {pos === labelPosition ? (
                      <div style={{ textAlign: 'center', lineHeight: 1.2, overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '0.5rem',
                            fontWeight: 700,
                            color: '#0369a1',
                            textTransform: 'uppercase',
                          }}
                        >
                          Prima Husada
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f172a' }}>
                          {form.regCode}
                        </div>
                        <div
                          style={{
                            fontSize: '0.5rem',
                            fontWeight: 600,
                            color: '#1e293b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                          }}
                        >
                          {form.nama}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{pos}</span>
                    )}
                  </div>
                ))}
              </div>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginTop: '0.5rem',
                }}
              >
                Posisi {labelPosition} akan berisi label pasien ini — posisi lain dikosongkan saat dicetak.
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setEditing((e) => !e)}
            >
              {editing ? '✓ Selesai Edit' : '✏️ Edit'}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={handleCopyLabel}
            >
              {copied ? '✓ Tersalin' : '📋 Salin Teks Label'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Tutup
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handlePrintNow}
              style={{ fontWeight: 600 }}
            >
              🖨️ Cetak Sekarang ({mode.toUpperCase()})
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
