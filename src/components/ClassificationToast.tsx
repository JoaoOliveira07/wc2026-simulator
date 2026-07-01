import { useState, useEffect, useCallback, useRef } from 'react';
import { Flag } from './Flag';
import { teamPT } from '../data/teamNames';

export interface ToastItem {
  id: string;
  team: string;
  type: 'qualified' | 'eliminated';
  exiting?: boolean;
}

let toastCounter = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((team: string, type: 'qualified' | 'eliminated') => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => {
      const next = [...prev.slice(-2), { id, team, type }];
      return next;
    });
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350);
    }, 3000);
  }, []);

  return { toasts, addToast };
}

export function useClassificationTracker(
  allQualified: Set<string>,
  addToast: (team: string, type: 'qualified' | 'eliminated') => void,
) {
  const prev = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (prev.current === null) {
      prev.current = new Set(allQualified);
      return;
    }
    for (const team of allQualified) {
      if (!prev.current.has(team)) addToast(team, 'qualified');
    }
    for (const team of prev.current) {
      if (!allQualified.has(team)) addToast(team, 'eliminated');
    }
    prev.current = new Set(allQualified);
  }, [allQualified, addToast]);
}

interface ToastContainerProps { toasts: ToastItem[] }

export function ToastContainer({ toasts }: ToastContainerProps) {
  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 12,
            background: t.type === 'qualified'
              ? 'rgba(16,185,129,0.12)'
              : 'rgba(239,68,68,0.12)',
            border: `1px solid ${t.type === 'qualified' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            animation: t.exiting
              ? 'toastSlideOut 0.3s ease forwards'
              : 'toastSlideIn 0.3s ease',
            minWidth: 200,
          }}
        >
          <Flag team={t.team} className="w-8 h-5 rounded-sm shrink-0" />
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: t.type === 'qualified' ? '#6ee7b7' : '#fca5a5',
            }}>
              {teamPT(t.team)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              {t.type === 'qualified' ? '✓ Classificado' : '✗ Eliminado'}
            </div>
          </div>
          <span style={{ fontSize: 18 }}>
            {t.type === 'qualified' ? '🎉' : '❌'}
          </span>
        </div>
      ))}
    </div>
  );
}
