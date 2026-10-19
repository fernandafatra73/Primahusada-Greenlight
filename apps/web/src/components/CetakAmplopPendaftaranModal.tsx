import { useEffect, useState } from 'react';
import logoPrimahusada from '@src/image/logo-primahusada.png';
import { formatUmurBebas } from '../lib/format.ts';
import { loadLogoDataUrl } from '../pdf/loadLogoDataUrl.ts';
import { CetakLabelPendaftaranIsi } from './CetakLabelPendaftaranModal.tsx';
import { Modal } from './ui/Modal.tsx';
import './ui/ui.css';

export interface CetakAmplopPendaftaranPasien {
  readonly noRegistrasi: string;
  readonly namaPasien: string;
  readonly umur: string | null;
  readonly alamat: string | null;
  readonly tanggalMasuk: string;
  readonly dokterPengirim: string | null;
}

/**
 * v1 = amplop pendaftaran asli; v2 = desain "Amplop V2" Radiologi (kop berlogo, tabel 2 kolom, 14 x 7 cm);
 * label = label stiker identitas (dulu tombol "Label" tersendiri di baris pendaftaran).
 */
type VersiAmplop = 'v1' | 'v2' | 'label';

// Sama dengan catatan bawah Amplop V2 Radiologi.
const FOOTER_AMPLOP_V2 = 'HARAP FOTO LAMA DI BAWA LAGI SEWAKTU KONTROL !!!';

/** Cetak "Amplop V2": ukuran, kop dan gaya sama dengan Amplop V2 di cetak amplop Radiologi. */
async function tulisAmplopV2(win: Window, pasien: CetakAmplopPendaftaranPasien, tanggal: string): Promise<void> {
  // Jendela dibuka dulu (sebelum await) supaya tidak diblokir pop-up blocker, baru logo dimuat.
  const logoSrc = await loadLogoDataUrl().catch(() => '');
  const umur = formatUmurBebas(pasien.umur ?? '', 'thn');

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Klinik Prima Husada — Amplop Pendaftaran V2</title>
        <style>
          @page { margin: 3cm 0 0 0; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 0;
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
          .amplopv2-logo { width: 50px; height: 50px; object-fit: contain; flex-shrink: 0; }
          .amplopv2-headertext { text-align: center; color: #1d4ed8; }
          .amplopv2-kop { font-size: 10.5px; font-weight: 700; }
          .amplopv2-clinicname { font-size: 19px; font-weight: 800; line-height: 1.3; }
          .amplopv2-address { font-size: 10px; font-weight: 700; }
          .amplopv2-table {
            width: 12cm;
            height: 4cm;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 0 auto 10px auto;
          }
          .amplopv2-table td { border: 1px solid #000; padding: 3px 5px; font-size: 11.5px; vertical-align: middle; }
          .amplopv2-label { width: 20%; color: #0f172a; }
          .amplopv2-colon { width: 3%; text-align: center; color: #0f172a; }
          .amplopv2-value {
            width: 27%;
            color: #1d4ed8;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .amplopv2-footer { text-align: center; font-size: 10.5px; font-weight: 700; font-style: italic; color: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="amplopv2-sheet">
          <div class="amplopv2-header">
            ${logoSrc ? `<img class="amplopv2-logo" src="${logoSrc}" alt="Logo" />` : ''}
            <div class="amplopv2-headertext">
              <div class="amplopv2-kop">KLINIK ROENTGEN DAN USG</div>
              <div class="amplopv2-clinicname">PRIMA HUSADA</div>
              <div class="amplopv2-address">Jl. Raya Siliwangi Parung Kuda, Telp/HP 0857-1932-5557</div>
            </div>
          </div>
          <table class="amplopv2-table">
            <tr>
              <td class="amplopv2-label">Nama Pasien</td>
              <td class="amplopv2-colon">:</td>
              <td class="amplopv2-value">${pasien.namaPasien}</td>
              <td class="amplopv2-label">Umur</td>
              <td class="amplopv2-colon">:</td>
              <td class="amplopv2-value">${umur}</td>
            </tr>
            <tr>
              <td class="amplopv2-label">Alamat</td>
              <td class="amplopv2-colon">:</td>
              <td class="amplopv2-value">${pasien.alamat || '-'}</td>
              <td class="amplopv2-label">Tanggal</td>
              <td class="amplopv2-colon">:</td>
              <td class="amplopv2-value">${tanggal}</td>
            </tr>
            <tr>
              <td class="amplopv2-label">No. Reg</td>
              <td class="amplopv2-colon">:</td>
              <td class="amplopv2-value">${pasien.noRegistrasi}</td>
              <td class="amplopv2-label">Pengirim</td>
              <td class="amplopv2-colon">:</td>
              <td class="amplopv2-value">${pasien.dokterPengirim || '-'}</td>
            </tr>
          </table>
          <div class="amplopv2-footer">${FOOTER_AMPLOP_V2}</div>
        </div>
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

interface CetakAmplopPendaftaranModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly pasien: CetakAmplopPendaftaranPasien | null;
}

export function CetakAmplopPendaftaranModal({ open, onClose, pasien }: CetakAmplopPendaftaranModalProps) {
  const [versi, setVersi] = useState<VersiAmplop>('v1');

  useEffect(() => {
    if (open) setVersi('v1');
  }, [open]);

  if (!pasien) {
    return null;
  }

  const tanggal = new Date(pasien.tanggalMasuk).toLocaleDateString('id-ID');

  async function handlePrintNow() {
    if (!pasien) return;
    const win = window.open('', '_blank', 'width=850,height=700');
    if (!win) {
      alert('Jendela cetak diblokir oleh browser. Harap izinkan pop-up untuk situs ini.');
      return;
    }

    if (versi === 'v2') {
      await tulisAmplopV2(win, pasien, tanggal);
      return;
    }

    const amplopHtml = `
      <div class="amplop-sheet">
        <div class="amplop-header">
          <div class="amplop-title">KLINIK ROENTGEN &amp; USG PRIMA HUSADA</div>
          <div class="amplop-subtitle">PENDAFTARAN PASIEN UMUM</div>
        </div>
        <div class="amplop-body">
          <table class="amplop-table">
            <tr>
              <th>No. Registrasi</th>
              <td><strong>${pasien.noRegistrasi}</strong></td>
            </tr>
            <tr>
              <th>Nama Pasien</th>
              <td><strong>${pasien.namaPasien}</strong>${pasien.umur ? ` (${pasien.umur})` : ''}</td>
            </tr>
            <tr>
              <th>Alamat</th>
              <td>${pasien.alamat || '-'}</td>
            </tr>
            <tr>
              <th>Tanggal Masuk</th>
              <td>${tanggal}</td>
            </tr>
            <tr>
              <th>Dokter Pengirim</th>
              <td>${pasien.dokterPengirim || '-'}</td>
            </tr>
          </table>
        </div>
        <div class="amplop-footer">
          * Simpan amplop ini sebagai bukti pendaftaran pasien.
        </div>
      </div>
    `;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Klinik Prima Husada — Amplop Pendaftaran</title>
          <style>
            @page { size: 10cm 8cm; margin: 0; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #0f172a;
              background: #fff;
              margin: 0;
              padding: 20px;
            }
            .amplop-sheet {
              width: 10cm;
              height: 8cm;
              box-sizing: border-box;
              overflow: hidden;
              border: 2px solid #000;
              padding: 10px;
              border-radius: 6px;
              margin: 0 auto;
              display: flex;
              flex-direction: column;
            }
            .amplop-header {
              text-align: center;
              border-bottom: 1.5px solid #000;
              padding-bottom: 6px;
              margin-bottom: 8px;
            }
            .amplop-title {
              font-size: 11.5px;
              font-weight: 700;
              letter-spacing: 0.2px;
            }
            .amplop-subtitle {
              font-size: 11px;
              font-weight: 600;
              margin-top: 3px;
            }
            .amplop-body {
              flex: 1;
              min-height: 0;
            }
            .amplop-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            .amplop-table th {
              text-align: left;
              width: 100px;
              padding: 3px 6px 3px 0;
              font-size: 10.5px;
              color: #334155;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .amplop-table td {
              padding: 3px 0;
              font-size: 11.5px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
              overflow-wrap: break-word;
            }
            .amplop-footer {
              margin-top: 6px;
              font-size: 8.5px;
              font-style: italic;
              color: #475569;
              text-align: center;
            }
          </style>
        </head>
        <body>
          ${amplopHtml}
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
      title={`Pratinjau Cetak ${versi === 'label' ? 'Label' : 'Amplop'} — ${pasien.noRegistrasi}`}
      onClose={onClose}
      size="lg"
    >
      <div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`btn btn--sm ${versi === 'v1' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setVersi('v1')}
          >
            ✉️ Amplop
          </button>
          <button
            type="button"
            className={`btn btn--sm ${versi === 'v2' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setVersi('v2')}
          >
            🧾 Amplop V2
          </button>
          <button
            type="button"
            className={`btn btn--sm ${versi === 'label' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setVersi('label')}
            title="Cetak label stiker identitas"
          >
            🏷️ Label
          </button>
        </div>
        {versi === 'label' ? (
          <CetakLabelPendaftaranIsi pasien={pasien} onClose={onClose} />
        ) : (
        <>
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
          {versi === 'v2' ? (
            <AmplopV2Preview pasien={pasien} tanggal={tanggal} />
          ) : (
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
                textAlign: 'center',
                borderBottom: '2px solid #1e293b',
                paddingBottom: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>KLINIK ROENTGEN &amp; USG PRIMA HUSADA</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0369a1', marginTop: '0.25rem' }}>
                PENDAFTARAN PASIEN UMUM
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', width: '180px', color: '#64748b' }}>
                    No. Registrasi
                  </th>
                  <td style={{ padding: '8px 4px', fontWeight: 700, fontSize: '1.05rem' }}>{pasien.noRegistrasi}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>Nama Pasien</th>
                  <td style={{ padding: '8px 4px' }}>
                    <strong>{pasien.namaPasien}</strong>
                    {pasien.umur ? ` (${pasien.umur})` : ''}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>Alamat</th>
                  <td style={{ padding: '8px 4px' }}>{pasien.alamat || '-'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>Tanggal Masuk</th>
                  <td style={{ padding: '8px 4px' }}>{tanggal}</td>
                </tr>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>Dokter Pengirim</th>
                  <td style={{ padding: '8px 4px' }}>{pasien.dokterPengirim || '-'}</td>
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
              * Simpan amplop ini sebagai bukti pendaftaran pasien.
            </div>
          </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0',
            gap: '0.75rem',
          }}
        >
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Tutup
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void handlePrintNow()} style={{ fontWeight: 600 }}>
            🖨️ Cetak {versi === 'v2' ? 'Amplop V2' : 'Amplop'} Sekarang
          </button>
        </div>
        </>
        )}
      </div>
    </Modal>
  );
}

const v2Cell = { border: '1px solid #000', padding: '4px 6px', fontSize: '0.85rem' } as const;
const v2Label = { ...v2Cell, width: '20%', color: '#0f172a' } as const;
const v2Colon = { ...v2Cell, width: '3%', textAlign: 'center', color: '#0f172a' } as const;
const v2Value = { ...v2Cell, width: '27%', color: '#1d4ed8', fontWeight: 600 } as const;

/** Pratinjau Amplop V2 (sama dengan Amplop V2 Radiologi). */
function AmplopV2Preview({ pasien, tanggal }: { readonly pasien: CetakAmplopPendaftaranPasien; readonly tanggal: string }) {
  const baris: readonly (readonly [string, string, string, string])[] = [
    ['Nama Pasien', pasien.namaPasien, 'Umur', formatUmurBebas(pasien.umur ?? '', 'thn')],
    ['Alamat', pasien.alamat || '-', 'Tanggal', tanggal],
    ['No. Reg', pasien.noRegistrasi, 'Pengirim', pasien.dokterPengirim || '-'],
  ];
  return (
    <div
      style={{
        background: '#ffffff',
        border: '2px solid #1e293b',
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <img src={logoPrimahusada} alt="Logo" style={{ width: 50, height: 50, objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ textAlign: 'center', color: '#1d4ed8' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>KLINIK ROENTGEN DAN USG</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.3 }}>PRIMA HUSADA</div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>Jl. Raya Siliwangi Parung Kuda, Telp/HP 0857-1932-5557</div>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: '0.75rem' }}>
        <tbody>
          {baris.map(([l1, v1, l2, v2]) => (
            <tr key={l1}>
              <td style={v2Label}>{l1}</td>
              <td style={v2Colon}>:</td>
              <td style={v2Value}>{v1}</td>
              <td style={v2Label}>{l2}</td>
              <td style={v2Colon}>:</td>
              <td style={v2Value}>{v2}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, fontStyle: 'italic', color: '#1d4ed8' }}>
        {FOOTER_AMPLOP_V2}
      </div>
    </div>
  );
}
