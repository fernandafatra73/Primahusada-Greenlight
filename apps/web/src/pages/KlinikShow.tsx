import { useEffect } from 'react';
import { LoginSlideshow } from './LoginSlideshow.tsx';
import './login.css';

interface KlinikShowProps {
  readonly onClose: () => void;
}

/**
 * Slide profil klinik (sama persis dengan latar halaman login) dalam layar penuh,
 * dibuka dari tombol Klinik di Dashboard. Tanpa form login; Esc atau tombol Tutup menutupnya.
 */
export function KlinikShow({ onClose }: KlinikShowProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="login-frame klinik-show" role="dialog" aria-modal="true" aria-label="Klinik Prima Husada">
      <LoginSlideshow />
      <div className="login-actions">
        <button type="button" className="login-actions__btn login-actions__btn--login" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  );
}
