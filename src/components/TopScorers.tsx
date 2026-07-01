import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { fetchTopScorers } from '../data/apiFootball';
import type { OFScorer } from '../data/openFootball';

const MEDAL = ['🥇', '🥈', '🥉'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ScorerRow({ scorer, rank }: { scorer: OFScorer; rank: number }) {
  const isTop3 = rank <= 3;
  return (
    <div
      style={{
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
        {isTop3
          ? <span style={{ fontSize: 20, lineHeight: 1 }}>{MEDAL[rank - 1]}</span>
          : <span style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>{rank}</span>
        }
      </div>

      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: isTop3 ? 'linear-gradient(135deg,#f59e0b,#b45309)' : '#1e293b',
        border: isTop3 ? '1.5px solid rgba(245,158,11,0.4)' : '1.5px solid rgba(30,41,59,0.9)',
        boxShadow: isTop3 ? '0 0 10px rgba(245,158,11,0.15)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800,
        color: isTop3 ? 'white' : '#475569',
      }}>
        {initials(scorer.name)}
      </div>

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#f1f5f9',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {scorer.name}
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
          Copa do Mundo 2026
        </div>
      </div>

      {/* Goals */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '4px 12px', borderRadius: 8, minWidth: 48,
        background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.22)',
      }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#4ade80', lineHeight: 1 }}>
          {scorer.goals}
        </span>
        <span style={{ fontSize: 7.5, fontWeight: 800, color: '#16a34a', marginTop: 2, letterSpacing: '0.06em' }}>
          GOLS
        </span>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 12,
      background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(30,41,59,0.8)',
    }}>
      <div className="skeleton" style={{ width: 30, height: 20, flexShrink: 0 }} />
      <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ height: 14, width: '50%' }} />
        <div className="skeleton" style={{ height: 11, width: '30%' }} />
      </div>
      <div className="skeleton" style={{ width: 48, height: 44, borderRadius: 8 }} />
    </div>
  );
}

export function TopScorers() {
  const { data = [], isLoading, error, refetch } = useQuery<OFScorer[]>({
    queryKey: ['topscorers'],
    queryFn: fetchTopScorers,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

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
          <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginTop: 3 }}>
            Copa do Mundo 2026
          </div>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
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
            onClick={() => { localStorage.removeItem('of:topscorers:2026'); refetch(); }}
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

      {!error && data.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
          <p style={{ color: '#475569', fontSize: 14 }}>
            Nenhum gol marcado ainda.
          </p>
          <p style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>
            Os dados serão atualizados conforme os jogos acontecem.
          </p>
        </div>
      )}

      {data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {data.slice(0, 20).map((scorer, i) => (
            <ScorerRow key={scorer.name} scorer={scorer} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
