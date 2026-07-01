import { useMemo, useState } from 'react';
import { Plus, RotateCcw, Pencil } from 'lucide-react';
import type { AFPlayer } from '../data/apiFootball';
import {
  FORMATIONS, DEFAULT_FORMATION, getFormation, getSlotKeys,
  type FormationConfig, type PositionType,
} from '../data/formations';
import { PlayerPickerModal } from './PlayerPickerModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const POS_COLORS: Record<PositionType, { bg: string; text: string; border: string }> = {
  gk: { bg: 'rgba(234,179,8,0.18)',  text: '#fbbf24', border: 'rgba(234,179,8,0.35)'  },
  df: { bg: 'rgba(59,130,246,0.18)', text: '#60a5fa', border: 'rgba(59,130,246,0.35)' },
  mf: { bg: 'rgba(34,197,94,0.18)',  text: '#4ade80', border: 'rgba(34,197,94,0.35)'  },
  fw: { bg: 'rgba(239,68,68,0.18)',  text: '#f87171', border: 'rgba(239,68,68,0.35)'  },
};

const POSITION_MAP: Record<PositionType, string> = {
  gk: 'Goalkeeper', df: 'Defender', mf: 'Midfielder', fw: 'Attacker',
};

// ── Auto-populate slots from squad ────────────────────────────────────────────

function autoPopulate(squad: AFPlayer[], config: FormationConfig): Record<string, number> {
  const byType: Record<PositionType, AFPlayer[]> = { gk: [], df: [], mf: [], fw: [] };
  for (const p of squad) {
    const type = (Object.keys(POSITION_MAP) as PositionType[]).find(k => POSITION_MAP[k] === p.position);
    if (type) byType[type].push(p);
  }
  for (const key of Object.keys(byType) as PositionType[]) {
    byType[key].sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
  }

  const counters: Record<PositionType, number> = { gk: 0, df: 0, mf: 0, fw: 0 };
  const slots: Record<string, number> = {};
  for (const slot of getSlotKeys(config)) {
    const pool = byType[slot.type];
    const idx = counters[slot.type]++;
    if (pool[idx]) slots[slot.key] = pool[idx].id;
  }
  return slots;
}

// ── Slot components ───────────────────────────────────────────────────────────

function EmptySlot({ type, onClick }: { type: PositionType; onClick: () => void }) {
  const col = POS_COLORS[type];
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 64 }}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 54, height: 66, borderRadius: 9, cursor: 'pointer',
          border: `2px dashed ${hovered ? col.text : col.border}`,
          background: hovered ? col.bg : 'rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
          transition: 'all 0.15s',
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
        }}
      >
        <Plus size={16} style={{ color: hovered ? col.text : col.border }} />
        <span style={{ fontSize: 7, fontWeight: 900, color: hovered ? col.text : col.border, letterSpacing: '0.06em' }}>
          {type.toUpperCase()}
        </span>
      </div>
      <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0)', height: 11 }}>·</span>
    </div>
  );
}

function FilledSlot({ player, type, onClick }: { player: AFPlayer; type: PositionType; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const col = POS_COLORS[type];
  const short = type.toUpperCase();

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 64, cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 54, height: 66, borderRadius: 9, overflow: 'hidden', position: 'relative',
        background: '#1a2e1a',
        boxShadow: hovered
          ? `0 8px 24px rgba(0,0,0,0.8), 0 0 0 2px ${col.text}`
          : `0 3px 12px rgba(0,0,0,0.65), 0 0 0 1.5px ${col.border}`,
        transform: hovered ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}>
        {/* Photo */}
        {player.photo ? (
          <img
            src={player.photo} alt={player.name} referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            onError={e => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const fb = img.nextElementSibling as HTMLElement | null;
              if (fb) fb.style.display = 'flex';
            }}
          />
        ) : null}

        {/* Silhouette fallback */}
        <div style={{
          width: '100%', height: '100%', background: '#1e3a1e',
          display: player.photo ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="30" height="36" viewBox="0 0 30 36" fill="none">
            <circle cx="15" cy="11" r="8" fill="rgba(255,255,255,0.12)" />
            <ellipse cx="15" cy="30" rx="13" ry="9" fill="rgba(255,255,255,0.08)" />
          </svg>
        </div>

        {/* Bottom gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />

        {/* Hover swap overlay */}
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Pencil size={18} style={{ color: '#fff' }} />
          </div>
        )}

        {/* Position badge */}
        <span style={{
          position: 'absolute', bottom: 3, left: 3,
          fontSize: 7.5, fontWeight: 900, padding: '1px 3px', borderRadius: 3,
          background: 'rgba(0,0,0,0.65)', color: col.text, lineHeight: 1.5, letterSpacing: '0.03em',
        }}>
          {short}
        </span>
      </div>

      {/* Name */}
      <span style={{
        fontSize: 9.5, fontWeight: 800,
        color: hovered ? '#ffffff' : '#e2e8f0',
        textAlign: 'center', lineHeight: 1.1,
        letterSpacing: '0.04em', textTransform: 'uppercase',
        width: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textShadow: '0 1px 5px rgba(0,0,0,1)',
        transition: 'color 0.15s',
      }}>
        {player.name}
      </span>
    </div>
  );
}

// ── Pitch background (shared visual) ─────────────────────────────────────────

function PitchBackground() {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden',
      background: 'repeating-linear-gradient(180deg,#155228 0px,#1a6330 50px,#1a6330 50px,#155228 100px)',
      boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)', zIndex: 0, pointerEvents: 'none',
    }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 500 700" preserveAspectRatio="none">
        <rect x={12} y={8} width={476} height={684} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={1.5} rx={3} />
        <line x1={12} y1={350} x2={488} y2={350} stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
        <rect x={130} y={8} width={240} height={90} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
        <rect x={130} y={602} width={240} height={90} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
        <rect x={200} y={8} width={100} height={30} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        <rect x={200} y={662} width={100} height={30} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      </svg>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 90, height: 90, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.1)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', pointerEvents: 'none',
      }} />
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

interface Props {
  team: string;
  squad: AFPlayer[];
}

interface PickerTarget {
  slotKey: string;
  type: PositionType;
}

export function FormationEditor({ team, squad }: Props) {
  const storageKey = `editor:${team}`;

  const [formation, setFormation] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      return saved?.formation ?? DEFAULT_FORMATION;
    } catch { return DEFAULT_FORMATION; }
  });

  const [slots, setSlots] = useState<Record<string, number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (saved?.slots && Object.keys(saved.slots).length > 0) return saved.slots;
    } catch {}
    return autoPopulate(squad, getFormation(DEFAULT_FORMATION));
  });

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  const config = getFormation(formation);

  const playerById = useMemo(() => {
    const map: Record<number, AFPlayer> = {};
    for (const p of squad) map[p.id] = p;
    return map;
  }, [squad]);

  const usedIds = useMemo(() => new Set(Object.values(slots)), [slots]);

  function save(f: string, s: Record<string, number>) {
    try { localStorage.setItem(storageKey, JSON.stringify({ formation: f, slots: s })); } catch {}
  }

  function handleFormationChange(newId: string) {
    const newConfig = getFormation(newId);
    const newSlots = autoPopulate(squad, newConfig);
    setFormation(newId);
    setSlots(newSlots);
    save(newId, newSlots);
  }

  function handlePlayerSelect(player: AFPlayer | null) {
    if (!pickerTarget) return;
    const newSlots = { ...slots };
    if (player) {
      newSlots[pickerTarget.slotKey] = player.id;
    } else {
      delete newSlots[pickerTarget.slotKey];
    }
    setSlots(newSlots);
    save(formation, newSlots);
    setPickerTarget(null);
  }

  function handleReset() {
    const newSlots = autoPopulate(squad, config);
    setSlots(newSlots);
    save(formation, newSlots);
  }

  // Reverse rows so FW is rendered at top, GK at bottom
  const reversedRows = [...config.rows.entries()].reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Formation picker */}
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
        {FORMATIONS.map(f => {
          const active = formation === f.id;
          return (
            <button
              key={f.id}
              onClick={() => handleFormationChange(f.id)}
              style={{
                padding: '5px 11px', borderRadius: 8,
                fontSize: 11, fontWeight: 800, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
                background: active ? 'rgba(74,222,128,0.12)' : 'transparent',
                color: active ? '#4ade80' : '#475569',
                border: active ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(30,41,59,0.6)',
                transition: 'all 0.15s',
              }}
            >
              {f.id}
            </button>
          );
        })}
      </div>

      {/* Pitch */}
      <div style={{ position: 'relative', borderRadius: 14 }}>
        <PitchBackground />

        {/* Slot grid — above background */}
        <div style={{ position: 'relative', zIndex: 1, padding: '36px 4px 40px' }}>
          {reversedRows.map(([rowIdx, row], displayIdx) => {
            const rowSlots = Array.from({ length: row.count }, (_, colIdx) => ({
              key: `r${rowIdx}_${colIdx}`,
              type: row.type,
            }));

            const isLastRow = displayIdx === reversedRows.length - 1;

            return (
              <div
                key={rowIdx}
                style={{
                  display: 'flex',
                  justifyContent: row.count === 1 ? 'center' : 'space-evenly',
                  alignItems: 'flex-end',
                  paddingBottom: isLastRow ? 0 : 32,
                }}
              >
                {rowSlots.map(({ key, type }) => {
                  const playerId = slots[key];
                  const player = playerId != null ? playerById[playerId] : undefined;
                  if (player) {
                    return (
                      <FilledSlot
                        key={key}
                        player={player}
                        type={type}
                        onClick={() => setPickerTarget({ slotKey: key, type })}
                      />
                    );
                  }
                  return (
                    <EmptySlot
                      key={key}
                      type={type}
                      onClick={() => setPickerTarget({ slotKey: key, type })}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Bottom bar: formation label + reset */}
        <div style={{
          position: 'absolute', bottom: 10, left: 14, right: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 800,
            color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em',
            pointerEvents: 'none',
          }}>
            {formation}
          </span>
          <button
            onClick={handleReset}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 6,
              fontSize: 9, fontWeight: 700, cursor: 'pointer',
              background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#f1f5f9';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            <RotateCcw size={10} /> Resetar
          </button>
        </div>
      </div>

      {/* Player picker modal */}
      {pickerTarget && (
        <PlayerPickerModal
          squad={squad}
          slotType={pickerTarget.type}
          usedIds={usedIds}
          onSelect={handlePlayerSelect}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
}
