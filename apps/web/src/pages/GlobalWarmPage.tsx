import { ListPageShell } from '../components/ui/ListPageShell.tsx';
import '../components/ui/ui.css';

interface BankLink {
  readonly label: string;
  readonly url: string;
}

const BANK_LINKS: readonly BankLink[] = [
  { label: 'BCA', url: 'https://www.klikbca.com/' },
  { label: 'Mandiri', url: 'https://www.bankmandiri.co.id/layanan-echannel-ebanking' },
  { label: 'BRI', url: 'https://bri.co.id/en/web/bri-web-event/login' },
];

export function GlobalWarmPage() {
  return (
    <ListPageShell title="Global Warm" subtitle="Akses cepat layanan e-banking">
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
        {BANK_LINKS.map((bank) => (
          <a
            key={bank.label}
            href={bank.url}
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
            {bank.label}
          </a>
        ))}
      </div>
    </ListPageShell>
  );
}
