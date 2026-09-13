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

interface CetakAmplopPendaftaranModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly pasien: CetakAmplopPendaftaranPasien | null;
}

export function CetakAmplopPendaftaranModal({ open, onClose, pasien }: CetakAmplopPendaftaranModalProps) {
  if (!pasien) {
    return null;
  }

  const tanggal = new Date(pasien.tanggalMasuk).toLocaleDateString('id-ID');

  function handlePrintNow() {
    if (!pasien) return;
    const win = window.open('', '_blank', 'width=850,height=700');
    if (!win) {
      alert('Jendela cetak diblokir oleh browser. Harap izinkan pop-up untuk situs ini.');
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
    <Modal open={open} title={`Pratinjau Cetak Amplop — ${pasien.noRegistrasi}`} onClose={onClose} size="lg">
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
          <button type="button" className="btn btn--primary" onClick={handlePrintNow} style={{ fontWeight: 600 }}>
            🖨️ Cetak Amplop Sekarang
          </button>
        </div>
      </div>
    </Modal>
  );
}
