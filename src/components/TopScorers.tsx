import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { fetchTopScorers } from '../data/apiFootball';
import type { AFTopScorer } from '../data/apiFootballTypes';
import type { TopScorersResult } from '../data/apiFootball';
import { Flag } from './Flag';

const MEDAL = ['🥇', '🥈', '🥉'];

function ScorerRow({ scorer, rank }: { scorer: AFTopScorer; rank: number }) {
  const stat  = scorer.statistics[0];
  const goals   = stat?.goals?.total   ?? 0;
  const assists = stat?.goals?.assists ?? 0;
  const team    = stat?.team?.name     ?? '';
  const isTop3  = rank <= 3;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 12,
      background: isTop3 ? 'rgba(245,158,11,0.06)' : 'rgba(15,23,42,0.7)',
      border: `1px solid ${isTop3 ? 'rgba(245,158,11,0.18)' : 'rgba(30,41,59,0.8)'}`,
      animation: 'rankingSlide 0.4s ease both',
      animationDelay: `${rank * 0.045}s`,
      opacity: 0,
      animationFillMode: 'both',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = isTop3 ? 'rgba(245,158,11,0.10)' : 'rgba(30,41,59,0.7)')}
      onMouseLeave={e => (e.currentTarget.style.background = isTop3 ? 'rgba(245,158,11,0.06)' : 'rgba(15,23,42,0.7)')}
    >
      {/* Rank */}
      <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>
        {isTop3 ? (
          <span style={{ fontSize: 20, lineHeight: 1 }}>{MEDAL[rank - 1]}</span>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>{rank}</span>
        )}
      </div>

      {/* Photo */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
        background: '#1e293b', flexShrink: 0,
        border: isTop3 ? '1.5px solid rgba(245,158,11,0.4)' : '1.5px solid rgba(30,41,59,0.9)',
        boxShadow: isTop3 ? '0 0 10px rgba(245,158,11,0.15)' : 'none',
      }}>
        {scorer.player.photo && (
          <img
            src={scorer.player.photo}
            alt={scorer.player.name}
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>

      {/* Name + info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#f1f5f9',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {scorer.player.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <Flag team={scorer.player.nationality} className="w-4 h-3" />
          <span style={{ fontSize: 11, color: '#475569' }}>{scorer.player.nationality}</span>
          {team && <>
            <span style={{ fontSize: 10, color: '#1e293b' }}>·</span>
            <span style={{ fontSize: 11, color: '#334155' }}>{team}</span>
          </>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '4px 10px', borderRadius: 8, minWidth: 44,
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.22)',
        }}>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#4ade80', lineHeight: 1 }}>
            {goals}
          </span>
          <span style={{ fontSize: 7.5, fontWeight: 800, color: '#16a34a', marginTop: 2, letterSpacing: '0.06em' }}>
            GOLS
          </span>
        </div>
        {assists > 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '4px 10px', borderRadius: 8, minWidth: 40,
            background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.20)',
          }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>
              {assists}
            </span>
            <span style={{ fontSize: 7.5, fontWeight: 800, color: '#2563eb', marginTop: 2, letterSpacing: '0.06em' }}>
              ASS
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonRow({ delay }: { delay: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 12,
      background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(30,41,59,0.8)',
      animationDelay: `${delay}s`,
    }}>
      <div className="skeleton" style={{ width: 30, height: 20, flexShrink: 0 }} />
      <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ height: 14, width: '55%' }} />
        <div className="skeleton" style={{ height: 11, width: '35%' }} />
      </div>
      <div className="skeleton" style={{ width: 48, height: 44, borderRadius: 8 }} />
    </div>
  );
}

export function TopScorers() {
  const { data, isLoading, error, refetch } = useQuery<TopScorersResult>({
    queryKey: ['topscorers'],
    queryFn: fetchTopScorers,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const scorers = data?.scorers ?? [];
  const season  = data?.season ?? 2026;
  const isHistorical = season !== 2026;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 4px', animation: 'fadeSlideUp 0.25s ease both' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg,#f59e0b,#b45309)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px rgba(245,158,11,0.25)',
        }}>
          <Trophy size={22} color="white" />
        </div>
        <div>
          <h2 style={{
            margin: 0, fontSize: 22, fontWeight: 900,
            letterSpacing: '-0.02em', lineHeight: 1,
            background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            ARTILHEIROS
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
              Copa do Mundo {season}
            </span>
            {isHistorical && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                padding: '2px 6px', borderRadius: 4,
                background: 'rgba(100,116,139,0.18)', color: '#64748b',
                border: '1px solid rgba(100,116,139,0.25)',
              }}>
                HISTÓRICO
              </span>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonRow key={i} delay={i * 0.04} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
          <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>
            Dados de artilharia não disponíveis no momento.
          </p>
          <br />
          <button
            onClick={() => {
              localStorage.removeItem('af:topscorers:2026');
              localStorage.removeItem('af:topscorers:2022');
              refetch();
            }}
            style={{
              marginTop: 16, padding: '8px 20px', borderRadius: 8,
              background: '#1e293b', border: '1px solid #334155',
              color: '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!error && scorers.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
          <p style={{ color: '#475569', fontSize: 14 }}>
            Ainda não há dados de artilharia disponíveis.
          </p>
        </div>
      )}

      {scorers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {scorers.slice(0, 20).map((scorer, i) => (
            <ScorerRow key={scorer.player.id} scorer={scorer} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
