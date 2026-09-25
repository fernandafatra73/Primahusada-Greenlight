import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import '../components/ui/ui.css';

interface KoranLink {
  readonly label: string;
  readonly url: string;
}

const KORAN_LINKS: readonly KoranLink[] = [
  { label: 'Detik.com', url: 'https://www.detik.com/' },
  { label: 'Republika', url: 'https://www.republika.co.id/' },
  { label: 'Kompas', url: 'https://www.kompas.com/' },
];

export function KoranPage() {
  return (
    <ListPageShell title="Koran" subtitle="Akses cepat portal berita">
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
        {KORAN_LINKS.map((koran) => (
          <a
            key={koran.label}
            href={koran.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary"
            style={{
              flex: '1 1 200px',
              textAlign: 'center',
              padding: '1.5rem',
              fontSize: '1.1rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {koran.label}
          </a>
        ))}
      </div>
    </ListPageShell>
  );
}
