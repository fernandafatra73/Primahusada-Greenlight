interface ComingSoonPageProps {
  readonly title: string;
  readonly description?: string;
}

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '4rem 2rem',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}
    >
      <div style={{ fontSize: '2.5rem' }}>🚧</div>
      <h2 style={{ margin: 0, color: 'var(--color-text)' }}>{title}</h2>
      <p style={{ margin: 0, maxWidth: '32rem' }}>
        {description ?? 'Modul ini sedang dalam pengembangan dan akan segera hadir.'}
      </p>
    </div>
  );
}
