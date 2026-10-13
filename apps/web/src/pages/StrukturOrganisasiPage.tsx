import '../components/ui/ui.css';

const PIMPINAN = 'Pimpinan Klinik Prima Husada';
const PENANGGUNG_JAWAB = 'Dokter Penanggung Jawab';
const UNIT_KERJA = ['HRD', 'Radiologi', 'Laboratorium', 'Kebersihan', 'Admin'] as const;

const kotakStyle = {
  padding: '0.75rem 1.25rem',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface, #fff)',
  fontWeight: 600,
  textAlign: 'center',
  minWidth: '9rem',
} as const;

const garisStyle = {
  width: '2px',
  height: '1.25rem',
  background: 'var(--color-border)',
} as const;

/** Bagan struktur organisasi Klinik Prima Husada: pimpinan di puncak,
 * dokter penanggung jawab di bawahnya, lalu unit kerja sejajar. */
export function StrukturOrganisasiPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem' }}>
      <h2 style={{ marginBottom: '1.25rem' }}>Struktur Organisasi</h2>
      <div style={{ ...kotakStyle, background: 'var(--color-primary)', color: '#fff' }}>
        {PIMPINAN}
      </div>
      <div style={garisStyle} />
      <div style={{ ...kotakStyle, borderColor: 'var(--color-primary)' }}>{PENANGGUNG_JAWAB}</div>
      <div style={garisStyle} />
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          borderTop: '2px solid var(--color-border)',
          paddingTop: '1.25rem',
        }}
      >
        {UNIT_KERJA.map((unit) => (
          <div key={unit} style={kotakStyle}>
            {unit}
          </div>
        ))}
      </div>
    </div>
  );
}
