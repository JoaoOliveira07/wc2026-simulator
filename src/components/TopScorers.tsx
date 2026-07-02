import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { fetchTopScorers } from '../data/apiFootball';
import type { OFScorer } from '../data/openFootball';
import { Flag } from './Flag';
import { teamPT } from '../data/teamNames';
import { proxyPhoto } from '../data/mediaProxy';

const MEDAL_COLORS = ['#f59e0b', '#94a3b8', '#cd7c3a'];

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[áàâãä]/g, 'a').replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i').replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u').replace(/ç/g, 'c').replace(/ñ/g, 'n')
    .replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[å]/g, 'a')
    .replace(/[œ]/g, 'oe').replace(/[ý]/g, 'y');
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface PlayerInfo { photo: string }

function ScorerRow({
  scorer, rank, getInfo,
}: {
  scorer: OFScorer;
  rank: number;
  getInfo: (name: string) => PlayerInfo | null;
}) {
  const isTop3 = rank <= 3;
  const info = getInfo(scorer.name);

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
        {isTop3 ? (
          <div style={{
            width: 26, height: 26, borderRadius: '50%', margin: '0 auto',
            background: MEDAL_COLORS[rank - 1],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 900, color: 'white',
            boxShadow: `0 0 8px ${MEDAL_COLORS[rank - 1]}66`,
          }}>
            {rank}
          </div>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>{rank}</span>
        )}
      </div>

      {/* Avatar / Photo */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: isTop3 ? 'linear-gradient(135deg,#f59e0b,#b45309)' : '#1e293b',
        border: isTop3 ? '1.5px solid rgba(245,158,11,0.4)' : '1.5px solid rgba(30,41,59,0.9)',
        boxShadow: isTop3 ? '0 0 10px rgba(245,158,11,0.15)' : 'none',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800,
        color: isTop3 ? 'white' : '#475569',
        position: 'relative',
      }}>
        {info?.photo ? (
          <img
            src={info.photo}
            alt={scorer.name}
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.querySelector('.fallback-initials')?.setAttribute('style', 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;');
            }}
          />
        ) : null}
        <span
          className="fallback-initials"
          style={{ display: info?.photo ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        >
          {initials(scorer.name)}
        </span>
      </div>

      {/* Name + Team */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#f1f5f9',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {scorer.name}
        </div>
        {scorer.team && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <Flag team={scorer.team} className="w-5 h-3.5" />
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{teamPT(scorer.team)}</span>
          </div>
        )}
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
        <span style={{ fontSize: 8, fontWeight: 800, color: '#16a34a', marginTop: 2, letterSpacing: '0.06em' }}>
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
  const { data: scorers = [], isLoading, error, refetch } = useQuery<OFScorer[]>({
    queryKey: ['topscorers'],
    queryFn: fetchTopScorers,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: squads } = useQuery<Record<string, Array<{ name: string; photo: string }>>>({
    queryKey: ['squads_static'],
    queryFn: () => fetch('/data/squads.json').then(r => r.ok ? r.json() : {}),
    staleTime: Infinity,
  });

  // Build normalized name → photo map from all squads
  const photoMap = useMemo(() => {
    if (!squads) return {} as Record<string, string>;
    const map: Record<string, string> = {};
    for (const players of Object.values(squads)) {
      for (const p of players) {
        if (p.photo) map[normalize(p.name)] = proxyPhoto(p.photo);
      }
    }
    return map;
  }, [squads]);

  const getInfo = (name: string): PlayerInfo | null => {
    const norm = normalize(name);
    if (photoMap[norm]) return { photo: photoMap[norm] };
    // Fallback: match on last name (only if > 3 chars to avoid false positives)
    const last = norm.split(' ').at(-1) ?? '';
    if (last.length > 3) {
      for (const [key, photo] of Object.entries(photoMap)) {
        if (key.endsWith(' ' + last) || key === last) return { photo };
      }
    }
    return null;
  };

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

      {!error && scorers.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
          <p style={{ color: '#475569', fontSize: 14 }}>Nenhum gol marcado ainda.</p>
        </div>
      )}

      {scorers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {scorers.slice(0, 20).map((scorer, i) => (
            <ScorerRow key={scorer.name} scorer={scorer} rank={i + 1} getInfo={getInfo} />
          ))}
        </div>
      )}
    </div>
  );
}
