import { useEffect, useRef } from 'react';

export type RadiologWorklistMenuAction =
  | 'new-add-tab'
  | 'related-replace-tab'
  | 'related-add-tab'
  | 'verify'
  | 'unverify'
  | 'teleradiology'
  | 'ai-request'
  | 'export'
  | 'download'
  | 'copy';

interface MenuEntry {
  readonly action: RadiologWorklistMenuAction;
  readonly label: string;
  readonly hasSubmenu?: boolean;
}

const MENU_GROUPS: readonly (readonly MenuEntry[])[] = [
  [
    { action: 'new-add-tab', label: 'New › Add Tab' },
    { action: 'related-replace-tab', label: 'Related › Replace Tab' },
    { action: 'related-add-tab', label: 'Related › Add Tab' },
  ],
  [
    { action: 'verify', label: 'Verify' },
    { action: 'unverify', label: 'Unverify' },
  ],
  [
    { action: 'teleradiology', label: 'Teleradiology', hasSubmenu: true },
    { action: 'ai-request', label: 'AI Request', hasSubmenu: true },
  ],
  [
    { action: 'export', label: 'Export', hasSubmenu: true },
    { action: 'download', label: 'Download', hasSubmenu: true },
    { action: 'copy', label: 'Copy', hasSubmenu: true },
  ],
];

interface RadiologWorklistContextMenuProps {
  readonly x: number;
  readonly y: number;
  readonly onAction: (action: RadiologWorklistMenuAction) => void;
  readonly onClose: () => void;
}

/** Menu klik-kanan pada worklist Radiologi2, meniru tampilan menu PACS/RIS
 * (New/Related/Verify/Unverify/Teleradiology/AI Request/Export/Download/Copy).
 * Semua item aktif (tidak ada yang di-disable). */
export function RadiologWorklistContextMenu({ x, y, onAction, onClose }: RadiologWorklistContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function handleScroll() {
      onClose();
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  const maxLeft = typeof window === 'undefined' ? x : Math.min(x, window.innerWidth - 230);
  const maxTop = typeof window === 'undefined' ? y : Math.min(y, window.innerHeight - 320);

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        position: 'fixed',
        left: Math.max(4, maxLeft),
        top: Math.max(4, maxTop),
        minWidth: '210px',
        background: '#1c2531',
        border: '1px solid #33404f',
        borderRadius: '6px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        padding: '0.3rem 0',
        zIndex: 2000,
        fontSize: '0.85rem',
        userSelect: 'none',
      }}
    >
      {MENU_GROUPS.map((group, groupIdx) => (
        <div
          key={groupIdx}
          style={
            groupIdx > 0
              ? { borderTop: '1px solid #33404f', marginTop: '0.25rem', paddingTop: '0.25rem' }
              : undefined
          }
        >
          {group.map((entry) => (
            <button
              key={entry.action}
              type="button"
              role="menuitem"
              onClick={() => {
                onAction(entry.action);
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.4rem 1rem',
                background: 'transparent',
                border: 'none',
                color: '#e5e9f0',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2f6fed';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span>{entry.label}</span>
              {entry.hasSubmenu && <span style={{ color: '#9aa7b8' }}>›</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
