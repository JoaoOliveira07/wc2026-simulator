import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { AFPlayer } from '../data/apiFootball';
import type { PositionType } from '../data/formations';

const POSITION_NAMES: Record<PositionType, string> = {
  gk: 'Goalkeeper', df: 'Defender', mf: 'Midfielder', fw: 'Attacker',
};

const POS_COLORS: Record<PositionType, { bg: string; text: string; border: string }> = {
  gk: { bg: 'rgba(234,179,8,0.18)',  text: '#fbbf24', border: 'rgba(234,179,8,0.35)'  },
  df: { bg: 'rgba(59,130,246,0.18)', text: '#60a5fa', border: 'rgba(59,130,246,0.35)' },
  mf: { bg: 'rgba(34,197,94,0.18)',  text: '#4ade80', border: 'rgba(34,197,94,0.35)'  },
  fw: { bg: 'rgba(239,68,68,0.18)',  text: '#f87171', border: 'rgba(239,68,68,0.35)'  },
};

const POS_LABEL: Record<PositionType, string> = {
  gk: 'Goleiro', df: 'Defensor', mf: 'Meio-campo', fw: 'Atacante',
};

interface Props {
  squad: AFPlayer[];
  slotType: PositionType;
  usedIds: Set<number>;
  onSelect: (player: AFPlayer | null) => void;
  onClose: () => void;
}

export function PlayerPickerModal({ squad, slotType, usedIds, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<PositionType>(slotType);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const filtered = squad
    .filter(p => p.position === POSITION_NAMES[filterType])
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.number ?? 99) - (b.number ?? 99));

  const slotCol = POS_COLORS[slotType];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d1117', border: `1px solid ${slotCol.border}`,
          borderRadius: 16, width: 320, maxHeight: '72vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          animation: 'fadeSlideUp 0.18s ease both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid rgba(30,41,59,0.7)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
            Escolher {POS_LABEL[slotType]}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Position filter tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid rgba(30,41,59,0.5)', flexShrink: 0 }}>
          {(['gk', 'df', 'mf', 'fw'] as PositionType[]).map(pt => {
            const c = POS_COLORS[pt];
            const active = filterType === pt;
            return (
              <button
                key={pt}
                onClick={() => setFilterType(pt)}
                style={{
                  flex: 1, padding: '5px 0', borderRadius: 6,
                  fontSize: 10, fontWeight: 800, cursor: 'pointer',
                  background: active ? c.bg : 'transparent',
                  color: active ? c.text : '#475569',
                  border: active ? `1px solid ${c.border}` : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {pt.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{
          padding: '8px 12px', borderBottom: '1px solid rgba(30,41,59,0.5)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <Search size={13} style={{ color: '#475569', flexShrink: 0 }} />
          <input
            autoFocus
            placeholder="Buscar jogador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#f1f5f9', fontSize: 12, fontFamily: 'inherit',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Remove option */}
        <button
          onClick={() => onSelect(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px',
            background: 'rgba(239,68,68,0.06)', border: 'none',
            borderBottom: '1px solid rgba(30,41,59,0.5)',
            color: '#f87171', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', width: '100%', flexShrink: 0,
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
        >
          <X size={12} /> Remover do slot
        </button>

        {/* Player list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 0', color: '#374151', fontSize: 12 }}>
              Nenhum jogador encontrado
            </div>
          )}
          {filtered.map(p => {
            const isUsed = usedIds.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 16px', background: 'transparent', border: 'none',
                  cursor: 'pointer', opacity: isUsed ? 0.45 : 1,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,41,59,0.6)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Photo */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                  flexShrink: 0, background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  {p.photo && (
                    <img
                      src={p.photo} alt={p.name} referrerPolicy="no-referrer"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: '#f1f5f9',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                    {p.position}{p.number ? ` · #${p.number}` : ''}
                  </div>
                </div>

                {/* Used badge */}
                {isUsed && (
                  <span style={{ fontSize: 9, color: '#4ade80', fontWeight: 800, letterSpacing: '0.04em', flexShrink: 0 }}>
                    EM USO
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
