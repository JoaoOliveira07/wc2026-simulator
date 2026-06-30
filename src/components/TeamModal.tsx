import { useEffect, useState } from 'react';
import { X, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Flag } from './Flag';
import { fetchSquad, fetchCoach } from '../data/apiFootball';
import type { AFPlayer } from '../data/apiFootball';
import { teamPT } from '../data/teamNames';

// ── Position helpers ─────────────────────────────────────────────────────────

const POS_SHORT: Record<string, string> = {
  Goalkeeper: 'GK', Defender: 'DF', Midfielder: 'MF', Attacker: 'FW',
};
const POS_ORDER  = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
const POS_LABEL: Record<string, string> = {
  Goalkeeper: 'Goleiros', Defender: 'Defensores', Midfielder: 'Meias', Attacker: 'Atacantes',
};
const POS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Goalkeeper: { bg: 'rgba(234,179,8,0.18)',  text: '#fbbf24', border: 'rgba(234,179,8,0.35)'  },
  Defender:   { bg: 'rgba(59,130,246,0.18)', text: '#60a5fa', border: 'rgba(59,130,246,0.35)' },
  Midfielder: { bg: 'rgba(34,197,94,0.18)',  text: '#4ade80', border: 'rgba(34,197,94,0.35)'  },
  Attacker:   { bg: 'rgba(239,68,68,0.18)',  text: '#f87171', border: 'rgba(239,68,68,0.35)'  },
};

// API returns names already abbreviated: "R. Gravenberch", "B. Embolo"
// Use as-is; if unusually long, truncate via CSS
function pinName(fullName: string): string {
  return fullName.trim();
}

// ── Infer likely starting 11 ─────────────────────────────────────────────────

function inferLineup(squad: AFPlayer[]): { rows: AFPlayer[][], formation: string, gaps: number[] } {
  const byPos: Record<string, AFPlayer[]> = {
    Goalkeeper: [], Defender: [], Midfielder: [], Attacker: [],
  };
  for (const p of squad) {
    const key = byPos[p.position] !== undefined ? p.position : 'Midfielder';
    byPos[key].push(p);
  }
  for (const key of Object.keys(byPos)) {
    byPos[key].sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
  }

  const gk = byPos.Goalkeeper.slice(0, 1);
  const df = byPos.Defender.slice(0, 4);
  const mf = byPos.Midfielder.slice(0, 3);
  const fw = byPos.Attacker.slice(0, 3);

  const formation = [df.length, mf.length, fw.length].join('-');

  // Build rows and gaps bottom→top (GK first).
  // gaps[i] = space below rows[i] (between rows[i] and rows[i+1]) in reversed display order.
  // Intra-zone (same tactical unit): ~10px. Inter-zone boundaries: 48–88px.
  const rows: AFPlayer[][] = [gk];
  // gaps stored in reversed order: gaps[0] = DEF→GK, gaps[1] = MF→DEF or CDM→DEF, etc.
  const gapsRev: number[] = []; // built alongside rows (gap below current row)

  // DEF always straight line; gap to GK
  rows.push(df);
  gapsRev.push(44); // DEF→GK

  // MF: 3 → inverted triangle (CDM below, 2 CM above)
  if (mf.length === 3) {
    rows.push([mf[0]]);          // CDM
    gapsRev.push(48);            // CDM→DEF
    rows.push([mf[1], mf[2]]);   // 2 CMs
    gapsRev.push(12);            // CM→CDM (intra-mid)
  } else {
    rows.push(mf);
    gapsRev.push(48);            // MF→DEF
  }

  // FW: 3 → triangle (wingers below CF)
  if (fw.length === 3) {
    rows.push([fw[1], fw[2]]);   // wingers
    gapsRev.push(48);            // wingers→top MF row
    rows.push([fw[0]]);          // CF
    gapsRev.push(10);            // CF→wingers (intra-attack)
  } else {
    rows.push(fw);
    gapsRev.push(48);            // FW→top MF row
  }

  // gaps array is in bottom→top order; reverse it to match reversed rows (top→bottom)
  const gaps = [...gapsRev].reverse();

  return { rows, formation, gaps };
}

// ── Hover tooltip ─────────────────────────────────────────────────────────────

function PlayerTooltip({ player }: { player: AFPlayer }) {
  const col = POS_COLORS[player.position] ?? POS_COLORS.Midfielder;
  const short = POS_SHORT[player.position] ?? '??';
  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
      transform: 'translateX(-50%)',
      background: '#0d1117', border: `1px solid ${col.border}`,
      borderRadius: 12, padding: '10px 14px', zIndex: 100, pointerEvents: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', gap: 10, minWidth: 160,
      whiteSpace: 'nowrap',
    }}>
      {/* Arrow */}
      <div style={{
        position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
        width: 10, height: 6, overflow: 'hidden',
      }}>
        <div style={{
          width: 8, height: 8, background: '#0d1117', border: `1px solid ${col.border}`,
          transform: 'rotate(45deg)', margin: '0 auto', marginTop: -4,
        }} />
      </div>
      {/* Photo */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
        border: `1.5px solid ${col.border}`, background: '#1e293b',
      }}>
        {player.photo && (
          <img src={player.photo} alt={player.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{player.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
            background: col.bg, color: col.text, border: `1px solid ${col.border}`,
          }}>{short}</span>
          {player.age > 0 && (
            <span style={{ fontSize: 11, color: '#64748b' }}>{player.age} anos</span>
          )}
          {player.number && (
            <span style={{ fontSize: 11, color: '#475569' }}>#{player.number}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Player pin on pitch ──────────────────────────────────────────────────────

function PlayerPin({ player, onHover, yOffset = 0 }: { player: AFPlayer; onHover: (p: AFPlayer | null) => void; yOffset?: number }) {
  const [hovered, setHovered] = useState(false);
  const col   = POS_COLORS[player.position] ?? POS_COLORS.Midfielder;
  const short = POS_SHORT[player.position] ?? '??';

  const handleEnter = () => { setHovered(true); onHover(player); };
  const handleLeave = () => { setHovered(false); onHover(null); };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, position: 'relative', cursor: 'default', width: 64, transform: yOffset ? `translateY(${yOffset}px)` : undefined }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {hovered && <PlayerTooltip player={player} />}

      {/* Portrait card */}
      <div style={{
        width: 54, height: 66,
        borderRadius: 9,
        overflow: 'hidden',
        position: 'relative',
        background: '#1a2e1a',
        boxShadow: hovered
          ? `0 8px 24px rgba(0,0,0,0.8), 0 0 0 2px ${col.text}`
          : `0 3px 12px rgba(0,0,0,0.65), 0 0 0 1.5px ${col.border}`,
        transform: hovered ? 'scale(1.1) translateY(-3px)' : 'scale(1)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        flexShrink: 0,
      }}>
        {player.photo ? (
          <img src={player.photo} alt={player.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#1e3a1e' }} />
        )}

        {/* Bottom gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />

        {/* Position badge bottom-left */}
        <span style={{
          position: 'absolute', bottom: 3, left: 3,
          fontSize: 7.5, fontWeight: 900, padding: '1px 3px',
          borderRadius: 3,
          background: 'rgba(0,0,0,0.65)',
          color: col.text,
          lineHeight: 1.5,
          letterSpacing: '0.03em',
        }}>
          {short}
        </span>
      </div>

      {/* Name */}
      <span style={{
        fontSize: 9.5, fontWeight: 800,
        color: hovered ? '#ffffff' : '#e2e8f0',
        textAlign: 'center', lineHeight: 1.1,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        width: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textShadow: '0 1px 5px rgba(0,0,0,1)',
        transition: 'color 0.15s',
      }}>
        {pinName(player.name)}
      </span>
    </div>
  );
}


// ── Formation pitch ──────────────────────────────────────────────────────────

// Gaps (px) between display rows top→bottom, by total row count
// Intra-zone (same tactical unit) = small; Inter-zone (attack/mid/def boundary) = larger
function pitchPadding(total: number): string {
  return total >= 6 ? '36px 4px 32px' : '52px 4px 48px';
}

function FormationPitch({ squad }: { squad: AFPlayer[] }) {
  const [_hoveredPlayer, setHoveredPlayer] = useState<AFPlayer | null>(null);
  const { rows, formation, gaps } = inferLineup(squad);
  const reversed = [...rows].reverse(); // FW → (MF split) → DEF → GK (top to bottom)

  return (
    /* Outer wrapper: overflow visible so tooltips are not clipped */
    <div style={{ position: 'relative', borderRadius: 14 }}>

      {/* Background layer — clipped to border-radius */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 14, overflow: 'hidden',
        background: 'repeating-linear-gradient(180deg,#155228 0px,#1a6330 50px,#1a6330 50px,#155228 100px)',
        boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)',
        zIndex: 0,
        pointerEvents: 'none',
      }}>
        {/* Pitch markings SVG — lines only (no circle here to avoid oval distortion) */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 500 700" preserveAspectRatio="none">
          {/* Outer border */}
          <rect x={12} y={8} width={476} height={684} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={1.5} rx={3} />
          {/* Halfway line */}
          <line x1={12} y1={350} x2={488} y2={350} stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
          {/* Top penalty box */}
          <rect x={130} y={8} width={240} height={90} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
          {/* Bottom penalty box */}
          <rect x={130} y={602} width={240} height={90} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
          {/* Top goal box */}
          <rect x={200} y={8} width={100} height={30} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          {/* Bottom goal box */}
          <rect x={200} y={662} width={100} height={30} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        </svg>

        {/* Center circle — CSS div so it stays round regardless of container aspect ratio */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 90, height: 90,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }} />
        {/* Center dot */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 6, height: 6,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Content layer — not clipped, tooltips escape freely */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Player rows */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 0, padding: pitchPadding(reversed.length),
        }}>
          {reversed.map((row, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: row.length === 1 ? 'center' : row.length === 2 ? 'space-between' : 'space-evenly',
              // 2-player rows (CMs + wingers): ~18% padding so they land between defenders
              paddingLeft:  row.length === 2 ? '18%' : 0,
              paddingRight: row.length === 2 ? '18%' : 0,
              alignItems: 'flex-end',
              paddingBottom: i < reversed.length - 1 ? (gaps[i] ?? 48) : 0,
            }}>
              {row.map((p, pi) => {
                // Outer full-backs (first and last in 4-player DEF row) raised slightly
                const yOffset = row.length === 4 && (pi === 0 || pi === row.length - 1) ? -13 : 0;
                return <PlayerPin key={p.id} player={p} onHover={setHoveredPlayer} yOffset={yOffset} />;
              })}
            </div>
          ))}
        </div>

        {/* Formation label */}
        <div style={{
          position: 'absolute', bottom: 10, left: 14,
          fontSize: 10, fontWeight: 800,
          color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em',
          pointerEvents: 'none',
        }}>
          {formation}
        </div>
      </div>
    </div>
  );
}

// ── Player card (list) ───────────────────────────────────────────────────────

function PlayerCard({ player }: { player: AFPlayer }) {
  const col   = POS_COLORS[player.position] ?? POS_COLORS.Midfielder;
  const short = POS_SHORT[player.position] ?? '??';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '9px 12px', borderRadius: 10,
      background: 'rgba(15,23,42,0.6)',
      border: '1px solid rgba(30,41,59,0.7)',
      transition: 'background 0.15s',
      cursor: 'default',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.8)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.6)')}
    >
      {/* Photo */}
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: '#1e293b', overflow: 'hidden',
        border: `1.5px solid ${col.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        {player.photo && (
          <img src={player.photo} alt={player.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>

      {/* Number badge */}
      <span style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: col.bg, color: col.text, border: `1px solid ${col.border}`,
        fontSize: 11, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {player.number ?? '–'}
      </span>

      {/* Name + age */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {player.name}
        </div>
        {player.age > 0 && (
          <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
            {player.age} anos
          </div>
        )}
      </div>

      {/* Position badge */}
      <span style={{
        padding: '3px 8px', borderRadius: 6, flexShrink: 0,
        fontSize: 10, fontWeight: 800,
        background: col.bg, color: col.text, border: `1px solid ${col.border}`,
      }}>
        {short}
      </span>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.2s',
        background: active ? '#1e293b' : 'transparent',
        color: active ? '#f1f5f9' : '#475569',
        border: active ? '1px solid #334155' : '1px solid transparent',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

type ModalTab = 'lineup' | 'squad';

interface Props {
  team: string | null;
  onClose: () => void;
}

export function TeamModal({ team, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ModalTab>('lineup');
  const enabled = team !== null;
  const STALE = 60 * 60 * 1000;

  const { data: squad = [], isLoading: loadingSquad } = useQuery({
    queryKey: ['af_squad', team],
    queryFn: () => fetchSquad(team!),
    enabled, staleTime: STALE,
  });

  const { data: coach, isLoading: loadingCoach } = useQuery({
    queryKey: ['af_coach', team],
    queryFn: () => fetchCoach(team!),
    enabled, staleTime: STALE,
  });

  useEffect(() => {
    if (!team) return;
    setActiveTab('lineup');
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [team, onClose]);

  if (!team) return null;

  const loading     = loadingSquad || loadingCoach;
  const displayName = teamPT(team).toUpperCase();

  const grouped = POS_ORDER.reduce<Record<string, AFPlayer[]>>((acc, pos) => {
    acc[pos] = squad.filter(p => p.position === pos).sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-xl max-h-[96vh] sm:max-h-[90vh] flex flex-col sm:rounded-2xl overflow-hidden"
        style={{ background: '#0d1117', border: '1px solid rgba(30,41,59,0.9)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '18px 20px 14px',
          borderBottom: '1px solid rgba(30,41,59,0.8)',
          background: 'linear-gradient(180deg, rgba(30,41,59,0.4) 0%, transparent 100%)',
          flexShrink: 0,
        }}>
          {/* Big flag */}
          <div style={{
            width: 72, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <Flag team={team} className="w-full h-full" style={{ objectFit: 'cover' } as React.CSSProperties} />
          </div>

          {/* Name + coach */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
              {displayName}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, minHeight: 18 }}>
              {loadingCoach ? (
                <div style={{ width: 100, height: 12, background: '#1e293b', borderRadius: 4 }} />
              ) : coach ? (
                <>
                  {coach.photo && (
                    <img src={coach.photo} alt={coach.name}
                      style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1px solid #334155' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <User size={12} style={{ color: '#64748b', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{coach.name}</span>
                  {coach.nationality && (
                    <span style={{ fontSize: 11, color: '#374151' }}>· {coach.nationality}</span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 11, color: '#374151' }}>Técnico não disponível</span>
              )}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: '#1e293b', border: '1px solid #334155',
              color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Tabs ── */}
        {!loading && squad.length > 0 && (
          <div style={{
            display: 'flex', gap: 4, padding: '8px 16px',
            borderBottom: '1px solid rgba(30,41,59,0.5)',
            flexShrink: 0,
            background: '#0d1117',
          }}>
            <TabBtn active={activeTab === 'lineup'} onClick={() => setActiveTab('lineup')}>
              Escalação
            </TabBtn>
            <TabBtn active={activeTab === 'squad'} onClick={() => setActiveTab('squad')}>
              Elenco ({squad.length})
            </TabBtn>
          </div>
        )}

        {/* ── Body (scrollable) ── */}
        <div style={{
          overflowY: 'auto', flex: 1,
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 16,
          background: '#0d1117',
        }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
              <div className="w-5 h-5 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
              <span style={{ color: '#64748b', fontSize: 13 }}>Carregando dados da seleção...</span>
            </div>
          )}

          {!loading && squad.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#374151', fontSize: 13 }}>
              Elenco não disponível na API.
            </div>
          )}

          {!loading && squad.length > 0 && (
            <>
              {activeTab === 'lineup' && (
                <FormationPitch squad={squad} />
              )}

              {activeTab === 'squad' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {POS_ORDER.map(pos => {
                    const players = grouped[pos];
                    if (!players?.length) return null;
                    const col = POS_COLORS[pos];
                    return (
                      <div key={pos}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                          paddingBottom: 8, borderBottom: '1px solid rgba(30,41,59,0.6)',
                        }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                            background: col.bg, color: col.text, border: `1px solid ${col.border}`,
                          }}>
                            {POS_SHORT[pos]}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>{POS_LABEL[pos]}</span>
                          <span style={{ fontSize: 11, color: '#374151', marginLeft: 'auto' }}>{players.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {players.map(p => <PlayerCard key={p.id} player={p} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
