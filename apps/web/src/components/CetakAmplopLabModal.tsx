import { useEffect, useState, type CSSProperties } from 'react';
import { Modal } from './ui/Modal.tsx';
import { computeUmurYears, formatDateShort } from '../lib/format.ts';
import './ui/ui.css';

const editInputStyle: CSSProperties = {
  width: '100%',
  padding: '0.3rem 0.5rem',
  fontSize: '0.9rem',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  fontFamily: 'inherit',
};

export interface CetakAmplopLabPasien {
  readonly id: string;
  readonly regCode: string;
  readonly nama: string;
  readonly umur?: number;
  readonly tanggalLahir: string;
  readonly createdAt: string;
  readonly pengirim: {
    readonly nama: string;
  };
  readonly pemeriksaan: readonly {
    readonly nama: string;
  }[];
}

interface CetakAmplopLabModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly pasien: CetakAmplopLabPasien | null;
}

export function CetakAmplopLabModal({ open, onClose, pasien }: CetakAmplopLabModalProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    regCode: '',
    nama: '',
    umur: '',
    tanggal: '',
    jenisNames: '',
    pengirimNama: '',
  });

  useEffect(() => {
    if (!pasien) return;
    const umurValue = pasien.umur ?? computeUmurYears(pasien.tanggalLahir, pasien.createdAt) ?? 0;
    setForm({
      regCode: pasien.regCode,
      nama: pasien.nama,
      umur: String(umurValue),
      tanggal: formatDateShort(pasien.createdAt),
      jenisNames: pasien.pemeriksaan.map((p) => p.nama).join(', ') || 'Pemeriksaan Laboratorium',
      pengirimNama: pasien.pengirim.nama,
    });
    setEditing(false);
  }, [pasien]);

  if (!pasien) {
    return null;
  }

  function handlePrintNow() {
    const win = window.open('', '_blank', 'width=850,height=700');
    if (!win) {
      alert('Jendela cetak diblokir oleh browser. Harap izinkan pop-up untuk situs ini.');
      return;
    }

    const amplopHtml = `
      <div class="amplop-sheet">
        <div class="amplop-header">
          <div class="amplop-title">KLINIK PRIMA HUSADA</div>
          <div class="amplop-subtitle">HASIL PEMERIKSAAN LABORATORIUM</div>
        </div>
        <div class="amplop-body">
          <table class="amplop-table">
            <tr>
              <th>No. Registrasi</th>
              <td><strong>${form.regCode}</strong></td>
            </tr>
            <tr>
              <th>Nama Pasien</th>
              <td><strong>${form.nama}</strong> (${form.umur} tahun)</td>
            </tr>
            <tr>
              <th>Tanggal</th>
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
          * Harap membawa amplop ini saat pengambilan hasil pemeriksaan laboratorium.
        </div>
      </div>
    `;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Klinik Prima Husada — Amplop Laboratorium</title>
          <style>
            @page { margin: 2cm 0 0 0.5cm; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #0f172a;
              background: #fff;
              margin: 0;
              padding: 0;
            }
            .amplop-sheet {
              width: 8cm;
              height: 6cm;
              box-sizing: border-box;
              overflow: hidden;
              border: 2px solid #000;
              padding: 10px;
              border-radius: 6px;
              margin: 0;
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
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 0.3px;
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
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
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
    <Modal open={open} title={`Pratinjau Cetak Amplop — ${pasien.regCode}`} onClose={onClose} size="lg">
      <div>
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
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>KLINIK PRIMA HUSADA</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0369a1', marginTop: '0.25rem' }}>
                HASIL PEMERIKSAAN LABORATORIUM
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', width: '180px', color: '#64748b' }}>
                    No. Registrasi
                  </th>
                  <td style={{ padding: '8px 4px', fontWeight: 700, fontSize: '1.05rem' }}>
                    {editing ? (
                      <input
                        value={form.regCode}
                        onChange={(e) => setForm((f) => ({ ...f, regCode: e.target.value }))}
                        style={editInputStyle}
                      />
                    ) : (
                      form.regCode
                    )}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>Nama Pasien</th>
                  <td style={{ padding: '8px 4px' }}>
                    {editing ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          value={form.nama}
                          onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                          style={{ ...editInputStyle, flex: 1 }}
                          placeholder="Nama pasien"
                        />
                        <input
                          value={form.umur}
                          onChange={(e) => setForm((f) => ({ ...f, umur: e.target.value }))}
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
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>Tanggal</th>
                  <td style={{ padding: '8px 4px' }}>
                    {editing ? (
                      <input
                        value={form.tanggal}
                        onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                        style={editInputStyle}
                      />
                    ) : (
                      form.tanggal
                    )}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>Jenis Pemeriksaan</th>
                  <td style={{ padding: '8px 4px', fontWeight: 600, color: '#0f172a' }}>
                    {editing ? (
                      <input
                        value={form.jenisNames}
                        onChange={(e) => setForm((f) => ({ ...f, jenisNames: e.target.value }))}
                        style={editInputStyle}
                      />
                    ) : (
                      form.jenisNames
                    )}
                  </td>
                </tr>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#64748b' }}>Kepada Yth. TS</th>
                  <td style={{ padding: '8px 4px' }}>
                    {editing ? (
                      <input
                        value={form.pengirimNama}
                        onChange={(e) => setForm((f) => ({ ...f, pengirimNama: e.target.value }))}
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
              * Harap membawa amplop ini saat pengambilan hasil pemeriksaan laboratorium.
            </div>
          </div>
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
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? '✓ Selesai Edit' : '✏️ Edit'}
          </button>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Tutup
            </button>
            <button type="button" className="btn btn--primary" onClick={handlePrintNow} style={{ fontWeight: 600 }}>
              🖨️ Cetak Amplop Sekarang
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
