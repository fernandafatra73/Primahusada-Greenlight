import { useEffect, useRef, useState, type JSX } from 'react';
import logoPrimahusada from '@src/image/logo-primahusada.png';
import {
  isViewAllowed,
  MAIN_NAV_CATEGORIES,
  type AppViewId,
  type Departemen,
  type StaffRole,
} from '../../config/navigation.ts';
import { useMusicPlayer } from '../../context/MusicPlayerContext.tsx';
import {
  IconClipboard,
  IconCurrency,
  IconDocument,
  IconLogout,
  IconSettings,
  IconShare,
  IconShield,
  IconStethoscope,
  IconTag,
} from '../icons/NavIcons.tsx';
import './layout.css';

interface TopNavbarProps {
  readonly activeId: AppViewId;
  readonly onNavigate: (id: AppViewId) => void;
  readonly role: StaffRole;
  readonly departemen: Departemen | null;
  readonly onLogout: () => void;
}

type IconComponent = (props: { className?: string }) => JSX.Element;

interface MenuItem {
  readonly id: AppViewId;
  readonly label: string;
}

type NavbarSpec =
  | { readonly type: 'link'; readonly id: AppViewId; readonly label: string; readonly icon: IconComponent }
  | { readonly type: 'category'; readonly categoryId: string; readonly icon: IconComponent }
  | { readonly type: 'group'; readonly groupId: string; readonly label: string; readonly icon: IconComponent; readonly items: readonly MenuItem[] };

const DROPDOWN_TINT_CLASS: Readonly<Record<string, string>> = {};

const NAVBAR_SPECS: readonly NavbarSpec[] = [
  { type: 'link', id: 'pendaftaran', label: 'Pendaftaran', icon: IconClipboard },
  { type: 'link', id: 'radiologi', label: 'Radiologi', icon: IconStethoscope },
  { type: 'link', id: 'usg', label: 'USG', icon: IconStethoscope },
  { type: 'link', id: 'laboratorium', label: 'Laboratorium', icon: IconTag },
  { type: 'link', id: 'keuangan', label: 'Keuangan', icon: IconCurrency },
  { type: 'category', categoryId: 'master-sistem', icon: IconShield },
  { type: 'link', id: 'pengaturan', label: 'Pengaturan', icon: IconSettings },
  { type: 'category', categoryId: 'farmasi', icon: IconDocument },
  { type: 'link', id: 'mega-data', label: 'Mega Data', icon: IconTag },
  { type: 'link', id: 'sosmed', label: 'Sosmed', icon: IconShare },
];

export function TopNavbar({ activeId, onNavigate, role, departemen, onLogout }: TopNavbarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const { playingId, playLoadingId, toggleQuickPlay } = useMusicPlayer();
  const isMusicPlaying = playingId !== null;
  const isMusicLoading = playLoadingId !== null;

  useEffect(() => {
    if (!openMenuId) return;
    function handlePointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openMenuId]);

  return (
    <header className="app-navbar">
      <div className="app-navbar__brand">
        <div className="app-navbar__logo">
          <img src={logoPrimahusada} alt="Klinik Prima Husada" className="app-navbar__logo-img" />
        </div>
        <div className="app-navbar__brand-text">
          <span className="app-navbar__title">Klinik Prima Husada</span>
          <span className="app-navbar__credit">By: Fatra. AK</span>
        </div>
      </div>

      <nav className="app-navbar__nav" ref={navRef} aria-label="Navigasi utama">
        {NAVBAR_SPECS.map((spec) => {
          if (spec.type === 'link') {
            if (!isViewAllowed(spec.id, role, departemen)) return null;
            const isActive = activeId === spec.id;
            return (
              <button
                key={spec.id}
                type="button"
                className={`app-navbar__link ${isActive ? 'app-navbar__link--active' : ''}`}
                onClick={() => {
                  onNavigate(spec.id);
                  setOpenMenuId(null);
                }}
              >
                <span>{spec.label}</span>
              </button>
            );
          }

          const menu: { readonly key: string; readonly label: string; readonly items: readonly MenuItem[] } | null =
            spec.type === 'category'
              ? (() => {
                  const cat = MAIN_NAV_CATEGORIES.find((c) => c.id === spec.categoryId);
                  return cat
                    ? { key: cat.id, label: cat.label, items: cat.items.map((item) => ({ id: item.id as AppViewId, label: item.shortLabel ?? item.label })) }
                    : null;
                })()
              : { key: spec.groupId, label: spec.label, items: spec.items };

          if (!menu) return null;
          const visibleItems = menu.items.filter((item) => isViewAllowed(item.id, role, departemen));
          if (visibleItems.length === 0) return null;

          const hasActiveChild = visibleItems.some((item) => item.id === activeId);
          const isOpen = openMenuId === menu.key;

          return (
            <div key={menu.key} className="app-navbar__category">
              <button
                type="button"
                className={`app-navbar__link ${hasActiveChild ? 'app-navbar__link--active' : ''} ${isOpen ? 'app-navbar__link--open' : ''}`}
                onClick={() => setOpenMenuId(isOpen ? null : menu.key)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
              >
                <span>{menu.label}</span>
                <span className="app-navbar__caret" aria-hidden>
                  ▾
                </span>
              </button>

              {isOpen && (
                <ul
                  className={`app-navbar__dropdown ${DROPDOWN_TINT_CLASS[menu.key] ?? ''}`}
                  role="menu"
                >
                  {visibleItems.map((item) => (
                    <li key={item.id} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className={`app-navbar__dropdown-link ${activeId === item.id ? 'app-navbar__dropdown-link--active' : ''}`}
                        onClick={() => {
                          onNavigate(item.id);
                          setOpenMenuId(null);
                        }}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="app-navbar__actions">
        <button
          type="button"
          className="app-navbar__icon-btn"
          aria-label={isMusicPlaying ? 'Stop musik' : 'Putar musik'}
          title={isMusicPlaying ? 'Stop musik' : 'Putar musik'}
          onClick={toggleQuickPlay}
          disabled={isMusicLoading}
        >
          {isMusicLoading ? '⏳' : isMusicPlaying ? '⏸️' : '▶️'}
        </button>
        <button type="button" className="app-navbar__icon-btn" aria-label="Logout" onClick={onLogout}>
          <IconLogout />
        </button>
      </div>
    </header>
  );
}
