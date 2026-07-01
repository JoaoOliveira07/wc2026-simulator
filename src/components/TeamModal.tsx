import { useEffect, useState } from 'react';
import { X, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Flag } from './Flag';
import { fetchSquad, fetchCoach } from '../data/apiFootball';
import type { AFPlayer } from '../data/apiFootball';
import { teamPT } from '../data/teamNames';
import { FormationEditor } from './FormationEditor';

// ── Position helpers (used by squad list) ────────────────────────────────────

const POS_SHORT: Record<string, string> = {
  Goalkeeper: 'GK', Defender: 'DF', Midfielder: 'MF', Attacker: 'FW',
};
const POS_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
const POS_LABEL: Record<string, string> = {
  Goalkeeper: 'Goleiros', Defender: 'Defensores', Midfielder: 'Meias', Attacker: 'Atacantes',
};
const POS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Goalkeeper: { bg: 'rgba(234,179,8,0.18)',  text: '#fbbf24', border: 'rgba(234,179,8,0.35)'  },
  Defender:   { bg: 'rgba(59,130,246,0.18)', text: '#60a5fa', border: 'rgba(59,130,246,0.35)' },
  Midfielder: { bg: 'rgba(34,197,94,0.18)',  text: '#4ade80', border: 'rgba(34,197,94,0.35)'  },
  Attacker:   { bg: 'rgba(239,68,68,0.18)',  text: '#f87171', border: 'rgba(239,68,68,0.35)'  },
};

// ── Player card (squad list) ─────────────────────────────────────────────────

function PlayerCard({ player }: { player: AFPlayer }) {
  const col   = POS_COLORS[player.position] ?? POS_COLORS.Midfielder;
  const short = POS_SHORT[player.position] ?? '??';

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 12px', borderRadius: 10,
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid rgba(30,41,59,0.7)',
        transition: 'background 0.15s', cursor: 'default',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.8)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.6)')}
    >
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: '#1e293b', overflow: 'hidden',
        border: `1.5px solid ${col.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        {player.photo && (
          <img src={player.photo} alt={player.name} referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>

      <span style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: col.bg, color: col.text, border: `1px solid ${col.border}`,
        fontSize: 11, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {player.number ?? '–'}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {player.name}
        </div>
        {player.age > 0 && (
          <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{player.age} anos</div>
        )}
      </div>

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
          <div style={{
            width: 72, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <Flag team={team} className="w-full h-full" style={{ objectFit: 'cover' } as React.CSSProperties} />
          </div>

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
                    <img src={coach.photo} alt={coach.name} referrerPolicy="no-referrer"
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
            flexShrink: 0, background: '#0d1117',
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
                <FormationEditor team={team} squad={squad} />
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
