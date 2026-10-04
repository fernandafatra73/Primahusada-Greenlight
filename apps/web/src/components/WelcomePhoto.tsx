// Foto sambutan klinik ("Selamat Datang di Klinik Prima Husada").
// Simpan fotonya sebagai src/image/selamat-datang.(jpg|jpeg|png|webp). Dicari lewat
// glob supaya aplikasi tetap berjalan bila file belum ada.
const PHOTO_MODULES = import.meta.glob<string>('@src/image/selamat-datang.*', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const WELCOME_PHOTO_URL: string | null = Object.values(PHOTO_MODULES)[0] ?? null;

interface WelcomePhotoProps {
  readonly className?: string;
}

/** Foto sambutan, atau null bila file fotonya belum ada di src/image. */
export function WelcomePhoto({ className }: WelcomePhotoProps) {
  if (!WELCOME_PHOTO_URL) return null;
  return <img src={WELCOME_PHOTO_URL} alt="Selamat datang di Klinik Prima Husada" className={className} />;
}
