import { useMemo } from 'react';
import { Flag } from './Flag';
import { teamPT } from '../data/teamNames';
import type { Match } from '../types';
import type { ESPNMatch } from '../data/espnApi';
import { teamsMatch } from '../data/espnApi';
import { resolveRef } from '../store/knockout';
import cazeTvLogo from '../assets/cazetv.png';

const KO_ROUND_PT: Record<string, string> = {
  'Round of 32': 'Fase 16',
  'Round of 16': 'Oitavas de Final',
  'Quarter-finals': 'Quartas de Final',
  'Semi-finals': 'Semifinais',
  'Third place play-off': '3° Lugar',
  'Final': 'Final',
};

function roundLabel(round: string): string {
  if (KO_ROUND_PT[round]) return KO_ROUND_PT[round];
  const md = round.match(/^Matchday\s+(\d+)$/i);
  if (md) return `Fase de Grupos · Rodada ${md[1]}`;
  return round;
}

const CAZETV_URL = 'https://www.youtube.com/@CazeTV/streams';

const WEEKDAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


function parseKickoff(dateStr: string, timeStr: string): Date | null {
  if (!timeStr) return null;
  const m = timeStr.match(/(\d+):(\d+)\s+UTC([+-]\d?\d?)/);
  if (!m) return null;
  const [, hh, mm, off] = m;
  const offsetH = parseInt(off, 10);
  const sign = offsetH >= 0 ? '+' : '-';
  const absH = String(Math.abs(offsetH)).padStart(2, '0');
  const iso = `${dateStr}T${hh.padStart(2, '0')}:${mm}:00${sign}${absH}:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function findESPNMatch(m: Match, espnAll: ESPNMatch[]): ESPNMatch | null {
  if (!espnAll.length) return null;
  return espnAll.find(e =>
    (teamsMatch(e.home.name, m.team1) && teamsMatch(e.away.name, m.team2)) ||
    (teamsMatch(e.home.name, m.team2) && teamsMatch(e.away.name, m.team1))
  ) ?? null;
}

type MatchStatus = 'live' | 'upcoming' | 'finished';

function getStatus(m: Match, espn: ESPNMatch | null): MatchStatus {
  if (espn?.status === 'live' || espn?.status === 'halftime') return 'live';
  if (m.score?.ft || espn?.status === 'final') return 'finished';
  return 'upcoming';
}

// ── Date column ───────────────────────────────────────────────────────────────
function DateCol({ kicked, status, today }: { kicked: Date | null; status: MatchStatus; today?: boolean }) {
  const isLive = status === 'live';
  const isDone = status === 'finished';

  if (isLive) {
    return (
      <div style={{ width: 46, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'livePulse 1.4s ease-in-out infinite' }} />
      </div>
    );
  }

  if (!kicked) {
    return <div style={{ width: 46, flexShrink: 0, textAlign: 'center', fontSize: 10, color: '#1e293b' }}>—</div>;
  }

  const day   = WEEKDAY[kicked.getDay()];
  const date  = kicked.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const time  = kicked.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (today && status === 'upcoming') {
    return (
      <div style={{ width: 46, flexShrink: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 8, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.08em' }}>HOJE</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24' }}>{time}</div>
      </div>
    );
  }

  return (
    <div style={{ width: 46, flexShrink: 0, textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: isDone ? '#334155' : '#94a3b8', letterSpacing: '0.04em' }}>
        {day} {date}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: isDone ? '#334155' : '#64748b' }}>
        {time}
      </div>
    </div>
  );
}

// ── Score area ────────────────────────────────────────────────────────────────
function ScoreCol({ m, espn, status }: { m: Match; espn: ESPNMatch | null; status: MatchStatus }) {
  if (status === 'live' && espn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {espn.home.score ?? '–'} : {espn.away.score ?? '–'}
        </span>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', letterSpacing: '0.06em' }}>
          {espn.status === 'halftime' ? 'INT' : espn.shortDetail}
        </span>
      </div>
    );
  }

  if (status === 'finished') {
    const ft = m.score?.ft;
    const espnFt = espn && espn.status === 'final'
      ? [Number(espn.home.score) || 0, Number(espn.away.score) || 0] as [number, number]
      : null;
    const score = ft ?? espnFt;
    if (score) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#64748b', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {score[0]} : {score[1]}
          </span>
          {m.score?.p && (
            <span style={{ fontSize: 8, color: '#334155', fontWeight: 600 }}>
              ({m.score.p[0]}:{m.score.p[1]} pen)
            </span>
          )}
        </div>
      );
    }
  }

  return <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>×</span>;
}

// ── Single match row ──────────────────────────────────────────────────────────
function MatchRow({ m, espn, status, kicked, resolvedTeam1, resolvedTeam2, today }: {
  m: Match; espn: ESPNMatch | null; status: MatchStatus; kicked: Date | null;
  resolvedTeam1?: string | null; resolvedTeam2?: string | null; today?: boolean;
}) {
  const isLive = status === 'live';
  const isUpcoming = status === 'upcoming';
  const isDone = status === 'finished';
  const nameColor = isDone ? '#475569' : '#e2e8f0';

  const displayTeam1 = resolvedTeam1 ?? m.team1;
  const displayTeam2 = resolvedTeam2 ?? m.team2;

  const hasResolvedTeams = !!displayTeam1 && !!displayTeam2
    && !displayTeam1.startsWith('W') && !displayTeam1.startsWith('L')
    && !displayTeam2.startsWith('W') && !displayTeam2.startsWith('L');
  const showCazetv = (isLive || isUpcoming) && hasResolvedTeams;

  const rowBg = isLive
    ? 'rgba(239,68,68,0.05)'
    : today
    ? 'rgba(245,158,11,0.05)'
    : 'transparent';

  const row = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
      borderBottom: '1px solid rgba(30,41,59,0.35)',
      background: rowBg,
      cursor: (isLive || isUpcoming) ? 'pointer' : 'default',
      textDecoration: 'none',
    }}>
      <DateCol kicked={kicked} status={status} today={today} />

      {/* Team 1 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', minWidth: 0 }}>
        <span className="truncate" style={{ fontSize: 12, fontWeight: 700, color: displayTeam1 && !displayTeam1.startsWith('W') && !displayTeam1.startsWith('L') ? nameColor : '#1e293b', textAlign: 'right' }}>
          {displayTeam1 && !displayTeam1.startsWith('W') && !displayTeam1.startsWith('L') ? teamPT(displayTeam1) : displayTeam1 ?? '—'}
        </span>
        {displayTeam1 && !displayTeam1.startsWith('W') && !displayTeam1.startsWith('L')
          ? <Flag team={displayTeam1} className="w-7 h-5 rounded-sm shrink-0" style={isDone ? { opacity: 0.5 } : undefined} />
          : <span className="w-7 h-5 rounded-sm shrink-0 inline-block" style={{ background: 'rgba(15,23,42,0.7)' }} />
        }
      </div>

      {/* Score */}
      <div style={{ width: 72, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <ScoreCol m={m} espn={espn} status={status} />
      </div>

      {/* Team 2 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {displayTeam2 && !displayTeam2.startsWith('W') && !displayTeam2.startsWith('L')
          ? <Flag team={displayTeam2} className="w-7 h-5 rounded-sm shrink-0" style={isDone ? { opacity: 0.5 } : undefined} />
          : <span className="w-7 h-5 rounded-sm shrink-0 inline-block" style={{ background: 'rgba(15,23,42,0.7)' }} />
        }
        <span className="truncate" style={{ fontSize: 12, fontWeight: 700, color: displayTeam2 && !displayTeam2.startsWith('W') && !displayTeam2.startsWith('L') ? nameColor : '#1e293b' }}>
          {displayTeam2 && !displayTeam2.startsWith('W') && !displayTeam2.startsWith('L') ? teamPT(displayTeam2) : displayTeam2 ?? '—'}
        </span>
      </div>

      {/* CazeTV badge for live & upcoming with resolved teams */}
      {showCazetv ? (
        <div style={{
          flexShrink: 0, borderRadius: 6, overflow: 'hidden',
          background: '#fff',
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '3px 6px',
          display: 'flex', alignItems: 'center',
        }}>
          <img src={cazeTvLogo} alt="CazeTV" style={{ height: 14, width: 'auto', display: 'block' }} />
        </div>
      ) : (
        <div style={{ width: 44, flexShrink: 0 }} />
      )}
    </div>
  );

  return (isLive || showCazetv)
    ? <a href={CAZETV_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>{row}</a>
    : row;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px',
      borderLeft: `3px solid ${color}`,
      background: `${color}0d`,
      borderRadius: '0 8px 8px 0',
    }}>
      <span style={{ fontSize: 11, fontWeight: 900, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 800, color,
        background: `${color}20`, border: `1px solid ${color}40`,
        borderRadius: 5, padding: '2px 6px',
      }}>
        {count}
      </span>
    </div>
  );
}

// ── Round sub-header ──────────────────────────────────────────────────────────
function RoundSubHeader({ round }: { round: string }) {
  return (
    <div style={{
      padding: '4px 14px', fontSize: 9, fontWeight: 800,
      color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase',
      borderBottom: '1px solid rgba(30,41,59,0.4)',
      background: 'rgba(15,23,42,0.6)',
    }}>
      {roundLabel(round)}
    </div>
  );
}

// ── Today sub-header ──────────────────────────────────────────────────────────
function TodaySubHeader({ round }: { round: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 14px',
      borderBottom: '1px solid rgba(245,158,11,0.15)',
      background: 'rgba(245,158,11,0.07)',
    }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
      <span style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Hoje · {roundLabel(round)}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  matches: Match[];
  liveMatches: ESPNMatch[];
}

interface EnrichedMatch {
  m: Match;
  espn: ESPNMatch | null;
  status: MatchStatus;
  kicked: Date | null;
}

export function MatchesTab({ matches, liveMatches }: Props) {
  const koByNum = useMemo(() => {
    const map: Record<number, Match> = {};
    for (const m of matches) if (!m.group && m.num) map[m.num] = m;
    return map;
  }, [matches]);

  function resolveTeam(ref: string): string | null {
    return resolveRef(ref, koByNum, {}, liveMatches);
  }

  // Enrich each match
  const enriched: EnrichedMatch[] = matches.map(m => {
    const espn   = findESPNMatch(m, liveMatches);
    const status = getStatus(m, espn);
    const kicked = parseKickoff(m.date, m.time);
    return { m, espn, status, kicked };
  });

  // Split by status
  const live     = enriched.filter(e => e.status === 'live');
  const upcoming = enriched
    .filter(e => e.status === 'upcoming')
    .sort((a, b) => (a.kicked?.getTime() ?? 0) - (b.kicked?.getTime() ?? 0));
  const finished = enriched
    .filter(e => e.status === 'finished')
    .sort((a, b) => (b.kicked?.getTime() ?? 0) - (a.kicked?.getTime() ?? 0));

  // Group by round within a section (preserves round labels)
  function groupByRound(items: EnrichedMatch[]): { round: string; items: EnrichedMatch[] }[] {
    const out: { round: string; items: EnrichedMatch[] }[] = [];
    for (const e of items) {
      const last = out[out.length - 1];
      if (last && last.round === e.m.round) {
        last.items.push(e);
      } else {
        out.push({ round: e.m.round, items: [e] });
      }
    }
    return out;
  }

  const today          = todayStr();
  const todayUpcoming  = upcoming.filter(e => e.m.date === today);
  const laterUpcoming  = upcoming.filter(e => e.m.date !== today);
  const todayGroups    = groupByRound(todayUpcoming);
  const laterGroups    = groupByRound(laterUpcoming);
  const finishedGroups = groupByRound(finished);

  const key = (e: EnrichedMatch, i: number) => `${e.m.team1}|${e.m.team2}|${e.m.date}|${i}`;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* AO VIVO */}
      {live.length > 0 && (
        <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(239,68,68,0.2)' }}>
          <SectionHeader label="Ao Vivo" color="#ef4444" count={live.length} />
          {live.map((e, i) => (
            <MatchRow key={key(e, i)} m={e.m} espn={e.espn} status={e.status} kicked={e.kicked}
              resolvedTeam1={resolveTeam(e.m.team1)} resolvedTeam2={resolveTeam(e.m.team2)} />
          ))}
        </div>
      )}

      {/* PRÓXIMOS */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(30,41,59,0.5)' }}>
          <SectionHeader label="Próximos" color="#3b82f6" count={upcoming.length} />
          {/* Today's upcoming matches — highlighted */}
          {todayGroups.map(({ round, items }) => (
            <div key={`today-${round}`}>
              <TodaySubHeader round={round} />
              {items.map((e, i) => (
                <MatchRow key={key(e, i)} m={e.m} espn={e.espn} status={e.status} kicked={e.kicked}
                  resolvedTeam1={resolveTeam(e.m.team1)} resolvedTeam2={resolveTeam(e.m.team2)} today />
              ))}
            </div>
          ))}
          {/* Future matches */}
          {laterGroups.map(({ round, items }) => (
            <div key={round}>
              <RoundSubHeader round={round} />
              {items.map((e, i) => (
                <MatchRow key={key(e, i)} m={e.m} espn={e.espn} status={e.status} kicked={e.kicked}
                  resolvedTeam1={resolveTeam(e.m.team1)} resolvedTeam2={resolveTeam(e.m.team2)} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ENCERRADOS */}
      {finished.length > 0 && (
        <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(30,41,59,0.4)' }}>
          <SectionHeader label="Encerrados" color="#475569" count={finished.length} />
          {finishedGroups.map(({ round, items }) => (
            <div key={round}>
              <RoundSubHeader round={round} />
              {items.map((e, i) => (
                <MatchRow key={key(e, i)} m={e.m} espn={e.espn} status={e.status} kicked={e.kicked}
                  resolvedTeam1={resolveTeam(e.m.team1)} resolvedTeam2={resolveTeam(e.m.team2)} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
