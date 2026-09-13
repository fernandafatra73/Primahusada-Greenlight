import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { getViewFrameColor, type AppViewId } from '../../config/navigation.ts';
import type { AuthUser } from '../../lib/auth.ts';
import { useListRefresh } from '../../context/ListRefreshContext.tsx';
import { useMusicPlayer } from '../../context/MusicPlayerContext.tsx';
import { apiGet } from '../../lib/api.ts';
import { AutoTextBar } from './AutoTextBar.tsx';
import { TopNavbar } from './TopNavbar.tsx';
import { ReagenReminderBar } from './ReagenReminderBar.tsx';
import './layout.css';

const CLINIC_MARQUEE_TEXT = 'Klinik Prima Husada — Jl. Siliwangi Ruko Palapa No 2 Parung Kuda. Telp 0857-1932-5557';

interface AutoTextResponse {
  readonly item: { readonly text: string } | null;
}

interface AppShellProps {
  readonly activeView: AppViewId;
  readonly authUser: AuthUser;
  readonly onNavigate: (id: AppViewId) => void;
  readonly onLogout: () => void;
  readonly children: ReactNode;
}

export function AppShell({ activeView, authUser, onNavigate, onLogout, children }: AppShellProps) {
  const { version: listRefreshVersion } = useListRefresh();
  const [marqueeText, setMarqueeText] = useState(CLINIC_MARQUEE_TEXT);
  const { playlist, playingId } = useMusicPlayer();

  const loadAutoText = useCallback(async () => {
    try {
      const res = await apiGet<AutoTextResponse>('/api/autotext');
      setMarqueeText(res.item?.text?.trim() || CLINIC_MARQUEE_TEXT);
    } catch {
      setMarqueeText(CLINIC_MARQUEE_TEXT);
    }
  }, []);

  useEffect(() => {
    void loadAutoText();
  }, [loadAutoText, listRefreshVersion]);

  const playingLirik = playlist.find((s) => s.id === playingId)?.lirik?.trim() || null;

  return (
    <div className="app-shell">
      <div className="app-shell__accent-bar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <TopNavbar
        activeId={activeView}
        onNavigate={onNavigate}
        role={authUser.role}
        departemen={authUser.departemen}
        onLogout={onLogout}
      />
      {getViewFrameColor(activeView) === 'red' && <ReagenReminderBar />}
      <main className="app-content">{children}</main>
      <AutoTextBar text={playingLirik ?? marqueeText} />
    </div>
  );
}
