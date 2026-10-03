import { useEffect, useRef } from 'react';
import { IDLE_LOGOUT_MS, isIdleExpired } from '../lib/idleTimeout.ts';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
const CHECK_INTERVAL_MS = 15_000;

/**
 * Calls `onIdle` after `limitMs` without user input. Compares timestamps on a
 * short interval instead of one long timer, so it still fires correctly after
 * the computer sleeps or the tab is throttled in the background.
 */
export function useIdleLogout(enabled: boolean, onIdle: () => void, limitMs: number = IDLE_LOGOUT_MS): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return undefined;

    let lastActivity = Date.now();
    const markActive = (): void => {
      lastActivity = Date.now();
    };
    const check = (): void => {
      if (isIdleExpired(lastActivity, Date.now(), limitMs)) {
        onIdleRef.current();
      }
    };

    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, markActive, { passive: true });
    }
    document.addEventListener('visibilitychange', check);
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);

    return (): void => {
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, markActive);
      }
      document.removeEventListener('visibilitychange', check);
      window.clearInterval(timer);
    };
  }, [enabled, limitMs]);
}
